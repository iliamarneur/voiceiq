import asyncio
import json
import logging
import os
import re
import time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Transcription, Analysis, Chapter, TranslationCache, ChatMessage
from app.services.profile_service import get_profile_analyses, get_analysis_prompt
from app.services.llm_backends import resolve_llm_backend, analyze_transcript_via_backend

logger = logging.getLogger(__name__)

# Configurable timeouts
LLM_TIMEOUT = int(os.environ.get("LLM_TIMEOUT_SECONDS", "300"))  # 5 min default
LLM_MAX_RETRIES = int(os.environ.get("LLM_MAX_RETRIES", "1"))

# ── LLM backend selection ──
# Use OpenAI if OPENAI_LLM_API_KEY is set, otherwise fallback to Ollama
_OPENAI_LLM_KEY = os.environ.get("OPENAI_LLM_API_KEY", "")
_USE_OPENAI = bool(_OPENAI_LLM_KEY)
_openai_client = None
_ollama = None

if _USE_OPENAI:
    logger.info("LLM backend: OpenAI API")
else:
    logger.info("LLM backend: Ollama (local)")
    try:
        import ollama as ollama_client
        _OLLAMA_HOST_ENV = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
        OLLAMA_HOST = _OLLAMA_HOST_ENV.replace("0.0.0.0", "127.0.0.1")
        if not OLLAMA_HOST.startswith("http"):
            OLLAMA_HOST = f"http://{OLLAMA_HOST}"
        _ollama = ollama_client.Client(host=OLLAMA_HOST)
    except ImportError:
        logger.warning("ollama package not installed and no OpenAI key — LLM calls will fail")


def _get_openai_client():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=_OPENAI_LLM_KEY)
    return _openai_client


def _get_openai_model() -> str:
    from app.services.llm_backends import get_openai_model
    return get_openai_model()

ANALYSIS_TYPES = [
    "summary", "keypoints", "actions", "flashcards",
    "quiz", "faq", "mindmap", "slides", "infographic", "tables"
]

# ── Transcript cleaning instruction (injected into all analysis prompts) ──
TRANSCRIPT_CLEANING_INSTRUCTION = (
    "IMPORTANT — Nettoyage chirurgical du texte brut : "
    "Avant toute analyse, nettoie mentalement la transcription. "
    "Supprime TOUS les begaiements (ex: 'I, I, I', 'the, the', 'je, je, je'), "
    "les hesitations ('euh', 'uh', 'um', 'hmm', 'hein', 'ben', 'bah'), "
    "les faux departs et repetitions inutiles, "
    "et les bruits parasites transcrits ('[rires]', '[toux]', '[bruit]', '...'). "
    "Le texte dans ton analyse doit etre fluide et agreable a lire, "
    "tout en restant fidele au sens et au ton original. "
    "Ne mentionne jamais ce nettoyage dans ta reponse.\n\n"
)

PROMPTS = {
    "summary": (
        "Tu es un analyste expert. Produis un resume structure et fidele de cette transcription.\n\n"
        "Regles :\n"
        "- Un titre court et descriptif qui capture le sujet principal\n"
        "- Une introduction de 2-3 phrases qui pose le contexte (qui parle, de quoi, dans quel cadre)\n"
        "- Les points principaux : chaque point doit etre une phrase complete et autonome, pas un mot-cle\n"
        "- Une conclusion qui synthetise la direction ou les prochaines etapes evoquees\n"
        "- Reste fidele au contenu : ne rajoute rien qui n'est pas dit dans la transcription\n"
        "- Adapte la langue du resume a la langue de la transcription\n\n"
        "Return valid JSON: {\"title\": \"...\", \"introduction\": \"...\", \"points\": [\"...\"], \"conclusion\": \"...\"}"
    ),
    "keypoints": (
        "Tu es un analyste expert. Extrais les points cles de cette transcription, organises par theme.\n\n"
        "Regles :\n"
        "- Regroupe les informations par theme logique (pas par ordre chronologique)\n"
        "- Chaque theme a un intitule court et clair\n"
        "- Chaque point sous un theme est une phrase complete et autonome\n"
        "- Classe chaque theme par importance : critical (decision majeure ou information capitale), "
        "high (point important), medium (information utile), low (detail secondaire)\n"
        "- Si un passage cle est cite mot pour mot, ajoute-le en verbatim_quote\n"
        "- Ne rajoute rien qui n'est pas dit. Reste factuel.\n"
        "- Adapte la langue a celle de la transcription\n\n"
        "Return valid JSON: {\"keypoints\": [{\"theme\": \"...\", \"importance\": \"high\", \"points\": [\"...\"], \"verbatim_quote\": \"...\"}]}"
    ),
    "actions": (
        "Tu es un assistant de reunion expert. Analyse cette transcription pour en extraire :\n\n"
        "1. ACTIONS : Chaque tache ou engagement mentionne, meme implicitement. "
        "Formule chaque action de maniere actionnable (verbe a l'infinitif + objet + contexte si pertinent). "
        "Exemples : 'Envoyer le rapport au client avant vendredi', 'Planifier une reunion de suivi avec l'equipe technique'.\n\n"
        "2. DECISIONS : Chaque choix ou conclusion acte pendant la discussion. "
        "Formule clairement ce qui a ete decide et par qui si mentionne.\n\n"
        "3. QUESTIONS OUVERTES : Les sujets restes en suspens, les interrogations non resolues, "
        "les points necessitant un suivi ou une clarification.\n\n"
        "Regles : Reste fidele au contenu. Ne rajoute pas d'actions inventees. "
        "Si aucune action/decision/question n'est identifiable, retourne une liste vide pour cette categorie.\n\n"
        "Return valid JSON: {\"actions\": [\"...\"], \"decisions\": [\"...\"], \"questions\": [\"...\"]}"
    ),
    "flashcards": (
        "Tu es un pedagogiste expert. Cree des fiches de revision (flashcards) a partir de cette transcription.\n\n"
        "Regles :\n"
        "- Chaque fiche a une question precise et une reponse concise mais complete\n"
        "- Les questions doivent tester la comprehension, pas la memorisation mot a mot\n"
        "- Couvre les concepts cles, les definitions, les faits importants et les relations de cause a effet\n"
        "- Varie les types de questions : 'Qu'est-ce que...', 'Pourquoi...', 'Quelle est la difference entre...', "
        "'Dans quel contexte...', 'Quel est l'impact de...'\n"
        "- Cree entre 8 et 15 fiches selon la richesse du contenu\n"
        "- Adapte la langue a celle de la transcription\n\n"
        "Return valid JSON: {\"cards\": [{\"question\": \"...\", \"answer\": \"...\"}]}"
    ),
    "quiz": (
        "Tu es un pedagogiste expert. Cree un quiz a choix multiples a partir de cette transcription.\n\n"
        "Regles :\n"
        "- 5 a 8 questions, de difficulte croissante\n"
        "- 4 choix par question, un seul correct. Les mauvaises reponses doivent etre plausibles, pas absurdes.\n"
        "- Chaque choix est une phrase complete (pas juste un mot ou une lettre)\n"
        "- L'explication justifie pourquoi la bonne reponse est correcte, en citant le contexte de la transcription\n"
        "- Couvre differents aspects du contenu, pas seulement les premiers paragraphes\n"
        "- answer est la lettre (A, B, C ou D) correspondant au bon choix\n"
        "- Adapte la langue a celle de la transcription\n\n"
        "Return valid JSON: {\"questions\": [{\"question\": \"...\", \"choices\": [\"Choix A complet\", \"Choix B complet\", \"Choix C complet\", \"Choix D complet\"], \"answer\": \"A\", \"explanation\": \"...\"}]}"
    ),
    "faq": (
        "Tu es un expert en communication. Genere une FAQ (Foire Aux Questions) a partir de cette transcription.\n\n"
        "Regles :\n"
        "- 5 a 8 questions que quelqu'un poserait naturellement apres avoir ecoute ce contenu\n"
        "- Les questions doivent couvrir : les clarifications, les approfondissements, les implications pratiques\n"
        "- Chaque reponse est detaillee (3-5 phrases), basee uniquement sur le contenu de la transcription\n"
        "- Si la transcription ne permet pas de repondre completement, indique-le honnement\n"
        "- Formule les questions du point de vue de l'auditeur, pas de l'intervenant\n"
        "- Adapte la langue a celle de la transcription\n\n"
        "Return valid JSON: {\"faq\": [{\"question\": \"...\", \"answer\": \"...\"}]}"
    ),
    "mindmap": "Create a hierarchical mindmap of this transcript in Markmap-compatible markdown. Return valid JSON: {\"markdown\": \"# Topic\\n## Subtopic\\n- Point\"}",
    "slides": "Create a slide presentation from this transcript. Return valid JSON: {\"slides\": [{\"title\": \"...\", \"bullets\": [\"...\"]}]}",
    "infographic": "Extract data points for a Vega-Lite chart from this transcript. Return valid JSON: {\"description\": \"...\", \"spec\": {}}",
    "tables": "Extract structured data tables from this transcript. Return valid JSON: {\"tables\": [{\"title\": \"...\", \"headers\": [\"...\"], \"rows\": [[\"...\"]]}]}",
}

_MODEL_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "current_model.txt")


def _load_saved_model() -> str:
    """Load persisted model choice, fallback to env var."""
    try:
        if os.path.exists(_MODEL_FILE):
            with open(_MODEL_FILE) as f:
                saved = f.read().strip()
                if saved:
                    return saved
    except Exception:
        pass
    return os.environ.get("OLLAMA_MODEL", "llama3.2:latest")


OLLAMA_MODEL = _load_saved_model()


def get_model():
    """Get current LLM model name."""
    global OLLAMA_MODEL
    return OLLAMA_MODEL


def set_model(model_name: str):
    """Set current LLM model name and persist to disk."""
    global OLLAMA_MODEL
    OLLAMA_MODEL = model_name
    try:
        os.makedirs(os.path.dirname(_MODEL_FILE), exist_ok=True)
        with open(_MODEL_FILE, "w") as f:
            f.write(model_name)
    except Exception as e:
        logger.warning(f"Could not persist model choice: {e}")


def list_ollama_models() -> list[dict]:
    """List available models from Ollama."""
    try:
        models = _ollama.list()
        return [
            {
                "name": m["model"],
                "size_gb": round(m.get("size", 0) / 1e9, 1),
                "modified_at": m.get("modified_at", ""),
            }
            for m in models.get("models", [])
        ]
    except Exception as e:
        logger.error(f"Failed to list Ollama models: {e}")
        return []


async def _call_llm_json_async(prompt: str, transcript_text: str) -> dict:
    """Call LLM (OpenAI or Ollama) for JSON analysis. Runs in thread pool."""
    loop = asyncio.get_event_loop()
    if _USE_OPENAI:
        return await loop.run_in_executor(None, _call_openai_json, prompt, transcript_text)
    return await loop.run_in_executor(None, _call_ollama, prompt, transcript_text)


async def _call_llm_text_async(system_prompt: str, user_prompt: str, max_tokens: int = None) -> str:
    """Call LLM (OpenAI or Ollama) for text response. Runs in thread pool."""
    loop = asyncio.get_event_loop()
    if _USE_OPENAI:
        return await loop.run_in_executor(None, _call_openai_text, system_prompt, user_prompt, max_tokens)
    return await loop.run_in_executor(None, _call_ollama_text, system_prompt, user_prompt, max_tokens)


# Keep old names as aliases for backward compatibility
_call_ollama_async = _call_llm_json_async
_call_ollama_text_async = _call_llm_text_async


def _fix_json(text: str) -> str:
    """Try to fix common JSON issues from LLM output."""
    # Remove trailing commas before } or ]
    text = re.sub(r',\s*([}\]])', r'\1', text)
    # Fix unescaped newlines in strings
    text = re.sub(r'(?<!\\)\n', r'\\n', text)
    return text


def _parse_json_response(text: str) -> dict | None:
    """Try multiple strategies to extract JSON from LLM output."""
    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Extract from markdown code block
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            try:
                return json.loads(_fix_json(match.group(1)))
            except json.JSONDecodeError:
                pass
    # Extract first JSON object
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            try:
                return json.loads(_fix_json(match.group(0)))
            except json.JSONDecodeError:
                pass
    return None


MAX_TRANSCRIPT_CHARS = int(os.environ.get("LLM_MAX_TRANSCRIPT_CHARS", "12000"))
MAX_RESPONSE_TOKENS = int(os.environ.get("LLM_MAX_RESPONSE_TOKENS", "4096"))


# ── OpenAI implementations ───────────────────────────────


def _call_openai_json(prompt: str, transcript_text: str) -> dict:
    """Call OpenAI API and parse JSON from response. Retries on failure."""
    client = _get_openai_client()
    model = _get_openai_model()
    last_error = None
    for attempt in range(1 + LLM_MAX_RETRIES):
        t0 = time.time()
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": f"You are an analysis assistant. Always respond with valid JSON only, no extra text. Ensure all strings are properly escaped.\n\n{TRANSCRIPT_CLEANING_INSTRUCTION}"},
                    {"role": "user", "content": f"{prompt}\n\nTranscript:\n{transcript_text[:MAX_TRANSCRIPT_CHARS]}"},
                ],
                temperature=0.3,
                max_tokens=MAX_RESPONSE_TOKENS,
            )
            elapsed = time.time() - t0
            text = response.choices[0].message.content or ""
            logger.info(f"OpenAI JSON call OK ({elapsed:.1f}s, {len(text)} chars, model={model})")

            parsed = _parse_json_response(text)
            if parsed is not None:
                return parsed

            if attempt < LLM_MAX_RETRIES:
                logger.warning(f"JSON parse failed, retrying ({attempt + 1}/{LLM_MAX_RETRIES})...")
                continue
            logger.warning(f"Could not parse JSON from OpenAI response, returning raw text")
            return {"raw": text}
        except Exception as e:
            elapsed = time.time() - t0
            last_error = e
            logger.error(f"OpenAI JSON call failed ({elapsed:.1f}s, attempt {attempt + 1}): {e}")
            if attempt < LLM_MAX_RETRIES:
                continue

    return {"error": str(last_error)}


def _call_openai_text(system_prompt: str, user_prompt: str, max_tokens: int = None) -> str:
    """Call OpenAI API and return raw text response. Retries on failure."""
    client = _get_openai_client()
    model = _get_openai_model()
    last_error = None
    for attempt in range(1 + LLM_MAX_RETRIES):
        t0 = time.time()
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=max_tokens or MAX_RESPONSE_TOKENS,
            )
            elapsed = time.time() - t0
            text = response.choices[0].message.content or ""
            logger.info(f"OpenAI text call OK ({elapsed:.1f}s, {len(text)} chars, model={model})")
            return text
        except Exception as e:
            elapsed = time.time() - t0
            last_error = e
            logger.error(f"OpenAI text call failed ({elapsed:.1f}s, attempt {attempt + 1}): {e}")
            if attempt < LLM_MAX_RETRIES:
                continue
    return f"Error: {str(last_error)}"


# ── Ollama implementations (fallback) ────────────────────


def _call_ollama(prompt: str, transcript_text: str) -> dict:
    """Call Ollama and try to parse JSON from response. Retries on failure."""
    last_error = None
    for attempt in range(1 + LLM_MAX_RETRIES):
        t0 = time.time()
        try:
            response = _ollama.chat(
                model=OLLAMA_MODEL,
                messages=[
                    {"role": "system", "content": f"You are an analysis assistant. Always respond with valid JSON only, no extra text. Ensure all strings are properly escaped.\n\n{TRANSCRIPT_CLEANING_INSTRUCTION}"},
                    {"role": "user", "content": f"{prompt}\n\nTranscript:\n{transcript_text[:MAX_TRANSCRIPT_CHARS]}"},
                ],
                options={"num_predict": MAX_RESPONSE_TOKENS},
            )
            elapsed = time.time() - t0
            text = response["message"]["content"]
            logger.info(f"Ollama call OK ({elapsed:.1f}s, {len(text)} chars)")

            parsed = _parse_json_response(text)
            if parsed is not None:
                return parsed

            if attempt < LLM_MAX_RETRIES:
                logger.warning(f"JSON parse failed, retrying ({attempt + 1}/{LLM_MAX_RETRIES})...")
                continue
            logger.warning(f"Could not parse JSON from Ollama response, returning raw text")
            return {"raw": text}
        except Exception as e:
            elapsed = time.time() - t0
            last_error = e
            logger.error(f"Ollama call failed ({elapsed:.1f}s, attempt {attempt + 1}): {e}")
            if attempt < LLM_MAX_RETRIES:
                continue

    return {"error": str(last_error)}


def _call_ollama_text(system_prompt: str, user_prompt: str, max_tokens: int = None) -> str:
    """Call Ollama and return raw text response. Retries on failure."""
    last_error = None
    options = {}
    if max_tokens:
        options["num_predict"] = max_tokens
    for attempt in range(1 + LLM_MAX_RETRIES):
        t0 = time.time()
        try:
            response = _ollama.chat(
                model=OLLAMA_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                options=options if options else None,
            )
            elapsed = time.time() - t0
            text = response["message"]["content"]
            logger.info(f"Ollama text call OK ({elapsed:.1f}s, {len(text)} chars)")
            return text
        except Exception as e:
            elapsed = time.time() - t0
            last_error = e
            logger.error(f"Ollama text call failed ({elapsed:.1f}s, attempt {attempt + 1}): {e}")
            if attempt < LLM_MAX_RETRIES:
                continue
    return f"Error: {str(last_error)}"


async def generate_analyses(transcription_id: str, db: AsyncSession, profile_id: str = None, prompt_version: str = "latest", dictionary_entries: list = None, llm_backend_id: str = None):
    """Generate analyses for a transcription based on its profile."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return

    # Use profile from transcription if not explicitly provided
    effective_profile = profile_id or getattr(transcription, "profile", "generic") or "generic"

    # Build dictionary context for LLM prompts
    dict_context = ""
    if dictionary_entries:
        from app.services.dictionary_service import build_dictionary_context
        dict_context = "\n\n" + build_dictionary_context(dictionary_entries)

    # Get analyses from profile config
    profile_analyses = get_profile_analyses(effective_profile)

    # Choose LLM call function based on backend
    async def _llm_call(prompt_text: str, text: str) -> dict:
        if llm_backend_id and llm_backend_id != "llm_open_source":
            return await analyze_transcript_via_backend(prompt_text, text, backend_id=llm_backend_id)
        return await _call_ollama_async(prompt_text, text)

    if llm_backend_id:
        logger.info(f"Using LLM backend: {llm_backend_id}")

    if profile_analyses:
        # Profile-driven pipeline
        success_count = 0
        error_count = 0
        for analysis_def in profile_analyses:
            analysis_type = analysis_def["type"]
            # Use prompt_v2 if available and version=latest
            if prompt_version == "latest" and "prompt_v2" in analysis_def:
                prompt = analysis_def["prompt_v2"]
            else:
                prompt = analysis_def.get("prompt", PROMPTS.get(analysis_type, f"Analyze this transcript for: {analysis_type}"))
            # Inject dictionary context
            if dict_context:
                prompt = prompt + dict_context
            logger.info(f"[{effective_profile}] Generating {analysis_type} (v={prompt_version}) for {transcription_id}...")
            try:
                content = await _llm_call(prompt, transcription.text)
                if "error" in content and len(content) == 1:
                    logger.warning(f"[{effective_profile}] {analysis_type} returned error: {content['error']}")
                    error_count += 1
                else:
                    success_count += 1
            except Exception as e:
                logger.error(f"[{effective_profile}] {analysis_type} failed: {e}")
                content = {"error": str(e)}
                error_count += 1
            analysis = Analysis(
                transcription_id=transcription_id,
                type=analysis_type,
                content=content,
            )
            db.add(analysis)
        await db.commit()
        logger.info(f"[{effective_profile}] {success_count}/{len(profile_analyses)} analyses OK, {error_count} errors for {transcription_id}")
    else:
        # Fallback to hardcoded v2 analyses
        for analysis_type in ANALYSIS_TYPES:
            prompt = PROMPTS.get(analysis_type, f"Analyze this transcript for: {analysis_type}")
            if dict_context:
                prompt = prompt + dict_context
            logger.info(f"Generating {analysis_type} for {transcription_id}...")
            content = await _llm_call(prompt, transcription.text)
            analysis = Analysis(
                transcription_id=transcription_id,
                type=analysis_type,
                content=content,
            )
            db.add(analysis)
        await db.commit()
        logger.info(f"All {len(ANALYSIS_TYPES)} analyses generated for {transcription_id}")


async def regenerate_analysis(transcription_id: str, analysis_type: str, db: AsyncSession, instructions: str = None, prompt_version: str = "latest"):
    """Regenerate a single analysis, optionally with custom instructions."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return None

    # Try profile-specific prompt first, then fallback to hardcoded
    effective_profile = getattr(transcription, "profile", "generic") or "generic"
    profile_prompt = get_analysis_prompt(effective_profile, analysis_type, version=prompt_version)
    prompt = profile_prompt or PROMPTS.get(analysis_type, f"Analyze this transcript for: {analysis_type}")
    if instructions:
        prompt += f"\n\nAdditional instructions: {instructions}"

    content = await _call_ollama_async(prompt, transcription.text)

    result = await db.execute(
        select(Analysis).where(
            Analysis.transcription_id == transcription_id,
            Analysis.type == analysis_type
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.content = content
        existing.instructions = instructions
    else:
        analysis = Analysis(
            transcription_id=transcription_id,
            type=analysis_type,
            content=content,
            instructions=instructions,
        )
        db.add(analysis)

    await db.commit()
    return content


async def chat_with_transcript(transcription_id: str, message: str, db: AsyncSession) -> str:
    """Chat with a transcription, maintaining history."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return "Transcription not found"

    # Get recent chat history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.transcription_id == transcription_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    history = list(reversed(history_result.scalars().all()))

    # Build messages with history
    messages = [
        {"role": "system", "content": f"You are a helpful assistant. Answer questions based on this transcript. When possible, cite relevant passages.\n\nTranscript:\n{transcription.text[:6000]}"},
    ]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": message})

    # Save user message
    user_msg = ChatMessage(transcription_id=transcription_id, role="user", content=message)
    db.add(user_msg)

    # Get response (non-blocking)
    def _chat_sync():
        try:
            if _USE_OPENAI:
                client = _get_openai_client()
                response = client.chat.completions.create(
                    model=_get_openai_model(),
                    messages=messages,
                    temperature=0.4,
                    max_tokens=2048,
                )
                return response.choices[0].message.content or ""
            else:
                response = _ollama.chat(model=OLLAMA_MODEL, messages=messages)
                return response["message"]["content"]
        except Exception as e:
            return f"Error: {str(e)}"

    loop = asyncio.get_event_loop()
    answer = await loop.run_in_executor(None, _chat_sync)

    # Save assistant message
    assistant_msg = ChatMessage(transcription_id=transcription_id, role="assistant", content=answer)
    db.add(assistant_msg)
    await db.commit()

    return answer


async def polish_transcription(raw_text: str, language: str = "fr", dictionary_entries: list = None) -> str:
    """Polish raw transcription text: fix formatting, punctuation, paragraphs.

    Handles long transcriptions by chunking (~3000 chars per chunk) to stay
    within the LLM context window. Each chunk gets generous num_predict to
    avoid output truncation.
    """
    if not raw_text or len(raw_text.strip()) < 50:
        return raw_text

    lang_name = {
        "fr": "français", "en": "English", "es": "español", "de": "Deutsch",
        "it": "italiano", "pt": "português", "nl": "Nederlands",
        "pl": "polski", "ru": "русский", "ja": "日本語", "zh": "中文",
        "ko": "한국어", "ar": "العربية", "tr": "Türkçe", "uk": "українська",
    }.get(language, language or "la langue d'origine")

    system_prompt = (
        f"You are an Expert Text Corrector and Editor specialized in audio transcription cleanup. "
        f"Your mission: surgical precision without distorting the speaker's tone or style. "
        f"You work in {lang_name}. You MUST respond in the SAME language as the transcript."
    )

    # Build dictionary/glossary section if available
    glossary_section = ""
    if dictionary_entries:
        terms = ", ".join(
            f"{e['term']} -> {e['replacement']}" if e.get('replacement') else e['term']
            for e in dictionary_entries
        )
        glossary_section = (
            f"\nPriority glossary — automatically correct phonetic errors using this list: {terms}\n"
        )
    else:
        glossary_section = (
            "\nNo glossary provided: identify and unify proper nouns and technical terms on your own.\n"
        )

    base_instructions = (
        "Correction rules:\n\n"
        "SPELLING & GRAMMAR: Fix obvious mistakes, agreements and conjugations, without rephrasing.\n\n"
        "PARAGRAPH LAYOUT — THIS IS CRITICAL FOR READABILITY:\n"
        "- You MUST insert blank lines (two newlines) to separate paragraphs\n"
        "- Create a new paragraph every 3-5 sentences, or whenever the topic shifts\n"
        "- If there are multiple speakers, ALWAYS start a new paragraph for each speaker turn\n"
        "- The output must be airy and pleasant to read, NOT a single wall of text\n"
        "- Add proper punctuation: periods, commas, question marks, capitalize sentence starts\n\n"
        "CLEANUP — THIS IS CRITICAL:\n"
        "- Remove ALL filler words and hesitations: 'euh', 'hum', 'ben', 'uh', 'um', 'like', 'you know', 'I mean', 'so yeah', 'right'\n"
        "- Remove ALL backchanneling and listener feedback when repeated or meaningless: "
        "'Yeah. Yeah. Yeah.', 'Mm. Mm.', 'OK. OK.', 'Right. Right.', 'Uh-huh.' — "
        "Keep ONLY ONE instance if it carries meaning (e.g. an actual agreement), remove the rest entirely\n"
        "- Remove stuttering and involuntary repetitions: 'the the', 'I I I', 'we we'\n"
        "- Remove meaningless interjections at the start of sentences when they add nothing\n"
        "- Preserve natural character: keep intentional repetitions for emphasis\n\n"
        f"{glossary_section}\n"
        "UNCERTAIN WORDS: If a word or passage is doubtful or incomplete, write [word?] "
        "(or [word-?] if partially audible) instead of guessing.\n\n"
        "STYLE PROTECTION:\n"
        "- DO NOT rephrase: Keep the speaker's phrasing, register (casual, professional, technical) "
        "and any jokes or metaphors.\n"
        "- DO NOT summarize: Every idea or piece of information must remain.\n"
        "- PRESERVE the oral rhythm: Don't make the text academic. Punctuation should follow the speaker's flow.\n\n"
        "STRUCTURE:\n"
        "- If multiple speakers are present, show their names or roles in bold before each speaker turn, "
        "and start a new paragraph (blank line) for each turn.\n"
        "- Use em dashes for dialogue, if applicable.\n\n"
        "OUTPUT FORMAT:\n"
        "- Return ONLY the corrected text, no explanations, annotations or comments.\n"
        "- No text outside the correction should appear.\n"
        "- The text MUST contain paragraph breaks (blank lines between paragraphs).\n\n"
    )

    # Chunk long texts (~3000 chars per chunk, split on sentence boundaries)
    CHUNK_SIZE = 3000
    if len(raw_text) <= CHUNK_SIZE:
        chunks = [raw_text]
    else:
        chunks = []
        remaining = raw_text
        while remaining:
            if len(remaining) <= CHUNK_SIZE:
                chunks.append(remaining)
                break
            # Find a sentence boundary near CHUNK_SIZE
            cut = CHUNK_SIZE
            for sep in ['. ', '? ', '! ', '\n', ', ']:
                idx = remaining.rfind(sep, CHUNK_SIZE // 2, CHUNK_SIZE + 200)
                if idx > 0:
                    cut = idx + len(sep)
                    break
            chunks.append(remaining[:cut])
            remaining = remaining[cut:]
        logger.info(f"Polish: splitting {len(raw_text)} chars into {len(chunks)} chunks")

    polished_parts = []
    for i, chunk in enumerate(chunks):
        chunk_label = f"(partie {i+1}/{len(chunks)}) " if len(chunks) > 1 else ""
        user_prompt = (
            f"{base_instructions}"
            f"--- TRANSCRIPTION BRUTE {chunk_label}---\n{chunk}"
        )
        # num_predict: allow output roughly 1.5x input token count (chars/3 ≈ tokens)
        estimated_tokens = max(2048, int(len(chunk) / 2))
        result = await _call_ollama_text_async(system_prompt, user_prompt, max_tokens=estimated_tokens)

        if result.startswith("Error:"):
            logger.warning(f"Polish chunk {i+1} error: {result}, using raw chunk")
            polished_parts.append(chunk)
        elif len(result) < len(chunk) * 0.3:
            logger.warning(f"Polish chunk {i+1} too short ({len(result)} vs {len(chunk)}), using raw chunk")
            polished_parts.append(chunk)
        else:
            polished_parts.append(result.strip())

    polished = "\n\n".join(polished_parts)

    # Final sanity check
    if len(polished) < len(raw_text) * 0.3:
        logger.warning(f"Polish result too short overall ({len(polished)} vs {len(raw_text)}), keeping original")
        return raw_text

    return polished


async def generate_chapters(transcription_id: str, db: AsyncSession) -> list:
    """Generate chapters from the polished transcript text + segment timestamps."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return []

    # Check if chapters already exist
    existing = await db.execute(select(Chapter).where(Chapter.transcription_id == transcription_id))
    chapters = existing.scalars().all()
    if chapters:
        return chapters

    # Build input: use polished text with timestamp markers from segments
    # This ensures chapters are based on the cleaned text, not raw STT output
    segments = transcription.segments or []
    if segments:
        # Combine timestamps with segment text for temporal context
        segments_text = ""
        for seg in segments:
            segments_text += f"[{seg['start']:.1f}s - {seg['end']:.1f}s] {seg['text']}\n"
        # Use polished text as primary + segments for timestamps
        input_text = (
            f"=== POLISHED TRANSCRIPT ===\n{transcription.text[:6000]}\n\n"
            f"=== TIMESTAMPED SEGMENTS (for time references) ===\n{segments_text[:4000]}"
        )
    else:
        input_text = transcription.text[:8000]

    prompt = (
        "Analyze this transcript and divide it into logical chapters/sections based on topic changes.\n\n"
        "Rules:\n"
        "- Use the POLISHED TRANSCRIPT for content quality (titles, summaries)\n"
        "- Use the TIMESTAMPED SEGMENTS to determine start_time and end_time of each chapter\n"
        "- Each chapter needs: a clear descriptive title, start_time, end_time (in seconds), and a 1-2 sentence summary\n"
        "- Create 3-8 chapters depending on content length and topic variety\n"
        "- Titles should be concise and informative, not generic\n"
        "- Summaries should capture the key point of that section\n"
        "- Adapt language to match the transcript language\n\n"
        "Return valid JSON: {\"chapters\": [{\"title\": \"...\", \"start_time\": 0.0, \"end_time\": 30.0, \"summary\": \"...\"}]}"
    )
    content = await _call_ollama_async(prompt, input_text)

    chapter_data = content.get("chapters", [])
    result_chapters = []
    for ch in chapter_data:
        chapter = Chapter(
            transcription_id=transcription_id,
            title=ch.get("title", "Untitled"),
            start_time=float(ch.get("start_time", 0)),
            end_time=float(ch.get("end_time", 0)),
            summary=ch.get("summary", ""),
        )
        db.add(chapter)
        result_chapters.append(chapter)

    await db.commit()
    return result_chapters


async def generate_glossary(transcription_id: str, db: AsyncSession) -> dict:
    """Extract technical terms and definitions from transcript."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return {"terms": []}

    prompt = (
        "Extract all technical terms, acronyms, and specialized vocabulary from this transcript. "
        "For each term, provide a clear definition based on context. "
        "Return valid JSON: {\"terms\": [{\"term\": \"...\", \"definition\": \"...\"}]}"
    )
    content = await _call_ollama_async(prompt, transcription.text)
    return content


async def translate_transcript(transcription_id: str, target_lang: str, db: AsyncSession) -> str:
    """Translate a transcript to target language, with caching."""
    # Check cache first
    cache_result = await db.execute(
        select(TranslationCache).where(
            TranslationCache.transcription_id == transcription_id,
            TranslationCache.target_lang == target_lang,
        )
    )
    cached = cache_result.scalar_one_or_none()
    if cached:
        return cached.translated_text

    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return ""

    lang_names = {"en": "English", "fr": "French", "es": "Spanish", "de": "German", "it": "Italian"}
    target_name = lang_names.get(target_lang, target_lang)

    # Translate in chunks to handle long texts
    text = transcription.text
    chunk_size = 4000
    chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
    translated_parts = []

    for chunk in chunks:
        translated = await _call_ollama_text_async(
            f"You are a translator. Translate the following text to {target_name}. Output ONLY the translation, nothing else.",
            chunk,
        )
        translated_parts.append(translated)

    translated_text = " ".join(translated_parts)

    # Cache the result
    cache = TranslationCache(
        transcription_id=transcription_id,
        target_lang=target_lang,
        translated_text=translated_text,
    )
    db.add(cache)
    await db.commit()

    return translated_text

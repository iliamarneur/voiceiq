import json
import logging
import os
import re
import ollama as ollama_client
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Transcription, Analysis, Chapter, TranslationCache, ChatMessage

logger = logging.getLogger(__name__)

_OLLAMA_HOST_ENV = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_HOST = _OLLAMA_HOST_ENV.replace("0.0.0.0", "127.0.0.1")
if not OLLAMA_HOST.startswith("http"):
    OLLAMA_HOST = f"http://{OLLAMA_HOST}"
_ollama = ollama_client.Client(host=OLLAMA_HOST)

ANALYSIS_TYPES = [
    "summary", "keypoints", "actions", "flashcards",
    "quiz", "mindmap", "slides", "infographic", "tables"
]

PROMPTS = {
    "summary": "Produce a structured summary of this transcript with: title, introduction, main points, and conclusion. Return valid JSON: {\"title\": \"...\", \"introduction\": \"...\", \"points\": [\"...\"], \"conclusion\": \"...\"}",
    "keypoints": "Extract the key points from this transcript as thematic bullet points. Return valid JSON: {\"keypoints\": [{\"theme\": \"...\", \"points\": [\"...\"]}]}",
    "actions": "Extract action items, decisions taken, and open questions from this transcript. Return valid JSON: {\"actions\": [\"...\"], \"decisions\": [\"...\"], \"questions\": [\"...\"]}",
    "flashcards": "Create revision flashcards (question/answer pairs) from this transcript. Return valid JSON: {\"cards\": [{\"question\": \"...\", \"answer\": \"...\"}]}",
    "quiz": "Create a multiple-choice quiz (4-5 questions) from this transcript. Each choice must be a full text answer, not just a letter. Return valid JSON: {\"questions\": [{\"question\": \"What is...?\", \"choices\": [\"The actual answer text A\", \"The actual answer text B\", \"The actual answer text C\", \"The actual answer text D\"], \"answer\": \"A\", \"explanation\": \"Because...\"}]}",
    "mindmap": "Create a hierarchical mindmap of this transcript in Markmap-compatible markdown. Return valid JSON: {\"markdown\": \"# Topic\\n## Subtopic\\n- Point\"}",
    "slides": "Create a slide presentation from this transcript. Return valid JSON: {\"slides\": [{\"title\": \"...\", \"bullets\": [\"...\"]}]}",
    "infographic": "Extract data points for a Vega-Lite chart from this transcript. Return valid JSON: {\"description\": \"...\", \"spec\": {}}",
    "tables": "Extract structured data tables from this transcript. Return valid JSON: {\"tables\": [{\"title\": \"...\", \"headers\": [\"...\"], \"rows\": [[\"...\"]]}]}",
}

OLLAMA_MODEL = "mistral-nemo:latest"


def _fix_json(text: str) -> str:
    """Try to fix common JSON issues from LLM output."""
    # Remove trailing commas before } or ]
    text = re.sub(r',\s*([}\]])', r'\1', text)
    # Fix unescaped newlines in strings
    text = re.sub(r'(?<!\\)\n', r'\\n', text)
    return text


def _call_ollama(prompt: str, transcript_text: str) -> dict:
    """Call Ollama and try to parse JSON from response."""
    try:
        response = _ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": "You are an analysis assistant. Always respond with valid JSON only, no extra text. Ensure all strings are properly escaped."},
                {"role": "user", "content": f"{prompt}\n\nTranscript:\n{transcript_text[:8000]}"},
            ],
        )
        text = response["message"]["content"]
        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        # Try extracting JSON block
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                # Try fixing common issues
                try:
                    return json.loads(_fix_json(match.group(0)))
                except json.JSONDecodeError:
                    pass
        # Try extracting from markdown code block
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                try:
                    return json.loads(_fix_json(match.group(1)))
                except json.JSONDecodeError:
                    pass
        logger.warning(f"Could not parse JSON from Ollama response, returning raw text")
        return {"raw": text}
    except Exception as e:
        logger.error(f"Ollama call failed: {e}")
        return {"error": str(e)}


def _call_ollama_text(system_prompt: str, user_prompt: str) -> str:
    """Call Ollama and return raw text response."""
    try:
        response = _ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response["message"]["content"]
    except Exception as e:
        logger.error(f"Ollama call failed: {e}")
        return f"Error: {str(e)}"


async def generate_analyses(transcription_id: str, db: AsyncSession):
    """Generate all 9 analyses for a transcription."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return

    for analysis_type in ANALYSIS_TYPES:
        prompt = PROMPTS.get(analysis_type, f"Analyze this transcript for: {analysis_type}")
        logger.info(f"Generating {analysis_type} for {transcription_id}...")
        content = _call_ollama(prompt, transcription.text)
        analysis = Analysis(
            transcription_id=transcription_id,
            type=analysis_type,
            content=content,
        )
        db.add(analysis)

    await db.commit()
    logger.info(f"All 9 analyses generated for {transcription_id}")


async def regenerate_analysis(transcription_id: str, analysis_type: str, db: AsyncSession, instructions: str = None):
    """Regenerate a single analysis, optionally with custom instructions."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return None

    prompt = PROMPTS.get(analysis_type, f"Analyze this transcript for: {analysis_type}")
    if instructions:
        prompt += f"\n\nAdditional instructions: {instructions}"

    content = _call_ollama(prompt, transcription.text)

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

    # Get response
    try:
        response = _ollama.chat(model=OLLAMA_MODEL, messages=messages)
        answer = response["message"]["content"]
    except Exception as e:
        answer = f"Error: {str(e)}"

    # Save assistant message
    assistant_msg = ChatMessage(transcription_id=transcription_id, role="assistant", content=answer)
    db.add(assistant_msg)
    await db.commit()

    return answer


async def generate_chapters(transcription_id: str, db: AsyncSession) -> list:
    """Generate chapters from transcript segments."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return []

    # Check if chapters already exist
    existing = await db.execute(select(Chapter).where(Chapter.transcription_id == transcription_id))
    chapters = existing.scalars().all()
    if chapters:
        return chapters

    # Generate via LLM
    segments_text = ""
    for seg in (transcription.segments or []):
        segments_text += f"[{seg['start']:.1f}s - {seg['end']:.1f}s] {seg['text']}\n"

    prompt = (
        "Analyze this timestamped transcript and divide it into logical chapters/sections. "
        "Each chapter should have a title, start_time, end_time (in seconds), and a brief summary. "
        "Return valid JSON: {\"chapters\": [{\"title\": \"...\", \"start_time\": 0.0, \"end_time\": 30.0, \"summary\": \"...\"}]}"
    )
    content = _call_ollama(prompt, segments_text[:8000])

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
    content = _call_ollama(prompt, transcription.text)
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
        translated = _call_ollama_text(
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

import os
import shutil
import asyncio
import logging
import time
from collections import defaultdict
from datetime import datetime

# Load .env file if present (for OPENAI_API_KEY, STRIPE keys, etc.)
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, init_db
from app.models import (
    Job, Transcription, Analysis, ChatMessage, Chapter, Template, TranslationCache,
    SpeakerLabel, UserDictionary, DictionaryEntry, AudioPreset, UserCorrection,
    UserPreferences, DictationSession,
    Plan, UserSubscription, UsageLog, OneshotOrder, BillingEvent,
)
from app.schemas import (
    JobOut, TranscriptionOut, AnalysisOut, StatsOut,
    ChatMessageOut, ChatRequest, ChapterOut,
    TemplateOut, TemplateCreate, TemplateUpdate,
    TranslateRequest, TranslationOut, GlossaryOut,
    ProfileOut,
    SpeakerLabelOut, SpeakerLabelUpdate,
    DictionaryOut, DictionaryCreate, DictionaryEntryOut, DictionaryEntryCreate,
    AudioPresetOut, AudioPresetCreate, AudioPresetUpdate,
    CorrectionCreate, CorrectionOut, QueueItemOut, PriorityUpdate,
    UserPreferencesOut, UserPreferencesUpdate, KeyMomentOut, ConfidenceInfo,
    DictationSessionOut, DictationStartRequest, DictationChunkResponse, DictationSaveResponse,
    PlanOut, SubscriptionOut, UsageLogOut, UsageSummaryOut,
    OneshotOrderOut, OneshotEstimate, AddMinutesRequest,
)
from app.services.transcription_service import transcribe_audio
from app.services.llm_service import (
    regenerate_analysis, generate_analyses,
    chat_with_transcript, generate_chapters,
    generate_glossary, translate_transcript,
    get_model, set_model, list_ollama_models,
)
from app.services.profile_service import (
    get_all_profiles, get_profile, get_profile_analyses,
    get_profile_exports, reload_profiles,
)
from app.services.export_service import (
    export_to_pdf, export_to_srt, export_to_vtt,
    export_to_txt, export_to_json, export_to_md, export_to_pptx,
    EXPORT_DIR,
)
from app.services.queue_service import (
    get_queue_status, update_job_priority, retry_failed_job,
    estimate_processing_time,
)
from app.services.dictionary_service import (
    get_all_dictionaries, get_dictionary, create_dictionary, delete_dictionary,
    add_entry, delete_entry, get_dictionary_entries,
    save_correction, get_corrections,
)
from app.services.audio_analysis_service import get_audio_type_profiles
from app.services.confidence_service import compute_confidence_scores, get_micro_tip
from app.services.subscription_service import (
    get_or_create_subscription, get_subscription_info, change_plan,
    check_minutes_available, add_extra_minutes,
    estimate_oneshot_tier, create_oneshot_order, link_oneshot_to_transcription,
    get_usage_summary, get_usage_logs, get_subscription_alerts,
    get_oneshot_tiers, get_extra_packs, get_seed_plans,
    seed_plans,
)
from app.services.feature_gate import require_feature_check, get_plan_features, check_dictionary_limit
from app.services.stripe_service import (
    is_stripe_configured, create_oneshot_checkout, create_pack_checkout,
    create_plan_checkout, verify_webhook_signature, extract_checkout_metadata,
)
from app.services.stt_backends import get_stt_backends, resolve_stt_backend
from app.services.llm_backends import get_llm_backends, resolve_llm_backend
from app.services.dictation_service import (
    start_session as dictation_start,
    transcribe_chunk as dictation_chunk,
    pause_session as dictation_pause,
    resume_session as dictation_resume,
    stop_session as dictation_stop,
    save_as_transcription as dictation_save,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
# Audio formats
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".webm", ".wma", ".aac", ".opus", ".amr"}
# Video formats (audio will be extracted)
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".ts", ".mts", ".m2ts", ".webm"}
ALLOWED_EXTENSIONS = AUDIO_EXTENSIONS | VIDEO_EXTENSIONS
# Max upload size: configurable via env var (default 2 GB)
MAX_UPLOAD_SIZE = int(os.environ.get("MAX_UPLOAD_SIZE_BYTES", str(2 * 1024 * 1024 * 1024)))


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(EXPORT_DIR, exist_ok=True)
    await init_db()  # Also seeds plans via database.py
    reload_profiles()
    # Pre-load dictation model in background to avoid cold start
    def _preload_dictation_model():
        try:
            from app.services.transcription_service import get_fast_whisper_model, get_dictation_model_name
            logger.info(f"Pre-loading dictation model '{get_dictation_model_name()}'...")
            get_fast_whisper_model()
            logger.info("Dictation model pre-loaded and ready")
        except Exception as e:
            logger.warning(f"Dictation model pre-load failed (will load on first use): {e}")
    asyncio.get_event_loop().run_in_executor(None, _preload_dictation_model)

    # Periodic cleanup of expired anonymous sessions
    async def _cleanup_anonymous_sessions():
        from app.services.anonymous_service import cleanup_expired
        while True:
            try:
                async with AsyncSessionLocal() as db:
                    deleted = await cleanup_expired(db)
                    if deleted:
                        logger.info(f"Cleaned up {deleted} expired anonymous sessions")
            except Exception as e:
                logger.warning(f"Anonymous session cleanup error: {e}")
            await asyncio.sleep(3600)  # Run every hour

    cleanup_task = asyncio.create_task(_cleanup_anonymous_sessions())

    logger.info("VoiceIQ v7.0 API ready (offres & minutes)")
    yield
    cleanup_task.cancel()


app = FastAPI(title="VoiceIQ v7.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate limiter (billing endpoints) ─────────────────────
_rate_limits: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 10  # max requests per window per IP


def _check_rate_limit(client_ip: str, endpoint: str) -> bool:
    """Return True if rate limit exceeded."""
    key = f"{client_ip}:{endpoint}"
    now = time.time()
    _rate_limits[key] = [t for t in _rate_limits[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limits[key]) >= RATE_LIMIT_MAX:
        return True
    _rate_limits[key].append(now)
    return False


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ── Upload & Jobs ──────────────────────────────────────────

@app.post("/api/upload", response_model=JobOut, status_code=202)
async def upload_audio(
    file: UploadFile = File(...),
    profile: str = Form("generic"),
    priority: str = Form("P1"),
    preset_id: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    stt_backend: Optional[str] = Form(None),
    llm_backend: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    # Feature gate: transcription required
    await require_feature_check(db, "transcription")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Supported: audio (mp3, wav, m4a, flac, ogg, aac, opus) and video (mp4, mkv, avi, mov, wmv)")

    # Sanitize filename
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    file_location = os.path.join(UPLOAD_DIR, safe_name)

    # Chunked write for large files (avoids loading entire file in memory)
    total_size = 0
    chunk_size = 8 * 1024 * 1024  # 8 MB chunks
    with open(file_location, "wb") as buffer:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE:
                buffer.close()
                os.remove(file_location)
                raise HTTPException(status_code=413, detail=f"File too large. Maximum size: 2 GB")
            buffer.write(chunk)

    logger.info(f"Uploaded {safe_name}: {total_size / (1024*1024):.1f} MB")

    # Validate profile
    available = get_all_profiles()
    valid_ids = {p["id"] for p in available}
    if profile not in valid_ids:
        profile = "generic"

    # Validate priority
    if priority not in ("P0", "P1", "P2"):
        priority = "P1"

    # Estimate processing time
    num_analyses = len(get_profile_analyses(profile)) or 9
    est_seconds = estimate_processing_time(total_size, num_analyses)

    job = Job(
        status="pending", file_path=file_location, profile=profile,
        priority=priority, estimated_seconds=est_seconds, preset_id=preset_id,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    async def _bg_transcribe(job_id: str, prof: str, lang: str | None = None, stt_ov: str = None, llm_ov: str = None):
        async with AsyncSessionLocal() as bg_db:
            await transcribe_audio(job_id, bg_db, profile=prof, language=lang,
                                   stt_override=stt_ov, llm_override=llm_ov, mode_id="file_upload")
    asyncio.create_task(_bg_transcribe(job.id, profile, language, stt_backend, llm_backend))
    return job


@app.post("/api/upload/batch", status_code=202)
async def upload_batch(
    files: List[UploadFile] = File(...),
    profile: str = Form("generic"),
    priority: str = Form("P1"),
    preset_id: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    stt_backend: Optional[str] = Form(None),
    llm_backend: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Upload multiple audio files at once."""
    MAX_BATCH_FILES = 20
    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files. Maximum {MAX_BATCH_FILES} files per batch."
        )
    if priority not in ("P0", "P1", "P2"):
        priority = "P1"

    num_analyses = len(get_profile_analyses(profile)) or 9
    jobs = []
    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        safe_name = file.filename.replace("/", "_").replace("\\", "_")
        file_location = os.path.join(UPLOAD_DIR, safe_name)
        # Chunked write for large files
        total_size = 0
        with open(file_location, "wb") as buffer:
            while True:
                chunk = await file.read(8 * 1024 * 1024)
                if not chunk:
                    break
                total_size += len(chunk)
                buffer.write(chunk)

        est_seconds = estimate_processing_time(total_size, num_analyses)
        job = Job(
            status="pending", file_path=file_location, profile=profile,
            priority=priority, estimated_seconds=est_seconds, preset_id=preset_id,
        )
        db.add(job)
        await db.flush()
        await db.refresh(job)
        jobs.append({
            "id": job.id, "filename": file.filename, "status": "pending",
            "priority": priority, "estimated_seconds": est_seconds,
        })

    await db.commit()

    # Start all transcriptions in background
    for j in jobs:
        async def _bg(jid=j["id"], prof=profile, lang=language, stt_ov=stt_backend, llm_ov=llm_backend):
            async with AsyncSessionLocal() as bg_db:
                await transcribe_audio(jid, bg_db, profile=prof, language=lang,
                                       stt_override=stt_ov, llm_override=llm_ov, mode_id="file_upload")
        asyncio.create_task(_bg())

    total_est = sum(j.get("estimated_seconds", 0) or 0 for j in jobs)
    return {"jobs": jobs, "total": len(jobs), "total_estimated_seconds": round(total_est, 1)}


@app.get("/api/jobs/{job_id}", response_model=JobOut)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ── Transcriptions ─────────────────────────────────────────

@app.get("/api/transcriptions", response_model=list[TranscriptionOut])
async def list_transcriptions(
    page: int = 1, per_page: int = 20,
    search: Optional[str] = None, lang: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Transcription)
    if search:
        query = query.where(Transcription.text.contains(search))
    if lang:
        query = query.where(Transcription.language == lang)
    query = query.order_by(Transcription.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@app.get("/api/transcriptions/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_result = await db.execute(select(func.count()).select_from(Transcription))
    total = total_result.scalar() or 0

    duration_result = await db.execute(select(func.coalesce(func.sum(Transcription.duration), 0)))
    total_duration = duration_result.scalar() or 0

    lang_result = await db.execute(
        select(Transcription.language, func.count()).group_by(Transcription.language)
    )
    languages = {lang or "unknown": count for lang, count in lang_result.all()}

    # Additional v2 stats
    analyses_result = await db.execute(select(func.count()).select_from(Analysis))
    total_analyses = analyses_result.scalar() or 0

    chat_result = await db.execute(select(func.count()).select_from(ChatMessage))
    total_chats = chat_result.scalar() or 0

    return {
        "total": total,
        "total_duration": total_duration,
        "languages": languages,
        "total_analyses": total_analyses,
        "total_chats": total_chats,
    }


@app.get("/api/transcriptions/{id}", response_model=TranscriptionOut)
async def get_transcription(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return transcription


@app.delete("/api/transcriptions/{id}", status_code=204)
async def delete_transcription(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    await db.delete(transcription)
    await db.commit()


# ── Analyses ───────────────────────────────────────────────

@app.get("/api/transcriptions/{id}/analyses", response_model=list[AnalysisOut])
async def get_analyses(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Analysis).where(Analysis.transcription_id == id))
    return result.scalars().all()


@app.get("/api/transcriptions/{id}/analyses/{type}", response_model=AnalysisOut)
async def get_analysis(id: str, type: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Analysis).where(Analysis.transcription_id == id, Analysis.type == type)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@app.post("/api/transcriptions/{id}/regenerate-all")
async def regenerate_all(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    existing = await db.execute(select(Analysis).where(Analysis.transcription_id == id))
    for a in existing.scalars().all():
        await db.delete(a)
    await db.commit()

    profile_id = transcription.profile or "generic"
    profile_analyses = get_profile_analyses(profile_id)
    num_analyses = len(profile_analyses) if profile_analyses else len(["summary", "keypoints", "actions", "flashcards", "quiz", "mindmap", "slides", "infographic", "tables"])

    async def _bg_regen():
        async with AsyncSessionLocal() as bg_db:
            await generate_analyses(id, bg_db, profile_id=profile_id)
    asyncio.create_task(_bg_regen())
    return {"status": "regenerating", "message": f"{num_analyses} analyses are being regenerated (profile: {profile_id})"}


@app.post("/api/transcriptions/{id}/analyses/{type}/regenerate")
async def regenerate(id: str, type: str, instructions: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    # Gate analysis types to plan features
    ANALYSIS_FEATURE_MAP = {
        "summary": "summary", "keypoints": "keypoints", "actions": "actions",
        "flashcards": "flashcards", "quiz": "quiz", "mindmap": "mindmap",
        "slides": "slides", "infographic": "infographic", "tables": "tables",
    }
    feature = ANALYSIS_FEATURE_MAP.get(type)
    if feature:
        await require_feature_check(db, feature)
    content = await regenerate_analysis(id, type, db, instructions)
    if content is None:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return {"status": "done", "type": type, "content": content}


# ── Chat ──────────────────────────────────────────────────

@app.post("/api/transcriptions/{id}/chat")
async def chat_endpoint(id: str, body: ChatRequest, db: AsyncSession = Depends(get_db)):
    await require_feature_check(db, "chat")
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Transcription not found")

    answer = await chat_with_transcript(id, body.message, db)
    return {"response": answer}


@app.get("/api/transcriptions/{id}/chat/history", response_model=list[ChatMessageOut])
async def get_chat_history(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.transcription_id == id)
        .order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()


@app.delete("/api/transcriptions/{id}/chat/history", status_code=204)
async def clear_chat_history(id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(ChatMessage).where(ChatMessage.transcription_id == id))
    await db.commit()


# ── Chapters ─────────────────────────────────────────────

@app.get("/api/transcriptions/{id}/chapters", response_model=list[ChapterOut])
async def get_chapters(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Transcription not found")

    chapters = await generate_chapters(id, db)
    return chapters


@app.delete("/api/transcriptions/{id}/chapters", status_code=204)
async def delete_chapters(id: str, db: AsyncSession = Depends(get_db)):
    """Delete chapters to force regeneration."""
    await db.execute(delete(Chapter).where(Chapter.transcription_id == id))
    await db.commit()


# ── Translation ──────────────────────────────────────────

@app.post("/api/transcriptions/{id}/translate", response_model=TranslationOut)
async def translate(id: str, body: TranslateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Transcription not found")

    translated_text = await translate_transcript(id, body.target_lang, db)

    # Return the cached entry
    cache_result = await db.execute(
        select(TranslationCache).where(
            TranslationCache.transcription_id == id,
            TranslationCache.target_lang == body.target_lang,
        )
    )
    cached = cache_result.scalar_one_or_none()
    return cached


@app.get("/api/transcriptions/{id}/translations")
async def get_translations(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TranslationCache).where(TranslationCache.transcription_id == id)
    )
    translations = result.scalars().all()
    return [{"id": t.id, "target_lang": t.target_lang, "translated_text": t.translated_text[:200] + "...", "created_at": str(t.created_at)} for t in translations]


# ── Glossary ─────────────────────────────────────────────

@app.get("/api/transcriptions/{id}/glossary")
async def get_glossary(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Transcription not found")

    glossary = await generate_glossary(id, db)
    return glossary


# ── Templates ────────────────────────────────────────────

@app.get("/api/templates", response_model=list[TemplateOut])
async def list_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Template).order_by(Template.created_at.desc()))
    return result.scalars().all()


@app.post("/api/templates", response_model=TemplateOut, status_code=201)
async def create_template(body: TemplateCreate, db: AsyncSession = Depends(get_db)):
    await require_feature_check(db, "templates")
    template = Template(name=body.name, type=body.type, instructions=body.instructions)
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@app.get("/api/templates/{template_id}", response_model=TemplateOut)
async def get_template(template_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@app.put("/api/templates/{template_id}", response_model=TemplateOut)
async def update_template(template_id: str, body: TemplateUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if body.name is not None:
        template.name = body.name
    if body.type is not None:
        template.type = body.type
    if body.instructions is not None:
        template.instructions = body.instructions
    await db.commit()
    await db.refresh(template)
    return template


@app.delete("/api/templates/{template_id}", status_code=204)
async def delete_template(template_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()


# ── Audio serving ────────────────────────────────────────

@app.get("/api/transcriptions/{id}/audio")
async def get_audio(id: str, db: AsyncSession = Depends(get_db)):
    """Get the audio file URL for a transcription."""
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    # Find the job to get the file path
    job_result = await db.execute(select(Job).where(Job.transcription_id == id))
    job = job_result.scalar_one_or_none()
    if not job:
        # Try via transcription's job_id
        job_result = await db.execute(select(Job).where(Job.id == transcription.job_id))
        job = job_result.scalar_one_or_none()

    if not job or not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(job.file_path)


# ── Mise en page (LLM formatting) ────────────────────────

@app.post("/api/transcriptions/{id}/format")
async def format_transcription(id: str, db: AsyncSession = Depends(get_db)):
    """Run LLM to produce a beautifully formatted version of the transcript."""
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    raw_text = transcription.text or ""
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="No text to format")

    backend_id = resolve_llm_backend("file_upload")

    prompt = (
        "Tu es un expert en mise en page de textes. On te donne la transcription brute d'un audio. "
        "Ton travail :\n"
        "1. Ne change RIEN au contenu. Ne reformule pas, ne resume pas, ne supprime rien.\n"
        "2. Corrige UNIQUEMENT les grosses fautes d'orthographe ou de grammaire evidentes (erreurs de transcription).\n"
        "3. Cree une belle mise en page en Markdown adaptee au type de contenu :\n"
        "   - Reunion : titre, participants si mentionnes, sections par sujet, points d'action\n"
        "   - Cours/Conference : titre, plan structure avec titres et sous-titres\n"
        "   - Interview/Podcast : identification des locuteurs si possible, paragraphes\n"
        "   - Monologue/Note vocale : paragraphes logiques avec titres si pertinent\n"
        "4. Ajoute des sauts de ligne et paragraphes pour la lisibilite.\n"
        "5. Utilise des titres Markdown (## ###) pour structurer.\n"
        "6. Si tu identifies des locuteurs, mets-les en **gras**.\n\n"
        "IMPORTANT: Retourne UNIQUEMENT le texte formate en Markdown, sans aucun JSON, sans ```markdown```, "
        "sans explication. Juste le texte mis en page."
    )

    llm_result = await analyze_transcript_via_backend(prompt, raw_text, backend_id)

    # The LLM may return a dict with "content" key or the text directly
    if isinstance(llm_result, dict):
        formatted = llm_result.get("content", llm_result.get("text", json.dumps(llm_result, ensure_ascii=False)))
    else:
        formatted = str(llm_result)

    return {"formatted_text": formatted}


# ── Export ─────────────────────────────────────────────────

@app.get("/api/transcriptions/{id}/export/{format}")
async def export_transcription(id: str, format: str, db: AsyncSession = Depends(get_db)):
    # Gate export by format (PDF and TXT are free for all users)
    free_export_formats = {"pdf", "txt"}
    if format not in free_export_formats:
        export_feature = f"export_{format}"
        await require_feature_check(db, export_feature)
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    analyses_result = await db.execute(select(Analysis).where(Analysis.transcription_id == id))
    analyses = analyses_result.scalars().all()

    filename = f"{id}.{format}"
    path = os.path.join(EXPORT_DIR, filename)

    if format == "pdf":
        export_to_pdf(transcription, analyses, path)
        return FileResponse(path, media_type="application/pdf", filename=filename)
    elif format == "srt":
        export_to_srt(transcription, path)
        return FileResponse(path, media_type="text/plain", filename=filename)
    elif format == "vtt":
        export_to_vtt(transcription, path)
        return FileResponse(path, media_type="text/vtt", filename=filename)
    elif format == "txt":
        export_to_txt(transcription, path)
        return FileResponse(path, media_type="text/plain", filename=filename)
    elif format == "json":
        export_to_json(transcription, analyses, path)
        return FileResponse(path, media_type="application/json", filename=filename)
    elif format == "md":
        export_to_md(transcription, analyses, path)
        return FileResponse(path, media_type="text/markdown", filename=filename)
    elif format == "pptx":
        export_to_pptx(analyses, path)
        return FileResponse(path, media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation", filename=filename)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


# ── Profiles ──────────────────────────────────────────────

@app.get("/api/profiles", response_model=list[ProfileOut])
async def list_profiles():
    """List all available profiles."""
    return get_all_profiles()


@app.get("/api/profiles/{profile_id}", response_model=ProfileOut)
async def get_profile_detail(profile_id: str):
    """Get a specific profile with its analyses config."""
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    return profile


@app.get("/api/profiles/{profile_id}/analyses")
async def get_profile_analyses_endpoint(profile_id: str):
    """Get the list of analyses for a profile."""
    analyses = get_profile_analyses(profile_id)
    if not analyses:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    return analyses


@app.post("/api/profiles/reload")
async def reload_profiles_endpoint():
    """Reload profiles from disk (hot reload)."""
    reload_profiles()
    profiles = get_all_profiles()
    return {"status": "reloaded", "profiles": [p["id"] for p in profiles]}


# ── Queue ─────────────────────────────────────────────────

@app.get("/api/queue")
async def get_queue(db: AsyncSession = Depends(get_db)):
    """Get the current processing queue with positions and estimates."""
    return await get_queue_status(db)


@app.put("/api/jobs/{job_id}/priority")
async def change_priority(job_id: str, body: PriorityUpdate, db: AsyncSession = Depends(get_db)):
    """Change priority of a pending job."""
    if body.priority not in ("P0", "P1", "P2"):
        raise HTTPException(status_code=400, detail="Priority must be P0, P1, or P2")
    success = await update_job_priority(job_id, body.priority, db)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or not in pending state")
    return {"status": "updated", "priority": body.priority}


@app.post("/api/jobs/{job_id}/retry")
async def retry_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Retry a failed job."""
    job = await retry_failed_job(job_id, db)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not in failed state")
    # Re-trigger background transcription
    async def _bg_retry(jid=job.id, prof=job.profile):
        async with AsyncSessionLocal() as bg_db:
            await transcribe_audio(jid, bg_db, profile=prof)
    asyncio.create_task(_bg_retry())
    return {"status": "retrying", "job_id": job.id}


# ── Speakers ──────────────────────────────────────────────

@app.get("/api/transcriptions/{id}/speakers", response_model=list[SpeakerLabelOut])
async def get_speakers(id: str, db: AsyncSession = Depends(get_db)):
    """Get speaker labels for a transcription."""
    result = await db.execute(select(SpeakerLabel).where(SpeakerLabel.transcription_id == id))
    return result.scalars().all()


@app.put("/api/transcriptions/{id}/speakers")
async def update_speakers(id: str, body: SpeakerLabelUpdate, db: AsyncSession = Depends(get_db)):
    """Update speaker labels. Body: {"speakers": {"Speaker 1": "Dr Dupont", "Speaker 2": "Patient"}}"""
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    # Delete existing labels
    existing = await db.execute(select(SpeakerLabel).where(SpeakerLabel.transcription_id == id))
    for label in existing.scalars().all():
        await db.delete(label)

    # Create new labels
    labels = []
    for speaker_id, display_name in body.speakers.items():
        label = SpeakerLabel(
            transcription_id=id,
            speaker_id=speaker_id,
            display_name=display_name,
        )
        db.add(label)
        labels.append({"speaker_id": speaker_id, "display_name": display_name})

    await db.commit()
    return {"status": "updated", "speakers": labels}


# ── Dictionaries ──────────────────────────────────────────

@app.get("/api/dictionaries", response_model=list[DictionaryOut])
async def list_dictionaries(db: AsyncSession = Depends(get_db)):
    """List all user dictionaries."""
    return await get_all_dictionaries(db)


@app.post("/api/dictionaries", response_model=DictionaryOut, status_code=201)
async def create_dict(body: DictionaryCreate, db: AsyncSession = Depends(get_db)):
    return await create_dictionary(body.name, body.description, db)


@app.get("/api/dictionaries/{dictionary_id}", response_model=DictionaryOut)
async def get_dict(dictionary_id: str, db: AsyncSession = Depends(get_db)):
    d = await get_dictionary(dictionary_id, db)
    if not d:
        raise HTTPException(status_code=404, detail="Dictionary not found")
    return d


@app.delete("/api/dictionaries/{dictionary_id}", status_code=204)
async def delete_dict(dictionary_id: str, db: AsyncSession = Depends(get_db)):
    success = await delete_dictionary(dictionary_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Dictionary not found")


@app.get("/api/dictionaries/{dictionary_id}/entries", response_model=list[DictionaryEntryOut])
async def list_entries(dictionary_id: str, db: AsyncSession = Depends(get_db)):
    return await get_dictionary_entries(dictionary_id, db)


@app.post("/api/dictionaries/{dictionary_id}/entries", response_model=DictionaryEntryOut, status_code=201)
async def create_entry(dictionary_id: str, body: DictionaryEntryCreate, db: AsyncSession = Depends(get_db)):
    d = await get_dictionary(dictionary_id, db)
    if not d:
        raise HTTPException(status_code=404, detail="Dictionary not found")
    return await add_entry(dictionary_id, body.term, body.replacement, body.category, db)


@app.delete("/api/dictionaries/{dictionary_id}/entries/{entry_id}", status_code=204)
async def remove_entry(dictionary_id: str, entry_id: str, db: AsyncSession = Depends(get_db)):
    success = await delete_entry(entry_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Entry not found")


# ── Audio Presets ─────────────────────────────────────────

@app.get("/api/presets", response_model=list[AudioPresetOut])
async def list_presets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AudioPreset).order_by(AudioPreset.created_at.desc()))
    return result.scalars().all()


@app.post("/api/presets", response_model=AudioPresetOut, status_code=201)
async def create_preset(body: AudioPresetCreate, db: AsyncSession = Depends(get_db)):
    await require_feature_check(db, "presets")
    preset = AudioPreset(
        name=body.name, description=body.description,
        profile_id=body.profile_id, audio_type=body.audio_type,
        vad_sensitivity=body.vad_sensitivity, min_silence_ms=body.min_silence_ms,
        dictionary_id=body.dictionary_id,
    )
    db.add(preset)
    await db.commit()
    await db.refresh(preset)
    return preset


@app.get("/api/presets/{preset_id}", response_model=AudioPresetOut)
async def get_preset(preset_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AudioPreset).where(AudioPreset.id == preset_id))
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return preset


@app.put("/api/presets/{preset_id}", response_model=AudioPresetOut)
async def update_preset(preset_id: str, body: AudioPresetUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AudioPreset).where(AudioPreset.id == preset_id))
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    for field in ["name", "description", "profile_id", "audio_type", "vad_sensitivity", "min_silence_ms", "dictionary_id"]:
        val = getattr(body, field, None)
        if val is not None:
            setattr(preset, field, val)
    await db.commit()
    await db.refresh(preset)
    return preset


@app.delete("/api/presets/{preset_id}", status_code=204)
async def delete_preset(preset_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AudioPreset).where(AudioPreset.id == preset_id))
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    await db.delete(preset)
    await db.commit()


@app.get("/api/audio-types")
async def list_audio_types():
    """List available audio type profiles."""
    return get_audio_type_profiles()


# ── Corrections ───────────────────────────────────────────

@app.post("/api/transcriptions/{id}/corrections", response_model=CorrectionOut, status_code=201)
async def post_correction(id: str, body: CorrectionCreate, db: AsyncSession = Depends(get_db)):
    """Save a user correction (transcription, speaker name, analysis field)."""
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Transcription not found")
    return await save_correction(id, body.original_text, body.corrected_text, body.field_type, db)


@app.get("/api/corrections", response_model=list[CorrectionOut])
async def list_corrections(db: AsyncSession = Depends(get_db)):
    """List recent user corrections."""
    return await get_corrections(db)


# ── v5.x: Confidence & Key Moments ─────────────────────

@app.get("/api/transcriptions/{id}/confidence", response_model=ConfidenceInfo)
async def get_confidence(id: str, db: AsyncSession = Depends(get_db)):
    """Get confidence scores and micro-tip for a transcription."""
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Transcription not found")
    # Use cached scores or compute
    if t.confidence_scores:
        scores = t.confidence_scores
    else:
        scores = compute_confidence_scores(t.segments or [], t.audio_type)
        t.confidence_scores = scores
        await db.commit()
    tip = get_micro_tip(t.audio_type, t.profile or "generic")
    return ConfidenceInfo(scores=scores, micro_tip=tip)


@app.get("/api/transcriptions/{id}/key-moments", response_model=list[KeyMomentOut])
async def get_key_moments(id: str, db: AsyncSession = Depends(get_db)):
    """Extract 5 key moments from the transcription using LLM."""
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Transcription not found")
    # Check if key_moments analysis already exists
    existing = await db.execute(
        select(Analysis).where(Analysis.transcription_id == id, Analysis.type == "key_moments")
    )
    analysis = existing.scalar_one_or_none()
    if analysis and analysis.content and isinstance(analysis.content, dict) and "moments" in analysis.content:
        return analysis.content["moments"]
    # Generate via LLM with a dedicated prompt
    from app.services.llm_service import _call_ollama_async
    prompt = (
        "Extrais les 5 moments les plus importants de cette transcription. "
        "Pour chaque moment, donne un index (numero), le temps de debut (start) et fin (end) en secondes, "
        "le texte exact du passage, et la raison pour laquelle c'est important. "
        "Return valid JSON only: {\"moments\": [{\"index\": 0, \"start\": 0.0, \"end\": 10.0, \"text\": \"...\", \"reason\": \"...\"}]}"
    )
    # Build segment text with timestamps for better LLM context
    if t.segments:
        transcript_text = "\n".join(
            f"[{s['start']:.1f}s - {s['end']:.1f}s] {s['text']}" for s in t.segments
        )
    else:
        transcript_text = t.text or ""
    content = await _call_ollama_async(prompt, transcript_text[:4000])
    moments = []
    if isinstance(content, dict) and "moments" in content:
        moments = content["moments"]
    # Save as analysis for caching
    if analysis:
        analysis.content = {"moments": moments}
    else:
        new_analysis = Analysis(
            transcription_id=id,
            type="key_moments",
            content={"moments": moments},
        )
        db.add(new_analysis)
    await db.commit()
    return moments


# ── v5.x: User Preferences ──────────────────────────────

@app.get("/api/preferences", response_model=UserPreferencesOut)
async def get_preferences(db: AsyncSession = Depends(get_db)):
    """Get user preferences (single-user mode)."""
    result = await db.execute(select(UserPreferences).where(UserPreferences.id == "default"))
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = UserPreferences(id="default")
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return prefs


@app.put("/api/preferences", response_model=UserPreferencesOut)
async def update_preferences(data: UserPreferencesUpdate, db: AsyncSession = Depends(get_db)):
    """Update user preferences."""
    result = await db.execute(select(UserPreferences).where(UserPreferences.id == "default"))
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = UserPreferences(id="default")
        db.add(prefs)
        await db.flush()
    if data.summary_detail and data.summary_detail in ("short", "balanced", "detailed"):
        prefs.summary_detail = data.summary_detail
    if data.summary_tone and data.summary_tone in ("formal", "neutral", "friendly"):
        prefs.summary_tone = data.summary_tone
    if data.default_profile:
        prefs.default_profile = data.default_profile
    if data.default_priority and data.default_priority in ("P0", "P1", "P2"):
        prefs.default_priority = data.default_priority
    if data.default_preset_id is not None:
        prefs.default_preset_id = data.default_preset_id or None
    await db.commit()
    await db.refresh(prefs)
    return prefs


# ── v6: LLM Model Selection ──────────────────────────────

@app.get("/api/llm/models")
async def llm_models():
    """List available Ollama models."""
    models = list_ollama_models()
    current = get_model()
    return {"current": current, "models": models}


@app.put("/api/llm/model")
async def change_model(body: dict):
    """Change the active LLM model."""
    model_name = body.get("model")
    if not model_name:
        raise HTTPException(status_code=400, detail="Missing 'model' field")
    # Verify model exists
    models = list_ollama_models()
    available = [m["name"] for m in models]
    if model_name not in available:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not available. Available: {available}")
    set_model(model_name)
    return {"model": model_name, "status": "ok"}


# ── v7: Whisper Info ────────────────────────────────────


@app.get("/api/whisper/info")
async def whisper_info():
    """Get current Whisper STT model configuration."""
    import torch as _torch
    from app.services.transcription_service import get_whisper_model_name, get_dictation_model_name, VALID_WHISPER_MODELS
    gpu_available = _torch.cuda.is_available()
    gpu_name = _torch.cuda.get_device_name(0) if gpu_available else None
    return {
        "transcription_model": get_whisper_model_name(),
        "dictation_model": get_dictation_model_name(),
        "device": "cuda" if gpu_available else "cpu",
        "compute_type": "float16" if gpu_available else "int8",
        "gpu_available": gpu_available,
        "gpu_name": gpu_name,
        "available_models": [
            {"name": "large-v3", "description": "Meilleure qualite, plus lent", "size_gb": 3.1, "recommended_for": "transcription"},
            {"name": "large-v2", "description": "Stable, tres bonne qualite", "size_gb": 3.1, "recommended_for": "transcription"},
            {"name": "medium", "description": "Bon compromis qualite/vitesse", "size_gb": 1.5, "recommended_for": "transcription"},
            {"name": "small", "description": "Rapide, qualite correcte", "size_gb": 0.5, "recommended_for": "dictation"},
            {"name": "base", "description": "Tres rapide, qualite basique", "size_gb": 0.1, "recommended_for": "dictation"},
            {"name": "tiny", "description": "Ultra rapide, qualite minimale", "size_gb": 0.04, "recommended_for": "test"},
        ],
        "valid_models": VALID_WHISPER_MODELS,
    }


@app.put("/api/whisper/model")
async def change_whisper_model(body: dict):
    """Change Whisper model at runtime. Model reloads on next transcription."""
    from app.services.transcription_service import set_whisper_model, VALID_WHISPER_MODELS, get_whisper_model_name, get_dictation_model_name
    transcription_model = body.get("transcription_model")
    dictation_model = body.get("dictation_model")
    if transcription_model and transcription_model not in VALID_WHISPER_MODELS:
        raise HTTPException(status_code=400, detail=f"Modele invalide '{transcription_model}'. Valides: {VALID_WHISPER_MODELS}")
    if dictation_model and dictation_model not in VALID_WHISPER_MODELS:
        raise HTTPException(status_code=400, detail=f"Modele invalide '{dictation_model}'. Valides: {VALID_WHISPER_MODELS}")
    set_whisper_model(transcription_model=transcription_model, dictation_model=dictation_model)
    return {
        "status": "ok",
        "transcription_model": get_whisper_model_name(),
        "dictation_model": get_dictation_model_name(),
    }


@app.get("/api/openai/models")
async def get_openai_models():
    """List available OpenAI models and current selection."""
    from app.services.llm_backends import get_openai_model, VALID_OPENAI_MODELS
    return {
        "current": get_openai_model(),
        "models": VALID_OPENAI_MODELS,
        "configured": bool(os.environ.get("OPENAI_LLM_API_KEY")),
    }


@app.put("/api/openai/model")
async def change_openai_model(body: dict):
    """Change OpenAI LLM model."""
    from app.services.llm_backends import set_openai_model, get_openai_model, VALID_OPENAI_MODEL_NAMES
    model = body.get("model")
    if not model:
        raise HTTPException(status_code=400, detail="Missing 'model' field")
    if model not in VALID_OPENAI_MODEL_NAMES:
        raise HTTPException(status_code=400, detail=f"Modele invalide '{model}'. Valides: {VALID_OPENAI_MODEL_NAMES}")
    set_openai_model(model)
    return {"status": "ok", "model": get_openai_model()}


# ── v7: Audio/LLM Backends ──────────────────────────────


@app.get("/api/backends")
async def list_backends():
    """List available STT and LLM backends with their config per mode."""
    from app.services.stt_backends import _load_config as _stt_config
    config = _stt_config()
    return {
        "stt": get_stt_backends(),
        "llm": get_llm_backends(),
        "modes": config.get("modes", {}),
    }


@app.put("/api/backends/mode/{mode_id}")
async def update_mode_backends(mode_id: str, body: dict):
    """Update STT/LLM backend for a mode (dev/admin). Changes are in-memory only."""
    from app.services.stt_backends import _load_config
    config = _load_config()
    modes = config.get("modes", {})
    if mode_id not in modes:
        raise HTTPException(status_code=404, detail=f"Unknown mode '{mode_id}'. Valid: {list(modes.keys())}")

    stt = body.get("stt_backend")
    llm = body.get("llm_backend")
    if stt:
        stt_backends = config.get("stt_backends", {})
        if stt not in stt_backends:
            raise HTTPException(status_code=400, detail=f"Unknown STT backend '{stt}'")
        modes[mode_id]["stt_backend"] = stt
    if llm:
        llm_backends = config.get("llm_backends", {})
        if llm not in llm_backends:
            raise HTTPException(status_code=400, detail=f"Unknown LLM backend '{llm}'")
        modes[mode_id]["llm_backend"] = llm

    return {"mode": mode_id, "config": modes[mode_id]}


# ── v6: Dictation ────────────────────────────────────────

@app.post("/api/dictation/start", response_model=DictationSessionOut, status_code=201)
async def start_dictation(data: DictationStartRequest, db: AsyncSession = Depends(get_db)):
    """Start a new dictation session."""
    await require_feature_check(db, "dictation")
    session = await dictation_start(db, profile=data.profile)
    return session


@app.get("/api/dictation/{session_id}", response_model=DictationSessionOut)
async def get_dictation(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get dictation session status."""
    result = await db.execute(
        select(DictationSession).where(DictationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Dictation session not found")
    return session


@app.post("/api/dictation/{session_id}/chunk", response_model=DictationChunkResponse)
async def send_dictation_chunk(
    session_id: str,
    audio: UploadFile = File(...),
    stt_backend: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Send an audio chunk for transcription."""
    audio_data = await audio.read()
    if len(audio_data) > 10 * 1024 * 1024:  # 10 MB max per chunk
        raise HTTPException(status_code=413, detail="Chunk too large (max 10 MB)")
    try:
        result = await dictation_chunk(session_id, audio_data, db, stt_override=stt_backend)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/dictation/{session_id}/pause", response_model=DictationSessionOut)
async def pause_dictation(session_id: str, db: AsyncSession = Depends(get_db)):
    """Pause a dictation session."""
    try:
        return await dictation_pause(session_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/dictation/{session_id}/resume", response_model=DictationSessionOut)
async def resume_dictation(session_id: str, db: AsyncSession = Depends(get_db)):
    """Resume a paused dictation session."""
    try:
        return await dictation_resume(session_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/dictation/{session_id}/stop", response_model=DictationSessionOut)
async def stop_dictation(session_id: str, db: AsyncSession = Depends(get_db)):
    """Stop and finalize a dictation session."""
    try:
        return await dictation_stop(session_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/dictation/{session_id}/save", response_model=DictationSaveResponse)
async def save_dictation(session_id: str, db: AsyncSession = Depends(get_db)):
    """Save a completed dictation session as a standard Transcription."""
    try:
        result = await dictation_save(session_id, db)
        # Analyses are generated on-demand when user clicks on an analysis tab
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── v7: Plans & Subscriptions ────────────────────────────

@app.get("/api/plans", response_model=list[PlanOut])
async def list_plans(db: AsyncSession = Depends(get_db)):
    """List all available plans."""
    result = await db.execute(select(Plan).where(Plan.active == 1))
    return result.scalars().all()


@app.get("/api/subscription")
async def get_subscription(db: AsyncSession = Depends(get_db)):
    """Get current user subscription with plan details."""
    return await get_subscription_info(db)


@app.put("/api/subscription/plan")
async def update_subscription_plan(body: dict, db: AsyncSession = Depends(get_db)):
    """Change subscription plan. If Stripe configured, creates checkout session."""
    plan_id = body.get("plan_id")
    if not plan_id:
        raise HTTPException(status_code=400, detail="Missing 'plan_id'")
    try:
        # Look up plan details
        result = await db.execute(select(Plan).where(Plan.id == plan_id, Plan.active == 1))
        plan = result.scalar_one_or_none()
        if not plan:
            raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")

        # Free plan: apply immediately (no payment needed)
        if plan.price_cents == 0:
            await change_plan(db, plan_id)
            return await get_subscription_info(db)

        # Paid plan: route through Stripe if configured
        checkout = await create_plan_checkout(
            plan_id=plan_id,
            plan_name=plan.name,
            price_cents=plan.price_cents,
        )
        if checkout.get("mode") == "stub":
            # Stub mode: apply immediately
            await change_plan(db, plan_id)
            await _log_billing_event(db, "plan.changed", amount_cents=plan.price_cents,
                                     event_data={"plan_id": plan_id})
            return await get_subscription_info(db)
        return checkout
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/subscription/minutes")
async def get_minutes_status(db: AsyncSession = Depends(get_db)):
    """Check minutes availability."""
    return await check_minutes_available(db)


@app.post("/api/subscription/add-minutes")
async def buy_extra_minutes(body: AddMinutesRequest, db: AsyncSession = Depends(get_db)):
    """Buy extra minutes pack. If Stripe configured, creates checkout session."""
    try:
        packs = get_extra_packs()
        pack_info = packs.get(body.pack)
        if not pack_info:
            raise HTTPException(status_code=400, detail=f"Unknown pack '{body.pack}'")

        checkout = await create_pack_checkout(
            pack_id=body.pack,
            minutes=pack_info["minutes"],
            price_cents=pack_info["price_cents"],
        )
        if checkout.get("mode") == "stub":
            result = await add_extra_minutes(db, body.pack)
            await _log_billing_event(db, "pack.purchased", amount_cents=pack_info["price_cents"],
                                     event_data={"pack": body.pack, "minutes": pack_info["minutes"]})
            return result
        return checkout
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/subscription/extra-packs")
async def list_extra_packs():
    """List available extra minute packs."""
    packs = get_extra_packs()
    return [
        {"pack": k, "minutes": v["minutes"], "price_cents": v["price_cents"]}
        for k, v in packs.items()
    ]


@app.get("/api/subscription/alerts")
async def subscription_alerts(db: AsyncSession = Depends(get_db)):
    """Check quota usage and return alerts (warning at 75%, critical at 90%)."""
    return await get_subscription_alerts(db)


@app.get("/api/subscription/features")
async def subscription_features(db: AsyncSession = Depends(get_db)):
    """Get features available for the current plan."""
    return await get_plan_features(db)


# ── v7: One-Shot ─────────────────────────────────────────

@app.get("/api/oneshot/tiers")
async def list_oneshot_tiers():
    """List one-shot pricing tiers."""
    tiers = get_oneshot_tiers()
    return [
        {
            "tier": k,
            "label": f"Fichier {k.lower()}" if k != "Court" else "Fichier court",
            "max_duration_minutes": v["max_duration_minutes"],
            "price_cents": v["price_cents"],
            "includes": v["includes"],
        }
        for k, v in tiers.items()
    ]


@app.post("/api/oneshot/estimate")
async def estimate_oneshot(body: dict):
    """Estimate one-shot price for a given duration."""
    duration = body.get("duration_seconds", 0)
    if not duration or duration <= 0:
        raise HTTPException(status_code=400, detail="Missing or invalid 'duration_seconds'")
    if duration > 5400:  # 90 minutes
        raise HTTPException(
            status_code=400,
            detail="La durée maximale pour un one-shot est de 90 minutes. "
                   "Pour des fichiers plus longs, souscrivez un abonnement.",
        )
    return estimate_oneshot_tier(duration)


@app.post("/api/oneshot/order")
async def create_oneshot(body: dict, db: AsyncSession = Depends(get_db)):
    """Create a one-shot order. If Stripe configured, creates checkout session."""
    tier = body.get("tier")
    if not tier:
        raise HTTPException(status_code=400, detail="Missing 'tier'")
    duration = body.get("duration_seconds")
    try:
        # Create the order first (pending status)
        order = await create_oneshot_order(db, tier, duration)

        tiers = get_oneshot_tiers()
        tier_info = tiers.get(tier)
        if not tier_info:
            raise HTTPException(status_code=400, detail=f"Unknown tier '{tier}'")

        checkout = await create_oneshot_checkout(
            order_id=order.id,
            tier=tier,
            price_cents=tier_info["price_cents"],
            includes=tier_info["includes"],
        )
        if checkout.get("mode") == "stub":
            # Stub: order already auto-paid by create_oneshot_order
            await _log_billing_event(db, "oneshot.purchased", amount_cents=tier_info["price_cents"],
                                     event_data={"tier": tier, "order_id": order.id})
            return order
        # Stripe: return checkout URL, order stays pending until webhook
        return {
            "order_id": order.id,
            "checkout_url": checkout["checkout_url"],
            "session_id": checkout["session_id"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/oneshot/order/{order_id}/link")
async def link_oneshot(order_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    """Link a one-shot order to a transcription after processing."""
    transcription_id = body.get("transcription_id")
    if not transcription_id:
        raise HTTPException(status_code=400, detail="Missing 'transcription_id'")
    try:
        return await link_oneshot_to_transcription(db, order_id, transcription_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/oneshot/upload", response_model=JobOut, status_code=202)
async def oneshot_upload(
    file: UploadFile = File(...),
    tier: str = Form(...),
    profile: str = Form("generic"),
    language: Optional[str] = Form(None),
    stt_backend: Optional[str] = Form(None),
    llm_backend: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """One-shot upload: create order + upload + transcribe in one step.
    Bypasses subscription feature gating (oneshot is pre-paid).
    """
    # Validate tier
    tiers = get_oneshot_tiers()
    if tier not in tiers:
        raise HTTPException(status_code=400, detail=f"Palier inconnu : '{tier}'")

    # Validate file
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Type de fichier non supporte : {ext}")

    # Save file
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    file_location = os.path.join(UPLOAD_DIR, safe_name)
    total_size = 0
    chunk_size = 8 * 1024 * 1024
    with open(file_location, "wb") as buffer:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE:
                buffer.close()
                os.remove(file_location)
                raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 2 Go)")
            buffer.write(chunk)

    logger.info(f"Oneshot upload: {safe_name} ({total_size / (1024*1024):.1f} MB), tier={tier}")

    # Validate profile
    available = get_all_profiles()
    valid_ids = {p["id"] for p in available}
    if profile not in valid_ids:
        profile = "generic"

    # Estimate duration from file size (rough: 1 MB ~ 1 min audio)
    estimated_duration = max(60, (total_size / (1024 * 1024)) * 60)

    # Create oneshot order (stub: auto-paid)
    try:
        order = await create_oneshot_order(db, tier, estimated_duration)
    except ValueError as e:
        os.remove(file_location)
        raise HTTPException(status_code=400, detail=str(e))

    tier_info = tiers[tier]
    checkout = await create_oneshot_checkout(
        order_id=order.id, tier=tier, price_cents=tier_info["price_cents"],
        includes=tier_info["includes"],
    )
    if checkout.get("mode") == "stub":
        await _log_billing_event(db, "oneshot.purchased", amount_cents=tier_info["price_cents"],
                                 event_data={"tier": tier, "order_id": order.id})

    # Create job with source_type="oneshot"
    num_analyses = len(get_profile_analyses(profile)) or 9
    est_seconds = estimate_processing_time(total_size, num_analyses)
    job = Job(
        status="pending", file_path=file_location, profile=profile,
        priority="P1", estimated_seconds=est_seconds, source_type="oneshot",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Start transcription in background with oneshot_order_id
    async def _bg_oneshot(job_id=job.id, prof=profile, lang=language,
                          stt_ov=stt_backend, llm_ov=llm_backend, oid=order.id):
        async with AsyncSessionLocal() as bg_db:
            await transcribe_audio(job_id, bg_db, profile=prof, language=lang,
                                   stt_override=stt_ov, llm_override=llm_ov,
                                   mode_id="file_upload", oneshot_order_id=oid)
    asyncio.create_task(_bg_oneshot())
    return job


# ── v7: Stripe Webhook ──────────────────────────────────


async def _log_billing_event(
    db: AsyncSession,
    event_type: str,
    stripe_event_id: str = None,
    stripe_session_id: str = None,
    amount_cents: int = None,
    event_data: dict = None,
    status: str = "success",
):
    """Log a billing event for audit trail."""
    event = BillingEvent(
        event_type=event_type,
        stripe_event_id=stripe_event_id,
        stripe_session_id=stripe_session_id,
        amount_cents=amount_cents,
        event_data=event_data,
        status=status,
    )
    db.add(event)
    await db.commit()
    return event


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhook events (idempotent)."""
    client_ip = request.client.host if request.client else "unknown"
    if _check_rate_limit(client_ip, "webhook"):
        raise HTTPException(status_code=429, detail="Too many requests")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = verify_webhook_signature(payload, sig_header)
    except ValueError as e:
        logger.warning(f"Stripe webhook signature failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_id = event.get("id")
    event_type = event.get("type")
    logger.info(f"Stripe webhook: {event_type} ({event_id})")

    # Idempotency check: skip if already processed
    existing = await db.execute(
        select(BillingEvent).where(BillingEvent.stripe_event_id == event_id)
    )
    if existing.scalar_one_or_none():
        logger.info(f"Webhook {event_id} already processed, skipping")
        await _log_billing_event(db, f"webhook.{event_type}", stripe_event_id=f"{event_id}_dup",
                                 status="duplicate")
        return {"status": "duplicate"}

    if event_type == "checkout.session.completed":
        checkout_data = extract_checkout_metadata(event)
        checkout_type = checkout_data.get("type")
        meta = checkout_data.get("metadata", {})

        if checkout_type == "oneshot":
            order_id = meta.get("order_id")
            if order_id:
                result = await db.execute(
                    select(OneshotOrder).where(OneshotOrder.id == order_id)
                )
                order = result.scalar_one_or_none()
                if order and order.payment_status == "pending":
                    order.payment_status = "paid"
                    order.stripe_session_id = checkout_data.get("session_id")
                    await db.commit()
                    logger.info(f"One-shot order {order_id} marked as paid")

        elif checkout_type == "extra_pack":
            pack_id = meta.get("pack_id")
            if pack_id:
                await add_extra_minutes(db, pack_id)
                logger.info(f"Extra pack {pack_id} applied")

        elif checkout_type == "plan_upgrade":
            plan_id = meta.get("plan_id")
            if plan_id:
                await change_plan(db, plan_id)
                logger.info(f"Plan changed to {plan_id}")

        await _log_billing_event(
            db, f"webhook.{event_type}",
            stripe_event_id=event_id,
            stripe_session_id=checkout_data.get("session_id"),
            amount_cents=checkout_data.get("amount_total"),
            event_data=meta,
        )
    else:
        await _log_billing_event(db, f"webhook.{event_type}", stripe_event_id=event_id)

    return {"status": "ok"}


# ── v7: Usage & Metrics ─────────────────────────────────

@app.get("/api/usage/summary")
async def usage_summary(db: AsyncSession = Depends(get_db)):
    """Get usage summary for the current billing period."""
    return await get_usage_summary(db)


@app.get("/api/usage/logs", response_model=list[UsageLogOut])
async def usage_logs(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Get recent usage logs."""
    return await get_usage_logs(db, limit=limit)


# ── RGPD / Data Privacy ─────────────────────────────────

@app.get("/api/account/export")
async def export_account_data(db: AsyncSession = Depends(get_db), user_id: str = "default"):
    """RGPD Art. 20 — Export all user data as JSON."""
    # Subscription
    sub_info = await get_subscription_info(db, user_id)

    # Transcriptions with analyses
    trans_result = await db.execute(
        select(Transcription).join(Job, Transcription.job_id == Job.id)
    )
    transcriptions = trans_result.scalars().all()
    transcriptions_data = []
    for t in transcriptions:
        analyses_result = await db.execute(
            select(Analysis).where(Analysis.transcription_id == t.id)
        )
        analyses = analyses_result.scalars().all()
        transcriptions_data.append({
            "id": t.id,
            "filename": t.filename,
            "text": t.text,
            "language": t.language,
            "duration": t.duration,
            "profile": t.profile,
            "created_at": str(t.created_at) if t.created_at else None,
            "analyses": [
                {"type": a.type, "content": a.content, "created_at": str(a.created_at) if a.created_at else None}
                for a in analyses
            ],
        })

    # Usage logs
    usage_result = await db.execute(
        select(UsageLog).where(UsageLog.user_id == user_id).order_by(UsageLog.created_at.desc())
    )
    usage_logs = usage_result.scalars().all()
    usage_data = [
        {
            "id": u.id,
            "audio_duration_seconds": u.audio_duration_seconds,
            "minutes_charged": u.minutes_charged,
            "minute_source": u.minute_source,
            "source_type": u.source_type,
            "profile_used": u.profile_used,
            "created_at": str(u.created_at) if u.created_at else None,
        }
        for u in usage_logs
    ]

    # Oneshot orders
    orders_result = await db.execute(
        select(OneshotOrder).where(OneshotOrder.user_id == user_id)
    )
    orders = orders_result.scalars().all()
    orders_data = [
        {
            "id": o.id,
            "tier": o.tier,
            "price_cents": o.price_cents,
            "payment_status": o.payment_status,
            "created_at": str(o.created_at) if o.created_at else None,
        }
        for o in orders
    ]

    # Billing events
    billing_result = await db.execute(
        select(BillingEvent).where(BillingEvent.user_id == user_id)
    )
    billing_events = billing_result.scalars().all()
    billing_data = [
        {
            "id": b.id,
            "event_type": b.event_type,
            "amount_cents": b.amount_cents,
            "status": b.status,
            "created_at": str(b.created_at) if b.created_at else None,
        }
        for b in billing_events
    ]

    # Preferences
    prefs_result = await db.execute(
        select(UserPreferences).where(UserPreferences.id == user_id)
    )
    prefs = prefs_result.scalar_one_or_none()
    prefs_data = None
    if prefs:
        prefs_data = {
            "summary_detail": prefs.summary_detail,
            "summary_tone": prefs.summary_tone,
            "default_profile": prefs.default_profile,
        }

    # Dictionaries
    dict_result = await db.execute(select(UserDictionary))
    dicts = dict_result.scalars().all()
    dicts_data = []
    for d in dicts:
        entries_result = await db.execute(
            select(DictionaryEntry).where(DictionaryEntry.dictionary_id == d.id)
        )
        entries = entries_result.scalars().all()
        dicts_data.append({
            "id": d.id,
            "name": d.name,
            "entries": [{"term": e.term, "replacement": e.replacement, "category": e.category} for e in entries],
        })

    return {
        "export_date": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "subscription": sub_info,
        "transcriptions": transcriptions_data,
        "usage_logs": usage_data,
        "oneshot_orders": orders_data,
        "billing_events": billing_data,
        "preferences": prefs_data,
        "dictionaries": dicts_data,
    }


@app.delete("/api/account", status_code=200)
async def delete_account_data(db: AsyncSession = Depends(get_db), user_id: str = "default"):
    """RGPD Art. 17 — Delete all user data (right to erasure).

    Returns a summary of what was deleted. Audio files on disk are also removed.

    NOTE: Single-user assumption — Job, Transcription, UserDictionary,
    UserCorrection, AudioPreset, and DictationSession have no user_id column,
    so we delete ALL rows.  This is correct while user_id is always "default".
    TODO: When multi-user support is added, add user_id columns to these models
    and filter every DELETE/SELECT below by user_id.
    """
    deleted = {}

    # 1. Delete billing events
    result = await db.execute(delete(BillingEvent).where(BillingEvent.user_id == user_id))
    deleted["billing_events"] = result.rowcount

    # 2. Delete usage logs
    result = await db.execute(delete(UsageLog).where(UsageLog.user_id == user_id))
    deleted["usage_logs"] = result.rowcount

    # 3. Delete oneshot orders
    result = await db.execute(delete(OneshotOrder).where(OneshotOrder.user_id == user_id))
    deleted["oneshot_orders"] = result.rowcount

    # 4. Delete transcriptions via ORM (cascade deletes analyses, chat_messages, chapters, translations, speaker_labels)
    trans_result = await db.execute(select(Transcription))
    transcriptions = trans_result.scalars().all()
    audio_files = []
    for t in transcriptions:
        job_result = await db.execute(select(Job).where(Job.id == t.job_id))
        job = job_result.scalar_one_or_none()
        if job and job.file_path and os.path.exists(job.file_path):
            audio_files.append(job.file_path)
        await db.delete(t)
    deleted["transcriptions"] = len(transcriptions)

    # 5. Delete jobs
    result = await db.execute(delete(Job))
    deleted["jobs"] = result.rowcount

    # 6. Delete user corrections
    result = await db.execute(delete(UserCorrection))
    deleted["corrections"] = result.rowcount

    # 7. Delete dictionaries via ORM (cascade deletes entries)
    dict_result = await db.execute(select(UserDictionary))
    dictionaries = dict_result.scalars().all()
    for d in dictionaries:
        await db.delete(d)
    deleted["dictionaries"] = len(dictionaries)

    # 8. Delete audio presets
    result = await db.execute(delete(AudioPreset))
    deleted["presets"] = result.rowcount

    # 9. Delete preferences
    result = await db.execute(delete(UserPreferences).where(UserPreferences.id == user_id))
    deleted["preferences"] = result.rowcount

    # 10. Delete subscriptions
    result = await db.execute(delete(UserSubscription).where(UserSubscription.user_id == user_id))
    deleted["subscriptions"] = result.rowcount

    # 11. Delete dictation sessions
    result = await db.execute(delete(DictationSession))
    deleted["dictation_sessions"] = result.rowcount

    await db.commit()

    # 12. Delete audio files from disk
    files_deleted = 0
    for fpath in audio_files:
        try:
            os.remove(fpath)
            files_deleted += 1
        except OSError:
            logger.warning(f"Could not delete audio file: {fpath}")
    deleted["audio_files"] = files_deleted

    logger.info(f"Account data deleted for user {user_id}: {deleted}")
    return {"status": "deleted", "user_id": user_id, "deleted": deleted}


# ── Admin ────────────────────────────────────────────────

@app.get("/api/admin/stats")
async def admin_stats(db: AsyncSession = Depends(get_db)):
    """Admin dashboard — aggregate platform statistics."""
    from app.services.admin_service import get_admin_stats
    return await get_admin_stats(db)


@app.get("/api/admin/queue")
async def admin_queue(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Admin — current job queue."""
    from app.services.admin_service import get_queue_jobs
    return await get_queue_jobs(db, limit=limit)


@app.get("/api/admin/billing")
async def admin_billing(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Admin — recent billing events."""
    from app.services.admin_service import get_recent_billing_events
    return await get_recent_billing_events(db, limit=limit)


@app.get("/api/admin/backends")
async def admin_backends():
    """Admin — backends health check."""
    from app.services.admin_service import get_backends_health
    return await get_backends_health()


# ── Health ───────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "7.1"}

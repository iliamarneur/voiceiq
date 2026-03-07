import os
import shutil
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form, Query
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
    await init_db()
    reload_profiles()
    logger.info("VoiceIQ v6.0 API ready (multi-entrees)")
    yield


app = FastAPI(title="VoiceIQ v6.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads dir is created at startup via lifespan


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
    db: AsyncSession = Depends(get_db),
):
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

    async def _bg_transcribe(job_id: str, prof: str):
        async with AsyncSessionLocal() as bg_db:
            await transcribe_audio(job_id, bg_db, profile=prof)
    asyncio.create_task(_bg_transcribe(job.id, profile))
    return job


@app.post("/api/upload/batch", status_code=202)
async def upload_batch(
    files: List[UploadFile] = File(...),
    profile: str = Form("generic"),
    priority: str = Form("P1"),
    preset_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Upload multiple audio files at once."""
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
        async def _bg(jid=j["id"], prof=profile):
            async with AsyncSessionLocal() as bg_db:
                await transcribe_audio(jid, bg_db, profile=prof)
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
    content = await regenerate_analysis(id, type, db, instructions)
    if content is None:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return {"status": "done", "type": type, "content": content}


# ── Chat ──────────────────────────────────────────────────

@app.post("/api/transcriptions/{id}/chat")
async def chat_endpoint(id: str, body: ChatRequest, db: AsyncSession = Depends(get_db)):
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


# ── Export ─────────────────────────────────────────────────

@app.get("/api/transcriptions/{id}/export/{format}")
async def export_transcription(id: str, format: str, db: AsyncSession = Depends(get_db)):
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


# ── v6: Dictation ────────────────────────────────────────

@app.post("/api/dictation/start", response_model=DictationSessionOut, status_code=201)
async def start_dictation(data: DictationStartRequest, db: AsyncSession = Depends(get_db)):
    """Start a new dictation session."""
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
    db: AsyncSession = Depends(get_db),
):
    """Send an audio chunk for transcription."""
    audio_data = await audio.read()
    if len(audio_data) > 10 * 1024 * 1024:  # 10 MB max per chunk
        raise HTTPException(status_code=413, detail="Chunk too large (max 10 MB)")
    try:
        result = await dictation_chunk(session_id, audio_data, db)
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
        # Optionally trigger analyses in background
        async def _bg_analyses():
            async with AsyncSessionLocal() as bg_db:
                from app.services.llm_service import generate_analyses
                session_result = await bg_db.execute(
                    select(DictationSession).where(DictationSession.id == session_id)
                )
                session = session_result.scalar_one_or_none()
                if session and session.transcription_id:
                    await generate_analyses(session.transcription_id, bg_db, profile_id=session.profile)
        asyncio.create_task(_bg_analyses())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Health ───────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "6.0"}

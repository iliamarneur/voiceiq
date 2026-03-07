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
from app.models import Job, Transcription, Analysis, ChatMessage, Chapter, Template, TranslationCache
from app.schemas import (
    JobOut, TranscriptionOut, AnalysisOut, StatsOut,
    ChatMessageOut, ChatRequest, ChapterOut,
    TemplateOut, TemplateCreate, TemplateUpdate,
    TranslateRequest, TranslationOut, GlossaryOut,
    ProfileOut,
)
from app.services.transcription_service import transcribe_audio
from app.services.llm_service import (
    regenerate_analysis, generate_analyses,
    chat_with_transcript, generate_chapters,
    generate_glossary, translate_transcript,
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
    logger.info("VoiceIQ v4.0 API ready (profile-based pipeline)")
    yield


app = FastAPI(title="VoiceIQ v4.0", lifespan=lifespan)
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
async def upload_audio(file: UploadFile = File(...), profile: str = Form("generic"), db: AsyncSession = Depends(get_db)):
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

    job = Job(status="pending", file_path=file_location, profile=profile)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    async def _bg_transcribe(job_id: str, prof: str):
        async with AsyncSessionLocal() as bg_db:
            await transcribe_audio(job_id, bg_db, profile=prof)
    asyncio.create_task(_bg_transcribe(job.id, profile))
    return job


@app.post("/api/upload/batch", status_code=202)
async def upload_batch(files: List[UploadFile] = File(...), profile: str = Form("generic"), db: AsyncSession = Depends(get_db)):
    """Upload multiple audio files at once."""
    jobs = []
    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        safe_name = file.filename.replace("/", "_").replace("\\", "_")
        file_location = os.path.join(UPLOAD_DIR, safe_name)
        # Chunked write for large files
        with open(file_location, "wb") as buffer:
            while True:
                chunk = await file.read(8 * 1024 * 1024)
                if not chunk:
                    break
                buffer.write(chunk)

        job = Job(status="pending", file_path=file_location, profile=profile)
        db.add(job)
        await db.flush()
        await db.refresh(job)
        jobs.append({"id": job.id, "filename": file.filename, "status": "pending"})

    await db.commit()

    # Start all transcriptions in background
    for j in jobs:
        async def _bg(jid=j["id"], prof=profile):
            async with AsyncSessionLocal() as bg_db:
                await transcribe_audio(jid, bg_db, profile=prof)
        asyncio.create_task(_bg())

    return {"jobs": jobs, "total": len(jobs)}


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


# ── Health ───────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "4.0"}

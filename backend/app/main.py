import os
import shutil
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, init_db
from app.models import Job, Transcription, Analysis
from app.schemas import JobOut, TranscriptionOut, AnalysisOut, StatsOut
from app.services.transcription_service import transcribe_audio
from app.services.llm_service import regenerate_analysis, generate_analyses
from app.services.export_service import (
    export_to_pdf, export_to_srt, export_to_vtt,
    export_to_txt, export_to_json, export_to_md, export_to_pptx,
    EXPORT_DIR,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".webm"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(EXPORT_DIR, exist_ok=True)
    await init_db()
    logger.info("Audio-to-Knowledge API ready")
    yield


app = FastAPI(title="Audio-to-Knowledge", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ── Upload & Jobs ──────────────────────────────────────────

@app.post("/api/upload", response_model=JobOut, status_code=202)
async def upload_audio(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    job = Job(status="pending", file_path=file_location)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Run transcription in background with its own DB session
    async def _bg_transcribe(job_id: str):
        async with AsyncSessionLocal() as bg_db:
            await transcribe_audio(job_id, bg_db)
    asyncio.create_task(_bg_transcribe(job.id))
    return job


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

    return {"total": total, "total_duration": total_duration, "languages": languages}


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
    """Delete all existing analyses and regenerate all 9."""
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    # Delete existing analyses
    existing = await db.execute(select(Analysis).where(Analysis.transcription_id == id))
    for a in existing.scalars().all():
        await db.delete(a)
    await db.commit()
    # Regenerate in background
    async def _bg_regen():
        async with AsyncSessionLocal() as bg_db:
            await generate_analyses(id, bg_db)
    asyncio.create_task(_bg_regen())
    return {"status": "regenerating", "message": "All 9 analyses are being regenerated"}


@app.post("/api/transcriptions/{id}/analyses/{type}/regenerate")
async def regenerate(id: str, type: str, db: AsyncSession = Depends(get_db)):
    content = await regenerate_analysis(id, type, db)
    if content is None:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return {"status": "done", "type": type, "content": content}


# ── Chat ──────────────────────────────────────────────────

@app.post("/api/transcriptions/{id}/chat")
async def chat_with_transcript(id: str, body: dict, db: AsyncSession = Depends(get_db)):
    """Chat with a transcription using Ollama."""
    result = await db.execute(select(Transcription).where(Transcription.id == id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    message = body.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    from app.services.llm_service import _ollama, OLLAMA_MODEL
    try:
        response = _ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": f"You are a helpful assistant. Answer questions based on this transcript:\n\n{transcription.text[:6000]}"},
                {"role": "user", "content": message},
            ],
        )
        return {"response": response["message"]["content"]}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}


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
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}. Supported: pdf, srt, vtt, txt, json, md, pptx")

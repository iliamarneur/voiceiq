import asyncio
import logging
import os
import torch
from faster_whisper import WhisperModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Job, Transcription
from app.services.llm_service import generate_analyses

logger = logging.getLogger(__name__)

_model = None


def get_whisper_model():
    global _model
    if _model is None:
        if torch.cuda.is_available():
            logger.info("Loading Whisper large-v3 on GPU (CUDA)")
            _model = WhisperModel("large-v3", device="cuda", compute_type="float16")
        else:
            logger.info("Loading Whisper medium on CPU")
            _model = WhisperModel("medium", device="cpu", compute_type="int8")
    return _model


def _run_whisper(file_path: str):
    """Run Whisper transcription (CPU-bound, runs in thread pool)."""
    model = get_whisper_model()
    segments_iter, info = model.transcribe(
        file_path,
        language=None,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    segments = []
    full_text_parts = []
    for segment in segments_iter:
        segments.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip()
        })
        full_text_parts.append(segment.text.strip())

    full_text = " ".join(full_text_parts)
    return segments, full_text, info


async def transcribe_audio(job_id: str, db: AsyncSession):
    """Background task: transcribe audio file and trigger analyses."""
    try:
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        job.status = "processing"
        await db.commit()

        logger.info(f"Starting transcription for job {job_id}: {job.file_path}")
        file_path = job.file_path

        # Run Whisper in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        segments, full_text, info = await loop.run_in_executor(None, _run_whisper, file_path)

        # Re-fetch the job to ensure fresh state
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            logger.error(f"Job {job_id} disappeared during transcription")
            return

        transcription = Transcription(
            filename=os.path.basename(file_path),
            text=full_text,
            segments=segments,
            language=info.language,
            duration=round(info.duration, 2),
            job_id=job.id,
        )
        db.add(transcription)
        await db.flush()  # Ensure transcription.id is generated

        job.status = "completed"
        job.transcription_id = transcription.id
        await db.commit()

        logger.info(f"Transcription done: {transcription.id} ({len(segments)} segments, {info.language}, {info.duration:.0f}s)")
        logger.info(f"Job {job_id} updated: status=completed, transcription_id={transcription.id}")

        # Trigger LLM analyses
        logger.info(f"Starting 9 AI analyses for {transcription.id}...")
        await generate_analyses(transcription.id, db)
        logger.info(f"All analyses complete for {transcription.id}")

    except Exception as e:
        logger.error(f"Transcription failed for job {job_id}: {e}", exc_info=True)
        try:
            result = await db.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
            if job:
                job.status = "failed"
                await db.commit()
        except Exception as e2:
            logger.error(f"Failed to mark job {job_id} as failed: {e2}")

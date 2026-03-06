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
        # Use GPU if available (you have an RTX 5090), otherwise CPU
        if torch.cuda.is_available():
            logger.info("Loading Whisper large-v3 on GPU (CUDA)")
            _model = WhisperModel("large-v3", device="cuda", compute_type="float16")
        else:
            logger.info("Loading Whisper medium on CPU")
            _model = WhisperModel("medium", device="cpu", compute_type="int8")
    return _model


async def transcribe_audio(job_id: str, db: AsyncSession):
    """Background task: transcribe audio file and trigger analyses."""
    try:
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await db.commit()

        logger.info(f"Starting transcription for job {job_id}: {job.file_path}")
        model = get_whisper_model()
        segments_iter, info = model.transcribe(
            job.file_path,
            language=None,  # auto-detect
            vad_filter=True,  # filter out silence
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

        transcription = Transcription(
            filename=os.path.basename(job.file_path),
            text=full_text,
            segments=segments,
            language=info.language,
            duration=round(info.duration, 2),
            job_id=job.id,
        )
        db.add(transcription)
        job.status = "completed"
        job.transcription_id = transcription.id
        await db.commit()
        await db.refresh(transcription)

        logger.info(f"Transcription done: {transcription.id} ({len(segments)} segments, {info.language}, {info.duration:.0f}s)")

        # Trigger LLM analyses
        logger.info(f"Starting 9 AI analyses for {transcription.id}...")
        await generate_analyses(transcription.id, db)
        logger.info(f"All analyses complete for {transcription.id}")

    except Exception as e:
        logger.error(f"Transcription failed for job {job_id}: {e}", exc_info=True)
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if job:
            job.status = "failed"
            await db.commit()

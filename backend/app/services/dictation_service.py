"""v6 — Dictation service: manage live dictation sessions with chunk-based transcription."""
import asyncio
import logging
import os
import tempfile
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DictationSession, Job, Transcription
from app.services.transcription_service import _run_whisper_fast, get_dictation_model_name
from app.services.audio_analysis_service import get_vad_params
from app.services.dictionary_service import apply_dictionary_corrections
from app.services.stt_backends import resolve_stt_backend, transcribe_audio_via_backend

logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"


async def start_session(db: AsyncSession, profile: str = "generic", user_id: str = "default") -> DictationSession:
    """Create a new dictation session."""
    session = DictationSession(profile=profile, user_id=user_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    logger.info(f"Dictation session started: {session.id} (profile={profile})")
    return session


async def transcribe_chunk(
    session_id: str, audio_data: bytes, db: AsyncSession,
    stt_override: str = None,
) -> dict:
    """Transcribe a single audio chunk and append to session text."""
    result = await db.execute(
        select(DictationSession).where(DictationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Session not found")
    if session.status not in ("active", "paused"):
        raise ValueError(f"Session is {session.status}, cannot accept chunks")

    # Save chunk to temp file
    chunk_path = os.path.join(
        tempfile.gettempdir(), f"dictation_{session_id}_{session.chunk_count}.wav"
    )
    with open(chunk_path, "wb") as f:
        f.write(audio_data)

    try:
        # Transcribe via STT backend (defaults to local fast Whisper for dictation)
        vad_params = {"min_silence_duration_ms": 200}
        stt_backend = resolve_stt_backend("live_dictation", override=stt_override)
        dictation_model = get_dictation_model_name()
        # Use session language or default to French
        effective_lang = session.language or os.environ.get("DEFAULT_STT_LANGUAGE", "fr")
        segments, chunk_text, info = await transcribe_audio_via_backend(
            chunk_path, language=effective_lang, backend_id=stt_backend, vad_params=vad_params, model_hint=dictation_model,
        )

        # Update session
        if chunk_text.strip():
            separator = " " if session.current_text else ""
            session.current_text = session.current_text + separator + chunk_text.strip()

        session.chunk_count += 1
        if info and hasattr(info, "duration"):
            session.total_duration += info.duration
        if info and hasattr(info, "language") and info.language and not session.language:
            session.language = info.language

        await db.commit()
        await db.refresh(session)

        return {
            "chunk_text": chunk_text.strip(),
            "full_text": session.current_text,
            "chunk_count": session.chunk_count,
            "language": session.language,
        }
    finally:
        if os.path.exists(chunk_path):
            os.remove(chunk_path)


async def pause_session(session_id: str, db: AsyncSession) -> DictationSession:
    """Pause a dictation session."""
    result = await db.execute(
        select(DictationSession).where(DictationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Session not found")
    session.status = "paused"
    await db.commit()
    await db.refresh(session)
    return session


async def resume_session(session_id: str, db: AsyncSession) -> DictationSession:
    """Resume a paused dictation session."""
    result = await db.execute(
        select(DictationSession).where(DictationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Session not found")
    session.status = "active"
    await db.commit()
    await db.refresh(session)
    return session


async def stop_session(session_id: str, db: AsyncSession) -> DictationSession:
    """Stop and finalize a dictation session."""
    result = await db.execute(
        select(DictationSession).where(DictationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Session not found")
    session.status = "completed"
    await db.commit()
    await db.refresh(session)
    logger.info(
        f"Dictation session stopped: {session.id} "
        f"({session.chunk_count} chunks, {session.total_duration:.1f}s)"
    )
    return session


async def save_as_transcription(
    session_id: str, db: AsyncSession
) -> dict:
    """Convert a completed dictation session into a standard Transcription + Job."""
    result = await db.execute(
        select(DictationSession).where(DictationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Session not found")
    if session.status != "completed":
        raise ValueError("Session must be completed before saving")
    if session.transcription_id:
        raise ValueError("Session already saved as transcription")

    # Create a Job entry (no actual file, but keeps pipeline consistent)
    job = Job(
        status="completed",
        file_path=f"dictation://{session.id}",
        profile=session.profile,
        priority="P1",
        source_type="dictation",
        user_id=session.user_id,
    )
    db.add(job)
    await db.flush()

    # Build segments from the text (simple sentence splitting)
    text = session.current_text.strip()
    segments = _text_to_segments(text, session.total_duration)

    transcription = Transcription(
        filename=f"Dictee_{session.id[:8]}",
        text=text,
        segments=segments,
        language=session.language,
        duration=round(session.total_duration, 2) if session.total_duration > 0 else None,
        profile=session.profile,
        audio_type="dictation",
        job_id=job.id,
        user_id=session.user_id,
    )
    db.add(transcription)
    await db.flush()

    job.transcription_id = transcription.id
    session.transcription_id = transcription.id
    await db.commit()

    # Note: minutes are consumed at finalize time (when audio is actually transcribed),
    # not at save time, to avoid double-counting.

    logger.info(f"Dictation session {session.id} saved as transcription {transcription.id}")
    return {
        "transcription_id": transcription.id,
        "job_id": job.id,
        "text": text,
    }


def _text_to_segments(text: str, total_duration: float) -> list:
    """Split text into pseudo-segments for display."""
    if not text:
        return []
    # Split on sentence boundaries
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return [{"start": 0.0, "end": total_duration or 1.0, "text": text}]

    # Distribute duration evenly across sentences
    dur_per = (total_duration or len(sentences)) / len(sentences)
    segments = []
    for i, sentence in enumerate(sentences):
        segments.append({
            "start": round(i * dur_per, 2),
            "end": round((i + 1) * dur_per, 2),
            "text": sentence,
        })
    return segments

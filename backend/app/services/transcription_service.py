import asyncio
import logging
import os
import tempfile
import torch
from faster_whisper import WhisperModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Job, Transcription, AudioPreset, DictionaryEntry
from app.services.llm_service import generate_analyses
from app.services.audio_analysis_service import get_vad_params, detect_audio_type_heuristic
from app.services.dictionary_service import apply_dictionary_corrections

logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".ts", ".mts", ".m2ts"}

_model = None
_fast_model = None

# Dictation model: prioritize speed over accuracy for real-time chunks
DICTATION_MODEL = os.environ.get("WHISPER_DICTATION_MODEL", "small")


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


def get_fast_whisper_model():
    """Get a lightweight Whisper model optimized for real-time dictation."""
    global _fast_model
    if _fast_model is None:
        logger.info(f"Loading fast Whisper '{DICTATION_MODEL}' for dictation (CPU, int8)")
        _fast_model = WhisperModel(DICTATION_MODEL, device="cpu", compute_type="int8")
    return _fast_model


def _run_whisper_fast(file_path: str, vad_params: dict = None):
    """Run fast Whisper transcription for dictation chunks."""
    effective_vad = vad_params or {"min_silence_duration_ms": 200}
    model = get_fast_whisper_model()
    segments_iter, info = model.transcribe(
        file_path,
        language=None,
        vad_filter=True,
        vad_parameters=effective_vad,
    )
    segments = []
    full_text_parts = []
    for segment in segments_iter:
        segments.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
        })
        full_text_parts.append(segment.text.strip())
    return segments, " ".join(full_text_parts), info


def _extract_audio_from_video(video_path: str) -> str:
    """Extract audio from video file using PyAV, returns path to WAV file."""
    import av
    output_path = video_path + ".extracted.wav"
    try:
        container = av.open(video_path)
        audio_stream = next(s for s in container.streams if s.type == 'audio')
        resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)

        import wave
        with wave.open(output_path, 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(16000)
            for frame in container.decode(audio_stream):
                resampled = resampler.resample(frame)
                for r in resampled:
                    wav.writeframesraw(r.to_ndarray().tobytes())
        container.close()
        logger.info(f"Extracted audio from video: {output_path}")
        return output_path
    except Exception as e:
        logger.warning(f"PyAV extraction failed ({e}), trying direct Whisper decode")
        if os.path.exists(output_path):
            os.remove(output_path)
        return video_path  # faster-whisper may handle it directly


def _run_whisper(file_path: str, vad_params: dict = None, language: str = None):
    """Run Whisper transcription (CPU-bound, runs in thread pool)."""
    # Extract audio from video if needed
    ext = os.path.splitext(file_path)[1].lower()
    audio_path = file_path
    if ext in VIDEO_EXTENSIONS:
        logger.info(f"Extracting audio from video: {file_path}")
        audio_path = _extract_audio_from_video(file_path)

    # Use custom VAD params if provided, otherwise defaults
    effective_vad = vad_params or {"min_silence_duration_ms": 500}

    model = get_whisper_model()
    logger.info(f"Transcribing with language={'auto' if not language else language}")
    segments_iter, info = model.transcribe(
        audio_path,
        language=language,
        vad_filter=True,
        vad_parameters=effective_vad,
    )

    segments = []
    full_text_parts = []
    prev_end = 0.0
    for segment in segments_iter:
        seg_data = {
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
        }
        # Mark overlaps (segment starts before previous ends)
        if segment.start < prev_end - 0.1:
            seg_data["overlap"] = True
        prev_end = segment.end
        segments.append(seg_data)
        full_text_parts.append(segment.text.strip())

    full_text = " ".join(full_text_parts)

    # Clean up extracted audio file
    if audio_path != file_path and os.path.exists(audio_path):
        os.remove(audio_path)

    return segments, full_text, info


async def transcribe_audio(job_id: str, db: AsyncSession, profile: str = "generic", language: str | None = None):
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

        # Load preset VAD params if preset_id is set
        vad_params = None
        dictionary_entries = []
        preset_id = getattr(job, "preset_id", None)
        if preset_id:
            preset_result = await db.execute(select(AudioPreset).where(AudioPreset.id == preset_id))
            preset = preset_result.scalar_one_or_none()
            if preset:
                vad_params = get_vad_params(audio_type=preset.audio_type, profile_id=preset.profile_id)
                if preset.dictionary_id:
                    entries_result = await db.execute(
                        select(DictionaryEntry).where(DictionaryEntry.dictionary_id == preset.dictionary_id)
                    )
                    dictionary_entries = [
                        {"term": e.term, "replacement": e.replacement, "category": e.category}
                        for e in entries_result.scalars().all()
                    ]
                logger.info(f"Using preset '{preset.name}': vad={vad_params}, dict_entries={len(dictionary_entries)}")

        if not vad_params:
            vad_params = get_vad_params(profile_id=profile)

        # Run Whisper in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        segments, full_text, info = await loop.run_in_executor(None, _run_whisper, file_path, vad_params, language)

        # Apply dictionary post-corrections if available
        if dictionary_entries:
            full_text = apply_dictionary_corrections(full_text, dictionary_entries)
            for seg in segments:
                seg["text"] = apply_dictionary_corrections(seg["text"], dictionary_entries)
            logger.info(f"Applied {len(dictionary_entries)} dictionary corrections")

        # Detect audio type from transcription stats
        avg_seg_len = sum(s["end"] - s["start"] for s in segments) / max(len(segments), 1)
        detected_audio_type = detect_audio_type_heuristic(
            info.duration, len(segments), avg_seg_len
        )

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
            profile=profile,
            audio_type=detected_audio_type,
            job_id=job.id,
        )
        db.add(transcription)
        await db.flush()  # Ensure transcription.id is generated

        # Mark job as "transcribed" immediately so frontend can show results
        job.status = "transcribed"
        job.transcription_id = transcription.id
        await db.commit()

        logger.info(f"Transcription done: {transcription.id} ({len(segments)} segments, {info.language}, {info.duration:.0f}s, type={detected_audio_type})")
        logger.info(f"Job {job_id} updated: status=transcribed, transcription_id={transcription.id}")

        # Trigger LLM analyses (profile-aware, with dictionary context)
        logger.info(f"Starting analyses for {transcription.id} (profile: {profile})...")
        await generate_analyses(transcription.id, db, profile_id=profile, dictionary_entries=dictionary_entries)

        # Mark job as fully completed after analyses
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if job:
            job.status = "completed"
            await db.commit()
        logger.info(f"All analyses complete for {transcription.id}, job {job_id} → completed")

    except Exception as e:
        logger.error(f"Transcription failed for job {job_id}: {e}", exc_info=True)
        try:
            result = await db.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
            if job:
                job.status = "failed"
                job.error_message = str(e)[:500]
                await db.commit()
        except Exception as e2:
            logger.error(f"Failed to mark job {job_id} as failed: {e2}")

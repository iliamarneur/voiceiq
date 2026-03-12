import asyncio
import logging
import os
import tempfile
import time
try:
    import torch
except ImportError:
    torch = None

try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    WhisperModel = None
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Job, Transcription, AudioPreset, DictionaryEntry
from app.services.audio_analysis_service import get_vad_params, detect_audio_type_heuristic
from app.services.dictionary_service import apply_dictionary_corrections
from app.services.subscription_service import consume_minutes
from app.services.stt_backends import resolve_stt_backend, transcribe_audio_via_backend

logger = logging.getLogger(__name__)


def _safe_remove(path: str, retries: int = 5, delay: float = 1.0):
    """Remove a file with retries for Windows file locking issues."""
    for attempt in range(retries):
        try:
            os.remove(path)
            return
        except PermissionError:
            if attempt < retries - 1:
                logger.debug(f"File locked, retry {attempt + 1}/{retries}: {path}")
                time.sleep(delay)
            else:
                logger.warning(f"Could not delete locked file after {retries} attempts: {path}")
        except FileNotFoundError:
            return

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".ts", ".mts", ".m2ts"}

_model = None
_fast_model = None

# Current model names (configurable at runtime)
_current_transcription_model = os.environ.get("WHISPER_TRANSCRIPTION_MODEL", None)  # None = auto (large-v3 GPU / medium CPU)
_current_dictation_model = os.environ.get("WHISPER_DICTATION_MODEL", "small")

VALID_WHISPER_MODELS = ["large-v3", "large-v2", "medium", "small", "base", "tiny"]


def get_whisper_model_name() -> str:
    """Return the current transcription model name."""
    if _current_transcription_model:
        return _current_transcription_model
    return "large-v3" if torch and torch.cuda.is_available() else "medium"


def get_dictation_model_name() -> str:
    """Return the current dictation model name."""
    return _current_dictation_model


def set_whisper_model(transcription_model: str = None, dictation_model: str = None):
    """Change whisper models at runtime. Forces reload on next transcription."""
    global _model, _fast_model, _current_transcription_model, _current_dictation_model
    if transcription_model and transcription_model in VALID_WHISPER_MODELS:
        _current_transcription_model = transcription_model
        _model = None  # Force reload
        logger.info(f"Whisper transcription model changed to '{transcription_model}' (will load on next use)")
    if dictation_model and dictation_model in VALID_WHISPER_MODELS:
        _current_dictation_model = dictation_model
        _fast_model = None  # Force reload
        logger.info(f"Whisper dictation model changed to '{dictation_model}' (will load on next use)")


def get_whisper_model():
    global _model
    model_name = get_whisper_model_name()
    if _model is None:
        if torch and torch.cuda.is_available():
            logger.info(f"Loading Whisper '{model_name}' on GPU (CUDA)")
            _model = WhisperModel(model_name, device="cuda", compute_type="float16")
        else:
            logger.info(f"Loading Whisper '{model_name}' on CPU")
            _model = WhisperModel(model_name, device="cpu", compute_type="int8")
    return _model


def get_fast_whisper_model():
    """Get a lightweight Whisper model optimized for real-time dictation.
    Uses GPU if available for maximum speed."""
    global _fast_model
    model_name = get_dictation_model_name()
    if _fast_model is None:
        if torch and torch.cuda.is_available():
            logger.info(f"Loading fast Whisper '{model_name}' for dictation (GPU, float16)")
            _fast_model = WhisperModel(model_name, device="cuda", compute_type="float16")
        else:
            logger.info(f"Loading fast Whisper '{model_name}' for dictation (CPU, int8)")
            _fast_model = WhisperModel(model_name, device="cpu", compute_type="int8")
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
            _safe_remove(output_path)
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
        _safe_remove(audio_path)

    return segments, full_text, info


async def transcribe_audio(
    job_id: str, db: AsyncSession, profile: str = "generic", language: str | None = None,
    stt_override: str | None = None, llm_override: str | None = None,
    mode_id: str = "file_upload", oneshot_order_id: str | None = None,
):
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

        # Resolve STT backend and run transcription
        import time as _time
        _transcription_start = _time.time()
        stt_backend = resolve_stt_backend(mode_id, override=stt_override)
        # Default to French if no language specified (avoids misdetection like Nynorsk)
        effective_language = language or os.environ.get("DEFAULT_STT_LANGUAGE", "fr")
        logger.info(f"Job {job_id}: using STT backend '{stt_backend}' (mode={mode_id}, lang={effective_language})")
        segments, full_text, info = await transcribe_audio_via_backend(
            file_path, language=effective_language, backend_id=stt_backend, vad_params=vad_params,
        )

        # Apply dictionary post-corrections if available
        if dictionary_entries:
            full_text = apply_dictionary_corrections(full_text, dictionary_entries)
            for seg in segments:
                seg["text"] = apply_dictionary_corrections(seg["text"], dictionary_entries)
            logger.info(f"Applied {len(dictionary_entries)} dictionary corrections")

        # Polish transcription text via LLM (formatting, punctuation, paragraphs)
        raw_text = full_text  # Keep raw version before polishing
        try:
            from app.services.llm_service import polish_transcription
            polished = await polish_transcription(full_text, language=effective_language, dictionary_entries=dictionary_entries or None)
            if polished and polished != full_text:
                logger.info(f"Job {job_id}: text polished ({len(full_text)} → {len(polished)} chars)")
                full_text = polished
        except Exception as polish_err:
            logger.warning(f"Job {job_id}: polish failed ({polish_err}), using raw text")

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

        # Build processing info for traceability
        from app.services.llm_backends import resolve_llm_backend, get_openai_model
        llm_backend = resolve_llm_backend(mode_id, override=llm_override)
        _processing_seconds = round(_time.time() - _transcription_start, 1)
        _processing_info = {
            "stt_backend": stt_backend,
            "stt_model": get_whisper_model_name() if stt_backend == "stt_open_source" else "whisper-1",
            "llm_backend": llm_backend,
            "llm_model": get_openai_model() if llm_backend == "llm_openai" else (
                "ollama" if llm_backend == "llm_open_source" else llm_backend
            ),
            "processing_seconds": _processing_seconds,
            "mode": mode_id,
            "raw_text": raw_text if raw_text != full_text else None,
        }

        transcription = Transcription(
            filename=os.path.basename(file_path),
            text=full_text,
            segments=segments,
            language=info.language,
            duration=round(info.duration, 2),
            profile=profile,
            audio_type=detected_audio_type,
            job_id=job.id,
            user_id=job.user_id,
            processing_info=_processing_info,
            oneshot_order_id=oneshot_order_id,
        )
        db.add(transcription)
        await db.flush()  # Ensure transcription.id is generated

        # Mark job as "transcribed" immediately so frontend can show results
        job.status = "transcribed"
        job.transcription_id = transcription.id
        await db.commit()

        logger.info(f"Transcription done: {transcription.id} ({len(segments)} segments, {info.language}, {info.duration:.0f}s, type={detected_audio_type})")
        logger.info(f"Job {job_id} updated: status=transcribed, transcription_id={transcription.id}")

        # v7: Log usage and consume minutes
        processing_end = _time.time()
        whisper_model_name = "large-v3" if torch and torch.cuda.is_available() else "medium"
        _usage_source_type = "oneshot" if oneshot_order_id else (getattr(job, "source_type", "file") or "file")
        try:
            await consume_minutes(
                db,
                audio_duration_seconds=info.duration,
                transcription_id=transcription.id,
                job_id=job.id,
                source_type=_usage_source_type,
                profile_used=profile,
                whisper_model=whisper_model_name,
                processing_time_seconds=round(processing_end - _transcription_start, 1),
                language=info.language,
                user_id=job.user_id,
            )
        except Exception as usage_err:
            logger.warning(f"Usage logging failed: {usage_err}")

        # v7: Auto-link oneshot order to transcription
        if oneshot_order_id:
            try:
                from app.services.subscription_service import link_oneshot_to_transcription
                await link_oneshot_to_transcription(db, oneshot_order_id, transcription.id)
                logger.info(f"Oneshot order {oneshot_order_id} linked to transcription {transcription.id}")
            except Exception as link_err:
                logger.warning(f"Failed to link oneshot order: {link_err}")

        # For one-shot: auto-generate only summary + keypoints (user can request others on-demand)
        if oneshot_order_id:
            _tid = transcription.id
            _AUTO_TYPES = ["summary", "keypoints"]
            async def _bg_oneshot_analyses():
                from app.database import AsyncSessionLocal
                from app.services.llm_service import regenerate_analysis
                try:
                    async with AsyncSessionLocal() as bg_db:
                        logger.info(f"One-shot: auto-generating {_AUTO_TYPES} for {_tid}")
                        for analysis_type in _AUTO_TYPES:
                            try:
                                await regenerate_analysis(_tid, analysis_type, bg_db)
                            except Exception as e:
                                logger.warning(f"One-shot analysis '{analysis_type}' failed for {_tid}: {e}")
                        logger.info(f"One-shot: auto-analyses done for {_tid}")
                except Exception as analysis_err:
                    logger.warning(f"One-shot auto-analysis failed: {analysis_err}")
            asyncio.create_task(_bg_oneshot_analyses())

        # Mark job as completed and clean up audio file
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if job:
            job.status = "completed"
            # Delete audio file after successful transcription
            if job.file_path and os.path.exists(job.file_path):
                _safe_remove(job.file_path)
                logger.info(f"Audio file deleted after transcription: {job.file_path}")
            await db.commit()
        logger.info(f"Transcription complete for {transcription.id}, job {job_id} → completed")

    except Exception as e:
        logger.error(f"Transcription failed for job {job_id}: {e}", exc_info=True)
        try:
            result = await db.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
            if job:
                job.status = "failed"
                job.error_message = str(e)[:500]
                # Delete audio file even on failure
                if job.file_path and os.path.exists(job.file_path):
                    _safe_remove(job.file_path)
                    logger.info(f"Audio file deleted after failed transcription: {job.file_path}")
                await db.commit()
        except Exception as e2:
            logger.error(f"Failed to mark job {job_id} as failed: {e2}")

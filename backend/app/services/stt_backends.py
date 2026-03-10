"""STT backend abstraction layer.

Provides a unified interface for speech-to-text backends.
Default: stt_open_source (faster-whisper local).
Premium backends are stubs — implement when API keys are available.

Usage:
    segments, text, info = await transcribe_audio_via_backend(
        audio_path, language="fr", backend_id="stt_open_source"
    )
"""
import asyncio
import json
import logging
import os
import time
from typing import Optional

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

_config_cache = None


def _load_config() -> dict:
    global _config_cache
    if _config_cache is None:
        config_path = os.path.join(os.path.dirname(__file__), "..", "..", "config", "audio_backends.json")
        with open(config_path) as f:
            _config_cache = json.load(f)
    return _config_cache


def get_stt_backends() -> dict:
    """Return all registered STT backends with availability status."""
    config = _load_config()
    result = {}
    for backend_id, info in config.get("stt_backends", {}).items():
        env_key = info.get("env_key")
        available = True
        if env_key:
            available = bool(os.environ.get(env_key))
        result[backend_id] = {**info, "available": available, "id": backend_id}
    return result


def resolve_stt_backend(mode_id: str, override: Optional[str] = None) -> str:
    """Resolve which STT backend to use for a given mode.

    Args:
        mode_id: One of file_upload, recording, live_dictation.
        override: Optional backend_id override (dev/admin).

    Returns:
        backend_id to use, with fallback to stt_open_source if override unavailable.
    """
    config = _load_config()

    if override:
        backends = config.get("stt_backends", {})
        if override in backends:
            env_key = backends[override].get("env_key")
            if env_key and not os.environ.get(env_key):
                logger.warning(
                    f"STT override '{override}' requested but {env_key} not set — "
                    f"falling back to stt_open_source"
                )
                return "stt_open_source"
            return override
        logger.warning(f"Unknown STT backend '{override}', falling back to config default")

    modes = config.get("modes", {})
    mode_config = modes.get(mode_id, {})
    default_backend = mode_config.get("stt_backend", "stt_open_source")

    # Check if the default backend's API key is available; fall back if not
    backends = config.get("stt_backends", {})
    backend_info = backends.get(default_backend, {})
    env_key = backend_info.get("env_key")
    if env_key and not os.environ.get(env_key):
        return "stt_open_source"

    return default_backend


# ── Backend implementations ──────────────────────────────


def _stt_open_source(file_path: str, vad_params: dict = None, language: str = None, model_hint: str = None):
    """Local faster-whisper transcription."""
    from app.services.transcription_service import _run_whisper, _run_whisper_fast, VALID_WHISPER_MODELS

    # Use fast model for dictation-class models (small, base, tiny)
    fast_models = {"small", "base", "tiny"}
    if model_hint and model_hint in fast_models:
        return _run_whisper_fast(file_path, vad_params)
    return _run_whisper(file_path, vad_params, language)


def _compress_audio_for_api(file_path: str, max_bytes: int = 24 * 1024 * 1024) -> str:
    """Compress audio to stay under OpenAI's 25MB limit. Returns path to compressed file."""
    file_size = os.path.getsize(file_path)
    if file_size <= max_bytes:
        return file_path

    logger.info(f"Audio file {file_size / (1024*1024):.1f} MB exceeds API limit, compressing...")
    try:
        import av

        # Get audio duration reliably
        container = av.open(file_path)
        duration_s = 0.0
        if container.duration and container.duration > 0:
            duration_s = container.duration / 1_000_000  # AV_TIME_BASE = 1000000
        if duration_s <= 0:
            for s in container.streams:
                if s.type == 'audio' and s.duration and s.time_base:
                    duration_s = float(s.duration * s.time_base)
                    break
        container.close()
        if duration_s <= 0:
            duration_s = 3600  # fallback 1h

        logger.info(f"Audio duration: {duration_s:.0f}s ({duration_s/60:.1f} min)")

        # Calculate target bitrate to fit in 20MB (safe margin)
        target_bitrate = int((20 * 1024 * 1024 * 8) / duration_s)
        target_bitrate = max(16000, min(64000, target_bitrate))

        output_path = file_path + ".compressed.mp3"

        def _transcode(bitrate: int):
            inp = av.open(file_path)
            audio_stream = next(s for s in inp.streams if s.type == 'audio')
            out = av.open(output_path, 'w')
            out_stream = out.add_stream('libmp3lame', rate=16000)
            out_stream.bit_rate = bitrate
            out_stream.layout = 'mono'
            resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
            for frame in inp.decode(audio_stream):
                for r in resampler.resample(frame):
                    for pkt in out_stream.encode(r):
                        out.mux(pkt)
            for pkt in out_stream.encode(None):
                out.mux(pkt)
            out.close()
            inp.close()

        _transcode(target_bitrate)
        compressed_size = os.path.getsize(output_path)
        logger.info(f"Compressed: {file_size/(1024*1024):.1f} → {compressed_size/(1024*1024):.1f} MB ({target_bitrate//1000}kbps)")

        # If still too big, retry with lower bitrate
        if compressed_size > max_bytes and target_bitrate > 16000:
            logger.warning(f"Still too large, retrying at 16kbps...")
            _safe_remove(output_path)
            _transcode(16000)
            compressed_size = os.path.getsize(output_path)
            logger.info(f"Retry: {compressed_size/(1024*1024):.1f} MB (16kbps)")

        return output_path
    except Exception as e:
        logger.warning(f"Audio compression failed ({e}), sending original file")
        return file_path


def _stt_whisper_api(file_path: str, vad_params: dict = None, language: str = None, model_hint: str = None):
    """OpenAI Whisper API transcription."""
    from openai import OpenAI

    client = OpenAI(api_key=os.environ["OPENAI_STT_API_KEY"])

    # Compress if file exceeds OpenAI's 25MB limit
    actual_path = _compress_audio_for_api(file_path)
    compressed = actual_path != file_path

    try:
        with open(actual_path, "rb") as audio_file:
            kwargs = {
                "model": "whisper-1",
                "file": audio_file,
                "response_format": "verbose_json",
                "timestamp_granularities": ["segment"],
            }
            if language:
                kwargs["language"] = language

            result = client.audio.transcriptions.create(**kwargs)
    finally:
        # Clean up compressed file
        if compressed and os.path.exists(actual_path):
            _safe_remove(actual_path)

    import html as _html

    segments = []
    full_text_parts = []
    for seg in getattr(result, "segments", []) or []:
        # OpenAI returns objects with attributes, not dicts
        s_start = seg.start if hasattr(seg, "start") else seg["start"]
        s_end = seg.end if hasattr(seg, "end") else seg["end"]
        s_text = seg.text if hasattr(seg, "text") else seg["text"]
        s_text = _html.unescape(s_text.strip())
        segments.append({
            "start": round(s_start, 2),
            "end": round(s_end, 2),
            "text": s_text,
        })
        full_text_parts.append(s_text)

    raw_text = result.text if hasattr(result, "text") else " ".join(full_text_parts)
    full_text = _html.unescape(raw_text)

    class _Info:
        def __init__(self, lang, dur):
            self.language = lang
            self.duration = dur

    info = _Info(
        lang=getattr(result, "language", language or "unknown"),
        dur=getattr(result, "duration", segments[-1]["end"] if segments else 0.0),
    )

    return segments, full_text, info


def _stt_deepgram_api(file_path: str, vad_params: dict = None, language: str = None, model_hint: str = None):
    """Deepgram API — stub."""
    raise NotImplementedError(
        "stt_deepgram_api: Deepgram API not yet implemented. "
        "Set DEEPGRAM_API_KEY and implement in stt_backends.py"
    )


def _stt_google_api(file_path: str, vad_params: dict = None, language: str = None, model_hint: str = None):
    """Google Speech-to-Text API — stub."""
    raise NotImplementedError(
        "stt_google_api: Google STT API not yet implemented. "
        "Set GOOGLE_APPLICATION_CREDENTIALS and implement in stt_backends.py"
    )


_STT_DISPATCH = {
    "stt_open_source": _stt_open_source,
    "stt_whisper_api": _stt_whisper_api,
    "stt_deepgram_api": _stt_deepgram_api,
    "stt_google_api": _stt_google_api,
}


# ── Public API ───────────────────────────────────────────


async def transcribe_audio_via_backend(
    file_path: str,
    language: str = None,
    backend_id: str = "stt_open_source",
    vad_params: dict = None,
    model_hint: str = None,
) -> tuple[list, str, object]:
    """Transcribe audio through the specified STT backend.

    Args:
        file_path: Path to audio/video file.
        language: Language code (None=auto-detect).
        backend_id: STT backend to use.
        vad_params: VAD parameters dict.
        model_hint: Model size hint (e.g. "small" for dictation).

    Returns:
        (segments, full_text, info) tuple.
    """
    handler = _STT_DISPATCH.get(backend_id)
    if not handler:
        logger.error(f"Unknown STT backend '{backend_id}', falling back to open-source")
        handler = _stt_open_source

    logger.info(f"STT backend: {backend_id} | file: {os.path.basename(file_path)} | lang: {language or 'auto'}")

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, handler, file_path, vad_params, language, model_hint)

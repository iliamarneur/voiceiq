"""Tests for dictation service and configuration."""
import pytest
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(autouse=True)
def reset_backend_caches(monkeypatch):
    """Reset backend config caches and clear API keys."""
    for key in ["OPENAI_API_KEY", "OPENAI_STT_API_KEY", "DEEPGRAM_API_KEY"]:
        monkeypatch.delenv(key, raising=False)
    from app.services import stt_backends, llm_backends
    stt_backends._config_cache = None
    llm_backends._config_cache = None


class TestDictationModelConfig:
    """Test dictation model loading and configuration."""

    def test_dictation_model_name_default(self):
        from app.services.transcription_service import get_dictation_model_name
        name = get_dictation_model_name()
        assert name in ["small", "base", "tiny", "medium", "large-v2", "large-v3"]

    def test_dictation_model_is_valid_whisper(self):
        from app.services.transcription_service import get_dictation_model_name, VALID_WHISPER_MODELS
        name = get_dictation_model_name()
        assert name in VALID_WHISPER_MODELS

    def test_set_whisper_model_dictation(self):
        from app.services.transcription_service import set_whisper_model, get_dictation_model_name
        original = get_dictation_model_name()
        set_whisper_model(dictation_model="tiny")
        assert get_dictation_model_name() == "tiny"
        # Restore
        set_whisper_model(dictation_model=original)
        assert get_dictation_model_name() == original

    def test_set_whisper_model_rejects_invalid(self):
        from app.services.transcription_service import set_whisper_model, get_dictation_model_name
        original = get_dictation_model_name()
        set_whisper_model(dictation_model="nonexistent-model")
        assert get_dictation_model_name() == original

    def test_fast_model_uses_gpu_when_available(self):
        """Verify that get_fast_whisper_model uses GPU if CUDA available."""
        torch = pytest.importorskip("torch")
        from app.services import transcription_service
        # Just verify the function exists and the logic is correct by reading source
        import inspect
        src = inspect.getsource(transcription_service.get_fast_whisper_model)
        assert "torch.cuda.is_available()" in src
        assert "device=\"cuda\"" in src


class TestDictationBackendResolution:
    """Test that dictation resolves to correct STT backend."""

    def test_live_dictation_resolves_to_open_source(self):
        from app.services.stt_backends import resolve_stt_backend
        result = resolve_stt_backend("live_dictation")
        assert result == "stt_open_source"

    def test_dictation_uses_configurable_model_hint(self):
        """Verify dictation service uses get_dictation_model_name(), not hardcoded 'small'."""
        import inspect
        from app.services import dictation_service
        src = inspect.getsource(dictation_service.transcribe_chunk)
        assert "get_dictation_model_name()" in src
        assert "model_hint=\"small\"" not in src


class TestDictationVADConfig:
    """Test dictation-specific VAD settings."""

    def test_dictation_uses_fast_vad(self):
        """Dictation should use aggressive VAD (200ms silence) for responsiveness."""
        import inspect
        from app.services import dictation_service
        src = inspect.getsource(dictation_service.transcribe_chunk)
        assert "min_silence_duration_ms" in src
        assert "200" in src


class TestSttDispatch:
    """Test STT backend dispatch for fast models."""

    def test_small_model_dispatches_to_fast(self):
        """'small' model hint should route to _run_whisper_fast."""
        import inspect
        from app.services import stt_backends
        src = inspect.getsource(stt_backends._stt_open_source)
        assert "fast_models" in src
        assert "small" in src
        assert "base" in src
        assert "tiny" in src

    def test_default_dispatches_to_full_whisper(self):
        """No model hint should use the full _run_whisper."""
        import inspect
        from app.services import stt_backends
        src = inspect.getsource(stt_backends._stt_open_source)
        assert "_run_whisper(" in src


class TestDictationEndpoints:
    """Test dictation endpoints are registered."""

    def test_start_endpoint_exists(self):
        from app.main import app
        routes = [r.path for r in app.routes]
        assert "/api/dictation/start" in routes

    def test_chunk_endpoint_exists(self):
        from app.main import app
        routes = [r.path for r in app.routes]
        assert "/api/dictation/{session_id}/chunk" in routes

    def test_save_endpoint_exists(self):
        from app.main import app
        routes = [r.path for r in app.routes]
        assert "/api/dictation/{session_id}/save" in routes

    def test_pause_endpoint_exists(self):
        from app.main import app
        routes = [r.path for r in app.routes]
        assert "/api/dictation/{session_id}/pause" in routes

    def test_stop_endpoint_exists(self):
        from app.main import app
        routes = [r.path for r in app.routes]
        assert "/api/dictation/{session_id}/stop" in routes

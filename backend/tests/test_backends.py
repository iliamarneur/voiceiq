"""Tests for STT/LLM backend abstraction layer."""
import pytest
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

@pytest.fixture(autouse=True)
def clear_api_keys(monkeypatch):
    """Ensure no premium API keys are present and reset config caches."""
    for key in ["OPENAI_API_KEY", "OPENAI_STT_API_KEY", "OPENAI_LLM_API_KEY",
                "DEEPGRAM_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS", "ANTHROPIC_API_KEY"]:
        monkeypatch.delenv(key, raising=False)
    # Reset config caches so they reload fresh
    from app.services import stt_backends, llm_backends
    stt_backends._config_cache = None
    llm_backends._config_cache = None


class TestSttBackends:
    """Test STT backend resolution and config loading."""

    def test_load_config(self):
        from app.services.stt_backends import _load_config
        config = _load_config()
        assert "stt_backends" in config
        assert "modes" in config
        assert "stt_open_source" in config["stt_backends"]

    def test_get_stt_backends(self):
        from app.services.stt_backends import get_stt_backends
        backends = get_stt_backends()
        assert "stt_open_source" in backends
        assert backends["stt_open_source"]["available"] is True
        # Premium backends unavailable without API keys
        assert backends["stt_whisper_api"]["available"] is False
        assert backends["stt_deepgram_api"]["available"] is False

    def test_resolve_default_for_file_upload(self):
        from app.services.stt_backends import resolve_stt_backend
        result = resolve_stt_backend("file_upload")
        assert result == "stt_open_source"

    def test_resolve_default_for_recording(self):
        from app.services.stt_backends import resolve_stt_backend
        result = resolve_stt_backend("recording")
        assert result == "stt_open_source"

    def test_resolve_default_for_dictation(self):
        from app.services.stt_backends import resolve_stt_backend
        result = resolve_stt_backend("live_dictation")
        assert result == "stt_open_source"

    def test_resolve_with_valid_override(self):
        from app.services.stt_backends import resolve_stt_backend
        # stt_open_source has no env_key requirement, so override works
        result = resolve_stt_backend("file_upload", override="stt_open_source")
        assert result == "stt_open_source"

    def test_resolve_override_fallback_when_no_api_key(self):
        from app.services.stt_backends import resolve_stt_backend
        # stt_whisper_api requires OPENAI_API_KEY which is not set
        result = resolve_stt_backend("file_upload", override="stt_whisper_api")
        assert result == "stt_open_source"

    def test_resolve_unknown_override_falls_back(self):
        from app.services.stt_backends import resolve_stt_backend
        result = resolve_stt_backend("file_upload", override="stt_nonexistent")
        assert result == "stt_open_source"

    def test_resolve_unknown_mode_falls_back(self):
        from app.services.stt_backends import resolve_stt_backend
        result = resolve_stt_backend("unknown_mode")
        assert result == "stt_open_source"


class TestLlmBackends:
    """Test LLM backend resolution and config loading."""

    def test_get_llm_backends(self):
        from app.services.llm_backends import get_llm_backends
        backends = get_llm_backends()
        assert "llm_open_source" in backends
        assert backends["llm_open_source"]["available"] is True
        assert backends["llm_openai"]["available"] is False
        assert backends["llm_anthropic"]["available"] is False

    def test_resolve_default_for_all_modes(self):
        from app.services.llm_backends import resolve_llm_backend
        for mode in ["file_upload", "recording", "live_dictation"]:
            assert resolve_llm_backend(mode) == "llm_open_source"

    def test_resolve_override_fallback_when_no_api_key(self):
        from app.services.llm_backends import resolve_llm_backend
        result = resolve_llm_backend("file_upload", override="llm_openai")
        assert result == "llm_open_source"

    def test_resolve_unknown_override_falls_back(self):
        from app.services.llm_backends import resolve_llm_backend
        result = resolve_llm_backend("file_upload", override="llm_nonexistent")
        assert result == "llm_open_source"

    def test_resolve_unknown_mode_falls_back(self):
        from app.services.llm_backends import resolve_llm_backend
        result = resolve_llm_backend("unknown_mode")
        assert result == "llm_open_source"


class TestConfig:
    """Test audio_backends.json structure."""

    def test_config_has_all_modes(self):
        from app.services.stt_backends import _load_config
        config = _load_config()
        modes = config["modes"]
        assert "file_upload" in modes
        assert "recording" in modes
        assert "live_dictation" in modes

    def test_each_mode_has_stt_and_llm(self):
        from app.services.stt_backends import _load_config
        config = _load_config()
        for mode_id, mode_config in config["modes"].items():
            assert "stt_backend" in mode_config, f"{mode_id} missing stt_backend"
            assert "llm_backend" in mode_config, f"{mode_id} missing llm_backend"

    def test_all_mode_backends_exist_in_registry(self):
        from app.services.stt_backends import _load_config
        config = _load_config()
        stt_ids = set(config["stt_backends"].keys())
        llm_ids = set(config["llm_backends"].keys())
        for mode_id, mode_config in config["modes"].items():
            assert mode_config["stt_backend"] in stt_ids, f"{mode_id}: stt_backend not in registry"
            assert mode_config["llm_backend"] in llm_ids, f"{mode_id}: llm_backend not in registry"

    def test_premium_backends_have_env_key(self):
        from app.services.stt_backends import _load_config
        config = _load_config()
        for backend_id, info in config["stt_backends"].items():
            if backend_id != "stt_open_source":
                assert "env_key" in info, f"{backend_id} missing env_key"
        for backend_id, info in config["llm_backends"].items():
            if backend_id != "llm_open_source":
                assert "env_key" in info, f"{backend_id} missing env_key"

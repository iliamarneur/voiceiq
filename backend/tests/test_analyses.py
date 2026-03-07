"""Tests for analysis generation and LLM service."""
import json
import pytest
import pytest_asyncio
from unittest.mock import patch, MagicMock

from app.services.profile_service import get_profile_analyses, reload_profiles
from tests.golden_transcripts import GOLDEN_TRANSCRIPTS

pytestmark = pytest.mark.asyncio

# Ensure profiles are loaded
reload_profiles()


class TestProfileAnalysesConfig:
    """Test that profile configs are well-formed."""

    @pytest.mark.parametrize("profile_id", ["generic", "business", "education", "medical", "legal"])
    def test_profile_has_analyses(self, profile_id):
        analyses = get_profile_analyses(profile_id)
        assert len(analyses) > 0, f"{profile_id} has no analyses"

    @pytest.mark.parametrize("profile_id", ["generic", "business", "education", "medical", "legal"])
    def test_all_analyses_have_prompt(self, profile_id):
        analyses = get_profile_analyses(profile_id)
        for a in analyses:
            assert a.get("prompt"), f"{profile_id}/{a['type']}: missing or empty prompt"

    def test_generic_has_9_analyses(self):
        assert len(get_profile_analyses("generic")) == 9

    def test_business_has_9_analyses(self):
        assert len(get_profile_analyses("business")) == 9

    def test_education_has_9_analyses(self):
        assert len(get_profile_analyses("education")) == 9

    def test_medical_has_7_analyses(self):
        assert len(get_profile_analyses("medical")) == 7

    def test_legal_has_7_analyses(self):
        assert len(get_profile_analyses("legal")) == 7

    def test_business_has_kpi_analysis(self):
        types = [a["type"] for a in get_profile_analyses("business")]
        assert "kpi" in types

    def test_business_has_risks_analysis(self):
        types = [a["type"] for a in get_profile_analyses("business")]
        assert "risks" in types

    def test_medical_has_soap_analysis(self):
        types = [a["type"] for a in get_profile_analyses("medical")]
        assert "soap" in types

    def test_medical_has_prescriptions(self):
        types = [a["type"] for a in get_profile_analyses("medical")]
        assert "prescriptions" in types

    def test_legal_has_clauses_analysis(self):
        types = [a["type"] for a in get_profile_analyses("legal")]
        assert "clauses" in types

    def test_legal_has_obligations(self):
        types = [a["type"] for a in get_profile_analyses("legal")]
        assert "obligations" in types

    def test_education_has_exercises(self):
        types = [a["type"] for a in get_profile_analyses("education")]
        assert "exercises" in types


class TestGoldenTranscripts:
    """Test that golden transcripts exist for all profiles."""

    @pytest.mark.parametrize("profile_id", ["generic", "business", "education", "medical", "legal"])
    def test_golden_transcripts_exist(self, profile_id):
        assert profile_id in GOLDEN_TRANSCRIPTS
        assert len(GOLDEN_TRANSCRIPTS[profile_id]) >= 2

    @pytest.mark.parametrize("profile_id", ["generic", "business", "education", "medical", "legal"])
    def test_golden_transcripts_not_empty(self, profile_id):
        for name, text in GOLDEN_TRANSCRIPTS[profile_id].items():
            assert len(text.strip()) > 50, f"{profile_id}/{name}: transcript too short"


class TestLLMServiceMocked:
    """Test LLM service with mocked Ollama."""

    def test_fix_json_trailing_comma(self):
        from app.services.llm_service import _fix_json
        result = _fix_json('{"a": 1, "b": 2,}')
        parsed = json.loads(result)
        assert parsed == {"a": 1, "b": 2}

    def test_fix_json_valid_passthrough(self):
        from app.services.llm_service import _fix_json
        result = _fix_json('{"a": 1}')
        assert json.loads(result) == {"a": 1}

    def test_call_ollama_handles_json_response(self):
        from app.services.llm_service import _call_ollama
        mock_response = {"message": {"content": '{"title": "Test", "points": ["a", "b"]}'}}
        with patch("app.services.llm_service._ollama") as mock_client:
            mock_client.chat.return_value = mock_response
            result = _call_ollama("test prompt", "test text")
        assert result["title"] == "Test"

    def test_call_ollama_handles_markdown_wrapped_json(self):
        from app.services.llm_service import _call_ollama
        mock_response = {"message": {"content": '```json\n{"title": "Test"}\n```'}}
        with patch("app.services.llm_service._ollama") as mock_client:
            mock_client.chat.return_value = mock_response
            result = _call_ollama("test prompt", "test text")
        assert result["title"] == "Test"

    def test_call_ollama_handles_error(self):
        from app.services.llm_service import _call_ollama
        with patch("app.services.llm_service._ollama") as mock_client:
            mock_client.chat.side_effect = Exception("Connection refused")
            result = _call_ollama("test prompt", "test text")
        assert "error" in result

    def test_call_ollama_handles_invalid_json(self):
        from app.services.llm_service import _call_ollama
        mock_response = {"message": {"content": "This is not JSON at all, just plain text."}}
        with patch("app.services.llm_service._ollama") as mock_client:
            mock_client.chat.return_value = mock_response
            result = _call_ollama("test prompt", "test text")
        assert "raw" in result  # Falls back to raw text

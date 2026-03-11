"""Tests for export functionality."""
import json
import os
import pytest
from unittest.mock import MagicMock

from app.services.profile_service import get_profile_exports, reload_profiles

pytestmark = pytest.mark.asyncio

reload_profiles()


@pytest.fixture(autouse=True)
def disable_auth(monkeypatch):
    """Disable auth for export tests."""
    monkeypatch.setenv("AUTH_ENABLED", "false")
    import app.services.auth_service as auth_mod
    monkeypatch.setattr(auth_mod, "AUTH_ENABLED", False)


class TestProfileExports:
    """Test export configs per profile."""

    def test_generic_exports(self):
        exports = get_profile_exports("generic")
        assert "json" in exports
        assert "md" in exports
        assert "txt" in exports

    def test_business_exports(self):
        exports = get_profile_exports("business")
        assert "json" in exports
        assert "md" in exports

    def test_education_exports(self):
        exports = get_profile_exports("education")
        assert "json" in exports
        assert "md" in exports

    def test_medical_exports(self):
        exports = get_profile_exports("medical")
        assert "json" in exports
        assert "md" in exports

    def test_legal_exports(self):
        exports = get_profile_exports("legal")
        assert "json" in exports
        assert "md" in exports


class TestExportEndpoints:
    """Test export API endpoints."""

    async def test_export_nonexistent_transcription(self, test_client):
        resp = await test_client.get("/api/transcriptions/nonexistent/export/json")
        assert resp.status_code == 404

    async def test_export_invalid_format(self, test_client):
        resp = await test_client.get("/api/transcriptions/test/export/xyz")
        # Should be 404 (transcription not found) or 400 (format unsupported)
        assert resp.status_code in (400, 404)

"""Tests for upload API endpoints."""
import io
import os
import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock

from tests.conftest import create_test_wav

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def disable_auth(monkeypatch):
    """Disable auth for upload tests."""
    monkeypatch.setenv("AUTH_ENABLED", "false")
    import app.services.auth_service as auth_mod
    monkeypatch.setattr(auth_mod, "AUTH_ENABLED", False)


async def test_upload_rejects_invalid_format(test_client):
    """Non-audio file should be rejected."""
    resp = await test_client.post(
        "/api/upload",
        files={"file": ("test.exe", b"MZ\x00\x00", "application/octet-stream")},
        data={"profile": "generic"},
    )
    assert resp.status_code == 400
    assert "Unsupported" in resp.json()["detail"]


async def test_upload_rejects_txt_file(test_client):
    resp = await test_client.post(
        "/api/upload",
        files={"file": ("notes.txt", b"hello world", "text/plain")},
        data={"profile": "generic"},
    )
    assert resp.status_code == 400


async def test_upload_with_valid_audio(test_client, tmp_path):
    """WAV file should be accepted."""
    wav_path = str(tmp_path / "test.wav")
    create_test_wav(wav_path, duration_sec=0.5)
    with open(wav_path, "rb") as f:
        wav_bytes = f.read()

    with patch("app.main.asyncio.create_task"):  # Don't run bg transcription
        resp = await test_client.post(
            "/api/upload",
            files={"file": ("test.wav", wav_bytes, "audio/wav")},
            data={"profile": "generic"},
        )
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "pending"
    assert "id" in data


async def test_upload_default_profile(test_client, tmp_path):
    """Upload without profile should default to generic."""
    wav_path = str(tmp_path / "test.wav")
    create_test_wav(wav_path, duration_sec=0.5)
    with open(wav_path, "rb") as f:
        wav_bytes = f.read()

    with patch("app.main.asyncio.create_task"):
        resp = await test_client.post(
            "/api/upload",
            files={"file": ("test.wav", wav_bytes, "audio/wav")},
        )
    assert resp.status_code == 202


async def test_upload_with_each_profile(test_client, tmp_path):
    """Upload should accept each valid profile."""
    wav_path = str(tmp_path / "test.wav")
    create_test_wav(wav_path, duration_sec=0.5)
    with open(wav_path, "rb") as f:
        wav_bytes = f.read()

    for profile in ["generic", "business", "education", "medical", "legal"]:
        with patch("app.main.asyncio.create_task"):
            resp = await test_client.post(
                "/api/upload",
                files={"file": ("test.wav", wav_bytes, "audio/wav")},
                data={"profile": profile},
            )
        assert resp.status_code == 202, f"Profile {profile} failed"


async def test_upload_invalid_profile_falls_back(test_client, tmp_path):
    """Invalid profile should fallback to generic, not error."""
    wav_path = str(tmp_path / "test.wav")
    create_test_wav(wav_path, duration_sec=0.5)
    with open(wav_path, "rb") as f:
        wav_bytes = f.read()

    with patch("app.main.asyncio.create_task"):
        resp = await test_client.post(
            "/api/upload",
            files={"file": ("test.wav", wav_bytes, "audio/wav")},
            data={"profile": "nonexistent_profile"},
        )
    assert resp.status_code == 202

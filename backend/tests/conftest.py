"""Shared fixtures for ClearRecap tests."""
import json
import os
import struct
import sys
import wave
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Ensure backend app is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models import Base
from app.database import AsyncSessionLocal


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def test_db():
    """Create an in-memory SQLite DB for testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSession() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def test_client(tmp_path):
    """Create a test client with mocked Whisper and Ollama."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Patch the DB session — use try/finally to avoid shield() issues
    async def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            await session.close()

    # Import app and override deps
    from app.main import app, get_db
    app.dependency_overrides[get_db] = override_get_db

    # Patch uploads dir
    upload_dir = str(tmp_path / "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    # Mock subscription to return a valid sub (avoids 403 on subscription check)
    mock_sub = MagicMock()
    mock_sub.plan_id = "free"
    mock_sub.status = "active"

    with patch("app.main.UPLOAD_DIR", upload_dir), \
         patch("app.services.profile_service._profiles_cache", {}), \
         patch("app.main.AUTH_ENABLED", False), \
         patch("app.services.auth_service.AUTH_ENABLED", False), \
         patch("app.main.get_user_subscription", new=AsyncMock(return_value=mock_sub)), \
         patch("app.main.require_feature_check", new=AsyncMock(return_value=None)):
        # Force reload profiles from real JSON files
        from app.services.profile_service import reload_profiles
        reload_profiles()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    app.dependency_overrides.clear()
    await engine.dispose()


def create_test_wav(path: str, duration_sec: float = 1.0, sample_rate: int = 16000) -> str:
    """Generate a silent WAV file for testing."""
    n_samples = int(sample_rate * duration_sec)
    with wave.open(path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00\x00" * n_samples)
    return path


def make_mock_ollama_response(data: dict) -> dict:
    """Create a mock Ollama response."""
    return {"message": {"content": json.dumps(data)}}

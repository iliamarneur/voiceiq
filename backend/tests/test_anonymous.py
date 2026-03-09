"""Tests for anonymous session service (Simple mode)."""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models import Base, AnonymousSession
from app.services.anonymous_service import (
    get_or_create_session,
    increment_oneshot_count,
    can_use_oneshot,
    cleanup_expired,
    MAX_ONESHOT_PER_SESSION,
)


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSession() as session:
        yield session
    await engine.dispose()


@pytest.mark.anyio
async def test_create_new_session(db):
    session = await get_or_create_session(db, cookie_token=None, ip_address="127.0.0.1")
    assert session.id is not None
    assert session.cookie_token is not None
    assert session.oneshot_count == 0
    assert session.expires_at > datetime.utcnow()


@pytest.mark.anyio
async def test_retrieve_existing_session(db):
    s1 = await get_or_create_session(db, cookie_token=None)
    s2 = await get_or_create_session(db, cookie_token=s1.cookie_token)
    assert s1.id == s2.id


@pytest.mark.anyio
async def test_expired_session_resets(db):
    s1 = await get_or_create_session(db, cookie_token=None)
    await increment_oneshot_count(db, s1.id, "job-old")
    # Expire it manually
    s1.expires_at = datetime.utcnow() - timedelta(hours=1)
    await db.commit()

    s2 = await get_or_create_session(db, cookie_token=s1.cookie_token)
    # Same row reused but reset
    assert s2.id == s1.id
    assert s2.oneshot_count == 0
    assert s2.last_job_id is None
    assert s2.expires_at > datetime.utcnow()


@pytest.mark.anyio
async def test_increment_oneshot_count(db):
    session = await get_or_create_session(db, cookie_token=None)
    assert session.oneshot_count == 0

    await increment_oneshot_count(db, session.id, "job-123")
    await db.refresh(session)
    assert session.oneshot_count == 1
    assert session.last_job_id == "job-123"


@pytest.mark.anyio
async def test_can_use_oneshot_within_limit(db):
    session = await get_or_create_session(db, cookie_token=None)
    assert await can_use_oneshot(db, session.id) is True


@pytest.mark.anyio
async def test_can_use_oneshot_at_limit(db):
    session = await get_or_create_session(db, cookie_token=None)
    session.oneshot_count = MAX_ONESHOT_PER_SESSION
    await db.commit()
    assert await can_use_oneshot(db, session.id) is False


@pytest.mark.anyio
async def test_cleanup_expired(db):
    # Create 2 expired and 1 valid
    for _ in range(2):
        s = await get_or_create_session(db, cookie_token=None)
        s.expires_at = datetime.utcnow() - timedelta(hours=1)
    await db.commit()
    valid = await get_or_create_session(db, cookie_token=None)

    deleted = await cleanup_expired(db)
    assert deleted == 2

    # Valid session still exists
    assert await can_use_oneshot(db, valid.id) is True

"""Tests for multi-user isolation — user_id on Transcription, UserDictionary, AudioPreset."""
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models import (
    Base, Transcription, UserDictionary, AudioPreset, DictationSession,
    Job, Plan,
)
from app.services.subscription_service import seed_plans
from app.services.dictionary_service import (
    get_all_dictionaries, create_dictionary, check_dictionary_limit,
)


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSession() as session:
        await seed_plans(session)
        yield session
    await engine.dispose()


# ── Transcription user_id ─────────────────────────────────

@pytest.mark.asyncio
async def test_transcription_has_user_id(db):
    """Transcription model has user_id field."""
    job = Job(file_path="test.mp3", user_id="user-1")
    db.add(job)
    await db.flush()

    t = Transcription(
        filename="test.mp3", text="Hello", job_id=job.id, user_id="user-1"
    )
    db.add(t)
    await db.commit()

    result = await db.execute(select(Transcription).where(Transcription.user_id == "user-1"))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_transcription_default_user_id(db):
    """Transcription defaults to 'default' user_id."""
    job = Job(file_path="test.mp3")
    db.add(job)
    await db.flush()

    t = Transcription(filename="test.mp3", text="Hello", job_id=job.id)
    db.add(t)
    await db.commit()
    await db.refresh(t)
    assert t.user_id == "default"


@pytest.mark.asyncio
async def test_transcription_isolation(db):
    """Transcriptions are isolated by user_id."""
    job1 = Job(file_path="a.mp3", user_id="alice")
    job2 = Job(file_path="b.mp3", user_id="bob")
    db.add_all([job1, job2])
    await db.flush()

    t1 = Transcription(filename="a.mp3", text="Alice", job_id=job1.id, user_id="alice")
    t2 = Transcription(filename="b.mp3", text="Bob", job_id=job2.id, user_id="bob")
    db.add_all([t1, t2])
    await db.commit()

    alice_result = await db.execute(select(Transcription).where(Transcription.user_id == "alice"))
    assert len(alice_result.scalars().all()) == 1

    bob_result = await db.execute(select(Transcription).where(Transcription.user_id == "bob"))
    assert len(bob_result.scalars().all()) == 1


# ── UserDictionary user_id ────────────────────────────────

@pytest.mark.asyncio
async def test_dictionary_has_user_id(db):
    """UserDictionary model has user_id field."""
    d = await create_dictionary("Test Dict", "desc", db, user_id="user-1")
    assert d.user_id == "user-1"


@pytest.mark.asyncio
async def test_dictionary_isolation(db):
    """Dictionaries are isolated by user_id."""
    await create_dictionary("Alice Dict", "", db, user_id="alice")
    await create_dictionary("Bob Dict", "", db, user_id="bob")

    alice_dicts = await get_all_dictionaries(db, user_id="alice")
    assert len(alice_dicts) == 1
    assert alice_dicts[0].name == "Alice Dict"

    bob_dicts = await get_all_dictionaries(db, user_id="bob")
    assert len(bob_dicts) == 1
    assert bob_dicts[0].name == "Bob Dict"


@pytest.mark.asyncio
async def test_dictionary_limit_per_user(db):
    """Dictionary limit is checked per user, not globally."""
    # Basic plan allows 1 dictionary
    from app.models import UserSubscription
    sub = UserSubscription(user_id="alice", plan_id="basic", status="active")
    db.add(sub)
    await db.commit()

    # Alice creates 1 dict — should work
    await create_dictionary("Alice Dict 1", "", db, user_id="alice")

    # Bob creates 1 dict (no subscription = no limit)
    await create_dictionary("Bob Dict 1", "", db, user_id="bob")

    # Verify alice's count doesn't include bob's
    alice_dicts = await get_all_dictionaries(db, user_id="alice")
    assert len(alice_dicts) == 1


# ── AudioPreset user_id ──────────────────────────────────

@pytest.mark.asyncio
async def test_preset_has_user_id(db):
    """AudioPreset model has user_id field."""
    preset = AudioPreset(user_id="user-1", name="My Preset")
    db.add(preset)
    await db.commit()
    await db.refresh(preset)
    assert preset.user_id == "user-1"


@pytest.mark.asyncio
async def test_preset_isolation(db):
    """Presets are isolated by user_id."""
    p1 = AudioPreset(user_id="alice", name="Alice Preset")
    p2 = AudioPreset(user_id="bob", name="Bob Preset")
    db.add_all([p1, p2])
    await db.commit()

    alice_result = await db.execute(select(AudioPreset).where(AudioPreset.user_id == "alice"))
    assert len(alice_result.scalars().all()) == 1

    bob_result = await db.execute(select(AudioPreset).where(AudioPreset.user_id == "bob"))
    assert len(bob_result.scalars().all()) == 1


# ── DictationSession user_id ─────────────────────────────

@pytest.mark.asyncio
async def test_dictation_session_has_user_id(db):
    """DictationSession model has user_id field."""
    session = DictationSession(user_id="user-1")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    assert session.user_id == "user-1"

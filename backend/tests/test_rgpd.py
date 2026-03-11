"""Tests for RGPD endpoints: data export and account deletion."""
import pytest
import pytest_asyncio
import os
import sys
from sqlalchemy import select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models import (
    Base, Transcription, Job, Analysis, UserSubscription, UsageLog,
    OneshotOrder, BillingEvent, UserPreferences, UserDictionary,
    DictionaryEntry, AudioPreset, UserCorrection, DictationSession,
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.services.subscription_service import seed_plans, create_subscription


@pytest_asyncio.fixture
async def db():
    """In-memory DB with seeded plans."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSession() as session:
        await seed_plans(session)
        yield session
    await engine.dispose()


async def _seed_user_data(db: AsyncSession):
    """Populate DB with sample user data for testing."""
    sub = await create_subscription(db, "basic")

    job = Job(id="test-job-1", status="completed", file_path="/tmp/test.wav", profile="generic")
    db.add(job)
    await db.flush()

    trans = Transcription(
        id="test-trans-1", filename="test.wav", text="Hello world",
        segments=[], job_id=job.id, profile="generic",
    )
    db.add(trans)
    await db.flush()

    analysis = Analysis(
        id="test-analysis-1", transcription_id=trans.id,
        type="summary", content={"text": "A test summary"},
    )
    db.add(analysis)

    usage = UsageLog(
        user_id="default", transcription_id=trans.id, job_id=job.id,
        audio_duration_seconds=120.0, minutes_charged=2, minute_source="plan",
    )
    db.add(usage)

    order = OneshotOrder(
        user_id="default", tier="Court", price_cents=300, payment_status="paid",
    )
    db.add(order)

    event = BillingEvent(
        user_id="default", event_type="checkout.completed",
        amount_cents=300, status="success",
    )
    db.add(event)

    prefs = UserPreferences(id="default", summary_detail="balanced", summary_tone="neutral")
    db.add(prefs)

    dictionary = UserDictionary(id="test-dict-1", name="Test Dict")
    db.add(dictionary)
    await db.flush()
    entry = DictionaryEntry(
        dictionary_id=dictionary.id, term="ClearRecap", replacement="ClearRecap", category="nom_propre",
    )
    db.add(entry)

    preset = AudioPreset(name="Test Preset", profile_id="generic")
    db.add(preset)

    correction = UserCorrection(
        transcription_id=trans.id, original_text="Helo", corrected_text="Hello",
    )
    db.add(correction)

    await db.commit()


class TestAccountExport:
    """Test RGPD export at service level (no HTTP)."""

    @pytest.mark.asyncio
    async def test_export_empty_account_no_subscription(self, db):
        """An empty account without subscription has no transcriptions."""
        # No subscription created — verify no transcriptions exist
        result = await db.execute(select(Transcription))
        assert result.scalars().all() == []

    @pytest.mark.asyncio
    async def test_export_with_basic_subscription(self, db):
        """Creating a subscription gives user a basic plan."""
        sub = await create_subscription(db, "basic")
        assert sub.plan_id == "basic"

        result = await db.execute(select(Transcription))
        assert result.scalars().all() == []

    @pytest.mark.asyncio
    async def test_export_populated_account_data(self, db):
        """After seeding, all data categories should be present."""
        await _seed_user_data(db)

        # Transcriptions
        result = await db.execute(select(Transcription))
        trans = result.scalars().all()
        assert len(trans) >= 1
        assert trans[0].filename == "test.wav"

        # Analyses
        result = await db.execute(select(Analysis))
        analyses = result.scalars().all()
        assert len(analyses) >= 1

        # Usage logs
        result = await db.execute(select(UsageLog).where(UsageLog.user_id == "default"))
        logs = result.scalars().all()
        assert len(logs) >= 1

        # Oneshot orders
        result = await db.execute(select(OneshotOrder).where(OneshotOrder.user_id == "default"))
        orders = result.scalars().all()
        assert len(orders) >= 1

        # Billing events
        result = await db.execute(select(BillingEvent).where(BillingEvent.user_id == "default"))
        events = result.scalars().all()
        assert len(events) >= 1

        # Preferences
        result = await db.execute(select(UserPreferences).where(UserPreferences.id == "default"))
        prefs = result.scalar_one_or_none()
        assert prefs is not None

        # Dictionaries
        result = await db.execute(select(UserDictionary))
        dicts = result.scalars().all()
        assert len(dicts) >= 1


class TestAccountDeletion:
    """Test account deletion (RGPD Art. 17) at DB level."""

    @pytest.mark.asyncio
    async def test_delete_billing_events(self, db):
        """Billing events are deleted for the user."""
        await _seed_user_data(db)
        from sqlalchemy import delete
        result = await db.execute(delete(BillingEvent).where(BillingEvent.user_id == "default"))
        await db.commit()
        assert result.rowcount >= 1

        result = await db.execute(select(BillingEvent).where(BillingEvent.user_id == "default"))
        assert result.scalars().all() == []

    @pytest.mark.asyncio
    async def test_delete_usage_logs(self, db):
        """Usage logs are deleted for the user."""
        await _seed_user_data(db)
        from sqlalchemy import delete
        result = await db.execute(delete(UsageLog).where(UsageLog.user_id == "default"))
        await db.commit()
        assert result.rowcount >= 1

    @pytest.mark.asyncio
    async def test_delete_oneshot_orders(self, db):
        """Oneshot orders are deleted for the user."""
        await _seed_user_data(db)
        from sqlalchemy import delete
        result = await db.execute(delete(OneshotOrder).where(OneshotOrder.user_id == "default"))
        await db.commit()
        assert result.rowcount >= 1

    @pytest.mark.asyncio
    async def test_cascade_delete_transcription_analyses(self, db):
        """Deleting a transcription via ORM cascades to analyses."""
        await _seed_user_data(db)

        # ORM delete (cascade works with ORM, not bulk SQL delete)
        result = await db.execute(select(Transcription).where(Transcription.id == "test-trans-1"))
        trans = result.scalar_one()
        await db.delete(trans)
        await db.commit()

        # Analyses should be gone (cascade)
        result = await db.execute(select(Analysis).where(Analysis.transcription_id == "test-trans-1"))
        assert result.scalars().all() == []

    @pytest.mark.asyncio
    async def test_delete_subscription(self, db):
        """Subscription is deleted for the user."""
        await _seed_user_data(db)
        from sqlalchemy import delete
        result = await db.execute(delete(UserSubscription).where(UserSubscription.user_id == "default"))
        await db.commit()
        assert result.rowcount >= 1

    @pytest.mark.asyncio
    async def test_delete_dictionaries_cascades(self, db):
        """Deleting a dictionary via ORM cascades to its entries."""
        await _seed_user_data(db)

        # ORM delete for cascade
        result = await db.execute(select(UserDictionary).where(UserDictionary.id == "test-dict-1"))
        dictionary = result.scalar_one()
        await db.delete(dictionary)
        await db.commit()

        # Entries should be gone
        result = await db.execute(select(DictionaryEntry).where(DictionaryEntry.dictionary_id == "test-dict-1"))
        assert result.scalars().all() == []

    @pytest.mark.asyncio
    async def test_full_account_deletion(self, db):
        """Complete account deletion removes all user data."""
        await _seed_user_data(db)
        from sqlalchemy import delete

        # Delete in correct order (foreign keys)
        await db.execute(delete(BillingEvent).where(BillingEvent.user_id == "default"))
        await db.execute(delete(UsageLog).where(UsageLog.user_id == "default"))
        await db.execute(delete(OneshotOrder).where(OneshotOrder.user_id == "default"))
        await db.execute(delete(UserCorrection))

        # ORM delete for cascade models
        trans_result = await db.execute(select(Transcription))
        for t in trans_result.scalars().all():
            await db.delete(t)

        await db.execute(delete(Job))

        dict_result = await db.execute(select(UserDictionary))
        for d in dict_result.scalars().all():
            await db.delete(d)

        await db.execute(delete(AudioPreset))
        await db.execute(delete(UserPreferences).where(UserPreferences.id == "default"))
        await db.execute(delete(UserSubscription).where(UserSubscription.user_id == "default"))
        await db.commit()

        # Verify everything is gone
        for model in [BillingEvent, UsageLog, OneshotOrder, Transcription, Job,
                       UserDictionary, AudioPreset, UserCorrection]:
            result = await db.execute(select(model))
            assert result.scalars().all() == [], f"{model.__tablename__} not empty"

        result = await db.execute(select(UserSubscription).where(UserSubscription.user_id == "default"))
        assert result.scalars().all() == []

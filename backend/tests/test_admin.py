"""Tests for admin service."""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models import (
    Base, Plan, UserSubscription, UsageLog, Job, Transcription,
    BillingEvent, OneshotOrder,
)
from app.services.admin_service import (
    calculate_mrr,
    count_active_subscriptions,
    total_minutes_current_period,
    total_transcriptions_count,
    calculate_error_rate,
    get_queue_jobs,
    get_recent_billing_events,
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


async def _seed_plans(db):
    """Add standard plans."""
    db.add(Plan(id="free", name="Gratuit", price_cents=0, minutes_included=60, features=["transcription"]))
    db.add(Plan(id="pro", name="Pro", price_cents=4900, minutes_included=2000, features=["transcription", "chat"]))
    db.add(Plan(id="team", name="Team", price_cents=9900, minutes_included=5000, features=["transcription", "chat", "multi_workspace"]))
    await db.commit()


@pytest.mark.anyio
async def test_mrr_no_subscriptions(db):
    await _seed_plans(db)
    mrr = await calculate_mrr(db)
    assert mrr == 0


@pytest.mark.anyio
async def test_mrr_with_paid_subscriptions(db):
    await _seed_plans(db)
    db.add(UserSubscription(user_id="u1", plan_id="pro", status="active"))
    db.add(UserSubscription(user_id="u2", plan_id="team", status="active"))
    db.add(UserSubscription(user_id="u3", plan_id="free", status="active"))
    await db.commit()

    mrr = await calculate_mrr(db)
    assert mrr == 4900 + 9900  # free excluded


@pytest.mark.anyio
async def test_count_active_subscriptions(db):
    await _seed_plans(db)
    db.add(UserSubscription(user_id="u1", plan_id="pro", status="active"))
    db.add(UserSubscription(user_id="u2", plan_id="free", status="active"))
    db.add(UserSubscription(user_id="u3", plan_id="pro", status="cancelled"))
    await db.commit()

    count = await count_active_subscriptions(db)
    assert count == 2  # cancelled excluded


@pytest.mark.anyio
async def test_total_minutes_this_month(db):
    db.add(UsageLog(user_id="u1", minutes_charged=10, audio_duration_seconds=600))
    db.add(UsageLog(user_id="u2", minutes_charged=25, audio_duration_seconds=1500))
    await db.commit()

    total = await total_minutes_current_period(db)
    assert total == 35


@pytest.mark.anyio
async def test_total_transcriptions(db):
    db.add(Job(id="j1", file_path="/tmp/a.wav", status="completed"))
    db.add(Job(id="j2", file_path="/tmp/b.wav", status="completed"))
    db.add(Transcription(id="t1", filename="a.wav", text="hello", job_id="j1"))
    db.add(Transcription(id="t2", filename="b.wav", text="world", job_id="j2"))
    await db.commit()

    count = await total_transcriptions_count(db)
    assert count == 2


@pytest.mark.anyio
async def test_error_rate_no_jobs(db):
    rate = await calculate_error_rate(db)
    assert rate == 0.0


@pytest.mark.anyio
async def test_error_rate_with_failures(db):
    # 8 completed + 2 failed = 20% error rate
    for i in range(8):
        db.add(Job(id=f"ok-{i}", file_path="/tmp/ok.wav", status="completed"))
    for i in range(2):
        db.add(Job(id=f"fail-{i}", file_path="/tmp/fail.wav", status="failed"))
    await db.commit()

    rate = await calculate_error_rate(db)
    assert rate == 20.0


@pytest.mark.anyio
async def test_queue_jobs(db):
    db.add(Job(id="q1", file_path="/tmp/a.wav", status="processing", priority="P0"))
    db.add(Job(id="q2", file_path="/tmp/b.wav", status="pending", priority="P1"))
    db.add(Job(id="done", file_path="/tmp/c.wav", status="completed", priority="P1"))
    await db.commit()

    queue = await get_queue_jobs(db)
    assert len(queue) == 2
    ids = {j["id"] for j in queue}
    assert "q1" in ids
    assert "q2" in ids
    assert "done" not in ids


@pytest.mark.anyio
async def test_billing_events(db):
    db.add(BillingEvent(user_id="u1", event_type="checkout.completed", amount_cents=4900, status="success"))
    db.add(BillingEvent(user_id="u2", event_type="pack.purchased", amount_cents=300, status="success"))
    await db.commit()

    events = await get_recent_billing_events(db)
    assert len(events) == 2
    assert all(e["status"] == "success" for e in events)

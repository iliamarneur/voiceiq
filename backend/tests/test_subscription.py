"""Tests for subscription, plans, alerts, and one-shot logic."""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models import Base, Plan, UserSubscription, UsageLog, OneshotOrder
from app.services.subscription_service import (
    seed_plans, get_or_create_subscription, get_subscription_info,
    change_plan, check_minutes_available, consume_minutes,
    add_extra_minutes, get_subscription_alerts,
    estimate_oneshot_tier, create_oneshot_order,
    get_config,
)


# ── Fixtures ─────────────────────────────────────────────

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


@pytest_asyncio.fixture
async def api_client(tmp_path):
    """Test client with seeded plans."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Seed plans
    async with TestSession() as session:
        await seed_plans(session)

    async def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            await session.close()

    from app.main import app, get_db
    from unittest.mock import patch
    app.dependency_overrides[get_db] = override_get_db

    upload_dir = str(tmp_path / "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    with patch("app.main.UPLOAD_DIR", upload_dir), \
         patch("app.services.profile_service._profiles_cache", {}):
        from app.services.profile_service import reload_profiles
        reload_profiles()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    app.dependency_overrides.clear()
    await engine.dispose()


# ── Config Tests ─────────────────────────────────────────

class TestConfig:
    def test_config_loads(self):
        cfg = get_config()
        assert "plans" in cfg
        assert "extra_packs" in cfg
        assert "oneshot_tiers" in cfg
        assert "alert_thresholds" in cfg

    def test_config_has_4_plans(self):
        cfg = get_config()
        assert len(cfg["plans"]) == 4
        plan_ids = [p["id"] for p in cfg["plans"]]
        assert set(plan_ids) == {"free", "basic", "pro", "team"}

    def test_free_plan_has_60_minutes(self):
        cfg = get_config()
        free = next(p for p in cfg["plans"] if p["id"] == "free")
        assert free["minutes_included"] == 60

    def test_alert_thresholds(self):
        cfg = get_config()
        assert cfg["alert_thresholds"]["warning_percent"] == 75
        assert cfg["alert_thresholds"]["critical_percent"] == 90


# ── Unit Tests: Subscription ─────────────────────────────

class TestSubscription:
    @pytest.mark.asyncio
    async def test_seed_creates_4_plans(self, db):
        from sqlalchemy import select
        result = await db.execute(select(Plan))
        plans = result.scalars().all()
        assert len(plans) == 4

    @pytest.mark.asyncio
    async def test_free_plan_60_minutes(self, db):
        from sqlalchemy import select
        result = await db.execute(select(Plan).where(Plan.id == "free"))
        plan = result.scalar_one()
        assert plan.minutes_included == 60

    @pytest.mark.asyncio
    async def test_default_subscription_is_free(self, db):
        sub = await get_or_create_subscription(db)
        assert sub.plan_id == "free"
        assert sub.minutes_used == 0

    @pytest.mark.asyncio
    async def test_change_plan_to_pro(self, db):
        await get_or_create_subscription(db)
        sub = await change_plan(db, "pro")
        assert sub.plan_id == "pro"
        assert sub.minutes_used == 0

    @pytest.mark.asyncio
    async def test_change_plan_invalid_raises(self, db):
        await get_or_create_subscription(db)
        with pytest.raises(ValueError, match="not found"):
            await change_plan(db, "nonexistent")

    @pytest.mark.asyncio
    async def test_subscription_info_has_correct_fields(self, db):
        info = await get_subscription_info(db)
        assert "plan_id" in info
        assert "minutes_used" in info
        assert "minutes_included" in info
        assert "minutes_remaining" in info
        assert "extra_minutes_balance" in info
        assert info["minutes_included"] == 60  # free plan


# ── Unit Tests: Minutes Consumption ──────────────────────

class TestMinutesConsumption:
    @pytest.mark.asyncio
    async def test_consume_from_plan(self, db):
        await change_plan(db, "basic")  # 300 min
        log = await consume_minutes(db, audio_duration_seconds=120)  # 2 min
        assert log.minutes_charged == 2
        assert log.minute_source == "plan"
        info = await get_subscription_info(db)
        assert info["minutes_used"] == 2
        assert info["minutes_remaining"] == 298

    @pytest.mark.asyncio
    async def test_consume_overflow_to_extra(self, db):
        # Free plan with 60 min, use 59, then add extra, then consume 5
        sub = await get_or_create_subscription(db)
        sub.minutes_used = 59
        await db.commit()
        await add_extra_minutes(db, "S")  # +100 extra
        log = await consume_minutes(db, audio_duration_seconds=300)  # 5 min
        # 1 min from plan + 4 min from extra
        assert log.minute_source == "plan+extra"
        info = await get_subscription_info(db)
        assert info["minutes_used"] == 60
        assert info["extra_minutes_balance"] == 96

    @pytest.mark.asyncio
    async def test_consume_from_extra_only(self, db):
        # Exhaust plan minutes
        sub = await get_or_create_subscription(db)
        sub.minutes_used = 60  # free plan fully used
        await db.commit()
        await add_extra_minutes(db, "S")  # +100 extra
        log = await consume_minutes(db, audio_duration_seconds=180)  # 3 min
        assert log.minute_source == "extra"
        info = await get_subscription_info(db)
        assert info["extra_minutes_balance"] == 97

    @pytest.mark.asyncio
    async def test_check_minutes_available(self, db):
        result = await check_minutes_available(db)
        assert result["available"] is True
        assert result["total_available"] == 60  # free plan


# ── Unit Tests: Extra Packs ──────────────────────────────

class TestExtraPacks:
    @pytest.mark.asyncio
    async def test_add_pack_s(self, db):
        result = await add_extra_minutes(db, "S")
        assert result["minutes_added"] == 100
        assert result["new_extra_balance"] == 100

    @pytest.mark.asyncio
    async def test_add_pack_m(self, db):
        result = await add_extra_minutes(db, "M")
        assert result["minutes_added"] == 500

    @pytest.mark.asyncio
    async def test_add_pack_l(self, db):
        result = await add_extra_minutes(db, "L")
        assert result["minutes_added"] == 2000

    @pytest.mark.asyncio
    async def test_add_invalid_pack_raises(self, db):
        with pytest.raises(ValueError, match="Unknown pack"):
            await add_extra_minutes(db, "XL")

    @pytest.mark.asyncio
    async def test_monthly_reset_preserves_extras(self, db):
        await add_extra_minutes(db, "S")  # +100 extra
        sub = await get_or_create_subscription(db)
        # Simulate period expiration
        sub.current_period_end = datetime.utcnow() - timedelta(days=1)
        await db.commit()
        # This triggers period renewal
        sub = await get_or_create_subscription(db)
        assert sub.minutes_used == 0  # reset
        assert sub.extra_minutes_balance == 100  # preserved


# ── Unit Tests: Alerts ───────────────────────────────────

class TestAlerts:
    @pytest.mark.asyncio
    async def test_no_alert_below_75(self, db):
        # Free plan: 60 min, use 40 (66%)
        sub = await get_or_create_subscription(db)
        sub.minutes_used = 40
        await db.commit()
        result = await get_subscription_alerts(db)
        assert result["alerts"] == []
        assert result["usage_percent"] == pytest.approx(66.7, abs=0.1)

    @pytest.mark.asyncio
    async def test_warning_at_75(self, db):
        sub = await get_or_create_subscription(db)
        sub.minutes_used = 45  # 75% of 60
        await db.commit()
        result = await get_subscription_alerts(db)
        assert len(result["alerts"]) == 1
        assert result["alerts"][0]["level"] == "warning"

    @pytest.mark.asyncio
    async def test_critical_at_90(self, db):
        sub = await get_or_create_subscription(db)
        sub.minutes_used = 55  # 91.7% of 60
        await db.commit()
        result = await get_subscription_alerts(db)
        assert len(result["alerts"]) == 1
        assert result["alerts"][0]["level"] == "critical"

    @pytest.mark.asyncio
    async def test_blocked_at_100(self, db):
        sub = await get_or_create_subscription(db)
        sub.minutes_used = 60  # 100%
        await db.commit()
        result = await get_subscription_alerts(db)
        assert len(result["alerts"]) == 1
        assert result["alerts"][0]["level"] == "blocked"


# ── Unit Tests: One-shot ─────────────────────────────────

class TestOneshot:
    def test_estimate_tier_court(self):
        result = estimate_oneshot_tier(1500)  # 25 min
        assert result["tier"] == "Court"
        assert result["price_cents"] == 300

    def test_estimate_tier_standard(self):
        result = estimate_oneshot_tier(2700)  # 45 min
        assert result["tier"] == "Standard"
        assert result["price_cents"] == 400

    def test_estimate_tier_long(self):
        result = estimate_oneshot_tier(4800)  # 80 min
        assert result["tier"] == "Long"
        assert result["price_cents"] == 500

    def test_estimate_over_90_returns_long_with_warning(self):
        result = estimate_oneshot_tier(6000)  # 100 min
        assert result["tier"] == "Long"
        assert "warning" in result

    @pytest.mark.asyncio
    async def test_create_order(self, db):
        order = await create_oneshot_order(db, "Standard", audio_duration_seconds=2700)
        assert order.tier == "Standard"
        assert order.price_cents == 400
        assert order.payment_status == "paid"

    @pytest.mark.asyncio
    async def test_create_order_invalid_tier(self, db):
        with pytest.raises(ValueError, match="Unknown tier"):
            await create_oneshot_order(db, "XL")


# ── API Integration Tests ────────────────────────────────

class TestAPIPlans:
    @pytest.mark.asyncio
    async def test_get_plans_returns_4(self, api_client):
        resp = await api_client.get("/api/plans")
        assert resp.status_code == 200
        assert len(resp.json()) == 4

    @pytest.mark.asyncio
    async def test_free_plan_60_minutes(self, api_client):
        resp = await api_client.get("/api/plans")
        free = next(p for p in resp.json() if p["id"] == "free")
        assert free["minutes_included"] == 60


class TestAPISubscription:
    @pytest.mark.asyncio
    async def test_get_subscription_default_free(self, api_client):
        resp = await api_client.get("/api/subscription")
        assert resp.status_code == 200
        assert resp.json()["plan_id"] == "free"
        assert resp.json()["minutes_included"] == 60

    @pytest.mark.asyncio
    async def test_change_plan_to_pro(self, api_client):
        resp = await api_client.put("/api/subscription/plan", json={"plan_id": "pro"})
        assert resp.status_code == 200
        assert resp.json()["plan_id"] == "pro"
        assert resp.json()["minutes_included"] == 2000

    @pytest.mark.asyncio
    async def test_buy_extra_pack(self, api_client):
        resp = await api_client.post("/api/subscription/add-minutes", json={"pack": "M"})
        assert resp.status_code == 200
        assert resp.json()["minutes_added"] == 500

    @pytest.mark.asyncio
    async def test_get_extra_packs(self, api_client):
        resp = await api_client.get("/api/subscription/extra-packs")
        assert resp.status_code == 200
        packs = resp.json()
        assert len(packs) == 3
        pack_ids = [p["pack"] for p in packs]
        assert set(pack_ids) == {"S", "M", "L"}


class TestAPIAlerts:
    @pytest.mark.asyncio
    async def test_alerts_empty_when_low_usage(self, api_client):
        resp = await api_client.get("/api/subscription/alerts")
        assert resp.status_code == 200
        assert resp.json()["alerts"] == []
        assert resp.json()["usage_percent"] == 0

    @pytest.mark.asyncio
    async def test_alerts_endpoint_returns_structure(self, api_client):
        resp = await api_client.get("/api/subscription/alerts")
        data = resp.json()
        assert "alerts" in data
        assert "usage_percent" in data
        assert "minutes_remaining" in data
        assert "minutes_included" in data
        assert "extra_minutes_balance" in data


class TestAPIOneshot:
    @pytest.mark.asyncio
    async def test_get_tiers(self, api_client):
        resp = await api_client.get("/api/oneshot/tiers")
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    @pytest.mark.asyncio
    async def test_estimate_tier_standard(self, api_client):
        resp = await api_client.post("/api/oneshot/estimate", json={"duration_seconds": 2700})
        assert resp.status_code == 200
        assert resp.json()["tier"] == "Standard"
        assert resp.json()["price_cents"] == 400

    @pytest.mark.asyncio
    async def test_create_order(self, api_client):
        resp = await api_client.post("/api/oneshot/order", json={"tier": "Court", "duration_seconds": 1200})
        assert resp.status_code == 200
        assert resp.json()["tier"] == "Court"
        assert resp.json()["payment_status"] == "paid"

    @pytest.mark.asyncio
    async def test_usage_summary(self, api_client):
        resp = await api_client.get("/api/usage/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["plan_id"] == "free"
        assert data["minutes_included"] == 60

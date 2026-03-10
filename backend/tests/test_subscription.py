"""Tests for subscription, plans, alerts, and one-shot logic."""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Ensure Stripe runs in stub mode during tests
os.environ.pop("STRIPE_SECRET_KEY", None)

from app.models import Base, Plan, UserSubscription, UsageLog, OneshotOrder
from app.services.subscription_service import (
    seed_plans, get_subscription, create_subscription, get_subscription_info,
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

    # Force Stripe into stub mode during tests
    os.environ.pop("STRIPE_SECRET_KEY", None)
    import app.services.stripe_service as _ss
    _ss._stripe = None

    with patch("app.main.UPLOAD_DIR", upload_dir), \
         patch("app.services.profile_service._profiles_cache", {}), \
         patch("app.services.auth_service.AUTH_ENABLED", False):
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

    def test_config_has_3_plans(self):
        cfg = get_config()
        assert len(cfg["plans"]) == 3
        plan_ids = [p["id"] for p in cfg["plans"]]
        assert set(plan_ids) == {"basic", "pro", "team"}

    def test_basic_plan_has_500_minutes(self):
        cfg = get_config()
        basic = next(p for p in cfg["plans"] if p["id"] == "basic")
        assert basic["minutes_included"] == 500

    def test_pro_plan_has_3000_minutes(self):
        cfg = get_config()
        pro = next(p for p in cfg["plans"] if p["id"] == "pro")
        assert pro["minutes_included"] == 3000

    def test_team_plan_has_10000_minutes(self):
        cfg = get_config()
        team = next(p for p in cfg["plans"] if p["id"] == "team")
        assert team["minutes_included"] == 10000

    def test_alert_thresholds(self):
        cfg = get_config()
        assert cfg["alert_thresholds"]["warning_percent"] == 75
        assert cfg["alert_thresholds"]["critical_percent"] == 90

    def test_config_has_6_oneshot_tiers(self):
        cfg = get_config()
        assert len(cfg["oneshot_tiers"]) == 6
        assert set(cfg["oneshot_tiers"].keys()) == {"Court", "Standard", "Long", "XLong", "XXLong", "XXXLong"}


# ── Unit Tests: Subscription ─────────────────────────────

class TestSubscription:
    @pytest.mark.asyncio
    async def test_seed_creates_3_plans(self, db):
        from sqlalchemy import select
        result = await db.execute(select(Plan))
        plans = result.scalars().all()
        assert len(plans) == 3

    @pytest.mark.asyncio
    async def test_basic_plan_500_minutes(self, db):
        from sqlalchemy import select
        result = await db.execute(select(Plan).where(Plan.id == "basic"))
        plan = result.scalar_one()
        assert plan.minutes_included == 500

    @pytest.mark.asyncio
    async def test_no_subscription_by_default(self, db):
        sub = await get_subscription(db)
        assert sub is None

    @pytest.mark.asyncio
    async def test_create_subscription_basic(self, db):
        sub = await create_subscription(db, "basic")
        assert sub.plan_id == "basic"
        assert sub.minutes_used == 0

    @pytest.mark.asyncio
    async def test_change_plan_to_pro(self, db):
        await create_subscription(db, "basic")
        sub = await change_plan(db, "pro")
        assert sub.plan_id == "pro"
        assert sub.minutes_used == 0

    @pytest.mark.asyncio
    async def test_change_plan_invalid_raises(self, db):
        await create_subscription(db, "basic")
        with pytest.raises(ValueError, match="not found"):
            await change_plan(db, "nonexistent")

    @pytest.mark.asyncio
    async def test_subscription_info_has_correct_fields(self, db):
        await create_subscription(db, "basic")
        info = await get_subscription_info(db)
        assert "plan_id" in info
        assert "minutes_used" in info
        assert "minutes_included" in info
        assert "minutes_remaining" in info
        assert "extra_minutes_balance" in info
        assert info["minutes_included"] == 500  # basic plan

    @pytest.mark.asyncio
    async def test_subscription_info_no_sub(self, db):
        """Without subscription, info returns zeros."""
        info = await get_subscription_info(db)
        assert info["plan_id"] is None
        assert info["minutes_included"] == 0
        assert info["minutes_remaining"] == 0


# ── Unit Tests: Minutes Consumption ──────────────────────

class TestMinutesConsumption:
    @pytest.mark.asyncio
    async def test_consume_from_plan(self, db):
        await create_subscription(db, "basic")  # 500 min
        log = await consume_minutes(db, audio_duration_seconds=120)  # 2 min
        assert log.minutes_charged == 2
        assert log.minute_source == "plan"
        info = await get_subscription_info(db)
        assert info["minutes_used"] == 2
        assert info["minutes_remaining"] == 498

    @pytest.mark.asyncio
    async def test_consume_overflow_to_extra(self, db):
        # Basic plan with 500 min, use 499, then add extra, then consume 5
        sub = await create_subscription(db, "basic")
        sub.minutes_used = 499
        await db.commit()
        await add_extra_minutes(db, "S")  # +100 extra
        log = await consume_minutes(db, audio_duration_seconds=300)  # 5 min
        # 1 min from plan + 4 min from extra
        assert log.minute_source == "plan+extra"
        info = await get_subscription_info(db)
        assert info["minutes_used"] == 500
        assert info["extra_minutes_balance"] == 96

    @pytest.mark.asyncio
    async def test_consume_from_extra_only(self, db):
        # Exhaust plan minutes
        sub = await create_subscription(db, "basic")
        sub.minutes_used = 500  # basic plan fully used
        await db.commit()
        await add_extra_minutes(db, "S")  # +100 extra
        log = await consume_minutes(db, audio_duration_seconds=180)  # 3 min
        assert log.minute_source == "extra"
        info = await get_subscription_info(db)
        assert info["extra_minutes_balance"] == 97

    @pytest.mark.asyncio
    async def test_check_minutes_available(self, db):
        await create_subscription(db, "basic")
        result = await check_minutes_available(db)
        assert result["available"] is True
        assert result["total_available"] == 500  # basic plan

    @pytest.mark.asyncio
    async def test_check_minutes_no_subscription(self, db):
        result = await check_minutes_available(db)
        assert result["available"] is False
        assert result["total_available"] == 0


# ── Unit Tests: Extra Packs ──────────────────────────────

class TestExtraPacks:
    @pytest.mark.asyncio
    async def test_add_pack_s(self, db):
        await create_subscription(db, "basic")
        result = await add_extra_minutes(db, "S")
        assert result["minutes_added"] == 100
        assert result["new_extra_balance"] == 100

    @pytest.mark.asyncio
    async def test_add_pack_m(self, db):
        await create_subscription(db, "basic")
        result = await add_extra_minutes(db, "M")
        assert result["minutes_added"] == 500

    @pytest.mark.asyncio
    async def test_add_pack_l(self, db):
        await create_subscription(db, "basic")
        result = await add_extra_minutes(db, "L")
        assert result["minutes_added"] == 2000

    @pytest.mark.asyncio
    async def test_add_invalid_pack_raises(self, db):
        await create_subscription(db, "basic")
        with pytest.raises(ValueError, match="Unknown pack"):
            await add_extra_minutes(db, "XL")


# ── Unit Tests: Alerts ───────────────────────────────────

class TestAlerts:
    @pytest.mark.asyncio
    async def test_no_alert_below_75(self, db):
        # Basic plan: 500 min, use 300 (60%)
        sub = await create_subscription(db, "basic")
        sub.minutes_used = 300
        await db.commit()
        result = await get_subscription_alerts(db)
        assert result["alerts"] == []
        assert result["usage_percent"] == 60.0

    @pytest.mark.asyncio
    async def test_warning_at_75(self, db):
        sub = await create_subscription(db, "basic")
        sub.minutes_used = 375  # 75% of 500
        await db.commit()
        result = await get_subscription_alerts(db)
        assert len(result["alerts"]) == 1
        assert result["alerts"][0]["level"] == "warning"

    @pytest.mark.asyncio
    async def test_critical_at_90(self, db):
        sub = await create_subscription(db, "basic")
        sub.minutes_used = 455  # 91% of 500
        await db.commit()
        result = await get_subscription_alerts(db)
        assert len(result["alerts"]) == 1
        assert result["alerts"][0]["level"] == "critical"

    @pytest.mark.asyncio
    async def test_blocked_at_100(self, db):
        sub = await create_subscription(db, "basic")
        sub.minutes_used = 500  # 100%
        await db.commit()
        result = await get_subscription_alerts(db)
        assert len(result["alerts"]) == 1
        assert result["alerts"][0]["level"] == "blocked"

    @pytest.mark.asyncio
    async def test_alerts_no_subscription(self, db):
        result = await get_subscription_alerts(db)
        assert result["usage_percent"] == 0
        # No subscription → blocked alert
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
        assert result["price_cents"] == 600

    def test_estimate_tier_long(self):
        result = estimate_oneshot_tier(4800)  # 80 min
        assert result["tier"] == "Long"
        assert result["price_cents"] == 900

    def test_estimate_tier_xlong(self):
        result = estimate_oneshot_tier(6000)  # 100 min
        assert result["tier"] == "XLong"
        assert result["price_cents"] == 1200

    def test_estimate_tier_xxlong(self):
        result = estimate_oneshot_tier(8400)  # 140 min
        assert result["tier"] == "XXLong"
        assert result["price_cents"] == 1500

    def test_estimate_tier_xxxlong(self):
        result = estimate_oneshot_tier(10200)  # 170 min
        assert result["tier"] == "XXXLong"
        assert result["price_cents"] == 1800

    def test_estimate_over_180_returns_xxxlong_with_warning(self):
        result = estimate_oneshot_tier(11000)  # ~183 min
        assert result["tier"] == "XXXLong"
        assert "warning" in result

    @pytest.mark.asyncio
    async def test_create_order(self, db):
        order = await create_oneshot_order(db, "Standard", audio_duration_seconds=2700)
        assert order.tier == "Standard"
        assert order.price_cents == 600
        assert order.payment_status == "paid"

    @pytest.mark.asyncio
    async def test_create_order_invalid_tier(self, db):
        with pytest.raises(ValueError, match="Unknown tier"):
            await create_oneshot_order(db, "XL")


# ── API Integration Tests ────────────────────────────────

class TestAPIPlans:
    @pytest.mark.asyncio
    async def test_get_plans_returns_3(self, api_client):
        resp = await api_client.get("/api/plans")
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    @pytest.mark.asyncio
    async def test_basic_plan_500_minutes(self, api_client):
        resp = await api_client.get("/api/plans")
        basic = next(p for p in resp.json() if p["id"] == "basic")
        assert basic["minutes_included"] == 500


class TestAPISubscription:
    @pytest.mark.asyncio
    async def test_get_subscription_no_plan(self, api_client):
        resp = await api_client.get("/api/subscription")
        assert resp.status_code == 200
        data = resp.json()
        assert data["plan_id"] is None
        assert data["minutes_included"] == 0

    @pytest.mark.asyncio
    async def test_change_plan_to_pro(self, api_client):
        resp = await api_client.put("/api/subscription/plan", json={"plan_id": "pro"})
        assert resp.status_code == 200
        assert resp.json()["plan_id"] == "pro"
        assert resp.json()["minutes_included"] == 3000


class TestAPIAlerts:
    @pytest.mark.asyncio
    async def test_alerts_blocked_when_no_subscription(self, api_client):
        resp = await api_client.get("/api/subscription/alerts")
        assert resp.status_code == 200
        assert resp.json()["usage_percent"] == 0
        # No subscription → blocked alert
        assert len(resp.json()["alerts"]) == 1
        assert resp.json()["alerts"][0]["level"] == "blocked"

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
        assert len(resp.json()) == 6

    @pytest.mark.asyncio
    async def test_estimate_tier_standard(self, api_client):
        resp = await api_client.post("/api/oneshot/estimate", json={"duration_seconds": 2700})
        assert resp.status_code == 200
        assert resp.json()["tier"] == "Standard"
        assert resp.json()["price_cents"] == 600

    @pytest.mark.asyncio
    async def test_create_order(self, api_client):
        resp = await api_client.post("/api/oneshot/order", json={"tier": "Court", "duration_seconds": 1200})
        assert resp.status_code == 200
        assert resp.json()["tier"] == "Court"
        assert resp.json()["payment_status"] == "paid"

    @pytest.mark.asyncio
    async def test_usage_summary_no_subscription(self, api_client):
        resp = await api_client.get("/api/usage/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["plan_id"] is None
        assert data["minutes_included"] == 0

"""Tests for Stripe billing integration (stub mode)."""
import pytest
import pytest_asyncio
import os
import sys
from unittest.mock import patch, MagicMock
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Ensure Stripe key is NOT set for stub mode tests
os.environ.pop("STRIPE_SECRET_KEY", None)

from app.models import Base
from app.services.subscription_service import seed_plans


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


class TestStripeService:
    """Test stripe_service.py in stub mode."""

    def test_is_stripe_configured_without_key(self):
        from app.services.stripe_service import is_stripe_configured
        assert is_stripe_configured() is False

    def test_get_webhook_secret_default_empty(self):
        from app.services.stripe_service import get_webhook_secret
        assert get_webhook_secret() == ""

    def test_get_base_url_default(self):
        from app.services.stripe_service import get_base_url
        assert get_base_url() == "http://localhost:5173"

    @pytest.mark.asyncio
    async def test_oneshot_checkout_stub(self):
        from app.services.stripe_service import create_oneshot_checkout
        result = await create_oneshot_checkout(
            order_id="test-order-1",
            tier="Standard",
            price_cents=400,
            includes=["transcription", "summary"],
        )
        assert result["mode"] == "stub"
        assert result["status"] == "paid"
        assert result["order_id"] == "test-order-1"

    @pytest.mark.asyncio
    async def test_pack_checkout_stub(self):
        from app.services.stripe_service import create_pack_checkout
        result = await create_pack_checkout(
            pack_id="M",
            minutes=500,
            price_cents=1200,
        )
        assert result["mode"] == "stub"
        assert result["status"] == "paid"
        assert result["pack_id"] == "M"

    @pytest.mark.asyncio
    async def test_plan_checkout_stub(self):
        from app.services.stripe_service import create_plan_checkout
        result = await create_plan_checkout(
            plan_id="pro",
            plan_name="Pro",
            price_cents=4900,
        )
        assert result["mode"] == "stub"
        assert result["status"] == "paid"
        assert result["plan_id"] == "pro"

    def test_verify_webhook_raises_without_config(self):
        from app.services.stripe_service import verify_webhook_signature
        with pytest.raises(ValueError, match="not configured"):
            verify_webhook_signature(b"payload", "sig")

    def test_extract_checkout_metadata(self):
        from app.services.stripe_service import extract_checkout_metadata
        event = {
            "data": {
                "object": {
                    "id": "cs_test_123",
                    "payment_status": "paid",
                    "amount_total": 400,
                    "metadata": {
                        "type": "oneshot",
                        "order_id": "order-abc",
                        "tier": "Standard",
                    },
                }
            }
        }
        result = extract_checkout_metadata(event)
        assert result["type"] == "oneshot"
        assert result["metadata"]["order_id"] == "order-abc"
        assert result["payment_status"] == "paid"
        assert result["session_id"] == "cs_test_123"
        assert result["amount_total"] == 400


class TestBillingEventModel:
    """Test BillingEvent model creation."""

    @pytest.mark.asyncio
    async def test_create_billing_event(self, db):
        from app.models import BillingEvent
        event = BillingEvent(
            event_type="test.event",
            stripe_event_id="evt_test_123",
            amount_cents=400,
            event_data={"tier": "Standard"},
            status="success",
        )
        db.add(event)
        await db.commit()

        from sqlalchemy import select
        result = await db.execute(select(BillingEvent).where(BillingEvent.stripe_event_id == "evt_test_123"))
        saved = result.scalar_one()
        assert saved.event_type == "test.event"
        assert saved.amount_cents == 400
        assert saved.event_data == {"tier": "Standard"}

    @pytest.mark.asyncio
    async def test_billing_event_unique_stripe_id(self, db):
        from app.models import BillingEvent
        from sqlalchemy.exc import IntegrityError
        e1 = BillingEvent(event_type="test", stripe_event_id="evt_dup")
        db.add(e1)
        await db.commit()

        e2 = BillingEvent(event_type="test", stripe_event_id="evt_dup")
        db.add(e2)
        with pytest.raises(IntegrityError):
            await db.commit()


class TestStripeFields:
    """Test new Stripe fields on existing models."""

    @pytest.mark.asyncio
    async def test_subscription_stripe_fields(self, db):
        from app.models import UserSubscription, Plan
        # Need a plan first
        from app.services.subscription_service import seed_plans
        await seed_plans(db)

        sub = UserSubscription(
            user_id="stripe-test",
            plan_id="free",
            stripe_customer_id="cus_test_123",
            stripe_subscription_id="sub_test_456",
        )
        db.add(sub)
        await db.commit()
        assert sub.stripe_customer_id == "cus_test_123"
        assert sub.stripe_subscription_id == "sub_test_456"

    @pytest.mark.asyncio
    async def test_oneshot_order_stripe_session(self, db):
        from app.models import OneshotOrder
        order = OneshotOrder(
            tier="Standard",
            price_cents=400,
            stripe_session_id="cs_test_789",
        )
        db.add(order)
        await db.commit()
        assert order.stripe_session_id == "cs_test_789"


class TestRateLimiter:
    """Test rate limiting logic."""

    def test_rate_limit_allows_under_threshold(self):
        import time
        from collections import defaultdict
        # Simulate the rate limiter logic
        rate_limits = defaultdict(list)
        window = 60
        max_req = 10
        key = "test:webhook"
        now = time.time()

        for i in range(max_req):
            rate_limits[key] = [t for t in rate_limits[key] if now - t < window]
            assert len(rate_limits[key]) < max_req
            rate_limits[key].append(now)

        # Next request should exceed
        rate_limits[key] = [t for t in rate_limits[key] if now - t < window]
        assert len(rate_limits[key]) >= max_req

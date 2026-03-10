"""Tests for Stripe billing integration (stub mode + webhook handlers)."""
import pytest
import pytest_asyncio
import os
import sys
from unittest.mock import patch, MagicMock, AsyncMock
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Ensure Stripe key is NOT set for stub mode tests
os.environ.pop("STRIPE_SECRET_KEY", None)
os.environ.pop("STRIPE_WEBHOOK_SECRET", None)

from app.models import Base, BillingEvent, UserSubscription, OneshotOrder, Plan
from app.services.subscription_service import seed_plans
import app.services.stripe_service as _ss
_ss._stripe = None


@pytest.fixture(autouse=True)
def _force_stripe_stub(monkeypatch):
    """Force stub mode for all tests — removes Stripe env vars and resets cache."""
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    _ss._stripe = None


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


# ── Stripe Service Tests (Stub Mode) ──────────────────


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

    def test_get_stripe_mode_default(self):
        from app.services.stripe_service import get_stripe_mode
        assert get_stripe_mode() == "sandbox"

    @pytest.mark.asyncio
    async def test_oneshot_checkout_stub(self):
        from app.services.stripe_service import create_oneshot_checkout
        result = await create_oneshot_checkout(
            order_id="test-order-1",
            tier="Standard",
            price_cents=600,
            includes=["transcription", "summary"],
        )
        assert result["mode"] == "stub"
        assert result["status"] == "paid"
        assert result["order_id"] == "test-order-1"

    @pytest.mark.asyncio
    async def test_oneshot_checkout_stub_with_email(self):
        from app.services.stripe_service import create_oneshot_checkout
        result = await create_oneshot_checkout(
            order_id="test-order-2",
            tier="Court",
            price_cents=300,
            includes=["transcription"],
            customer_email="test@example.com",
        )
        assert result["mode"] == "stub"
        assert result["status"] == "paid"

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
                    "amount_total": 600,
                    "customer": "cus_test_abc",
                    "subscription": "sub_test_def",
                    "customer_email": "user@example.com",
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
        assert result["amount_total"] == 600
        assert result["customer"] == "cus_test_abc"
        assert result["subscription"] == "sub_test_def"
        assert result["customer_email"] == "user@example.com"

    def test_extract_subscription_event(self):
        from app.services.stripe_service import extract_subscription_event
        event = {
            "data": {
                "object": {
                    "id": "sub_test_123",
                    "customer": "cus_test_abc",
                    "status": "active",
                    "cancel_at_period_end": False,
                    "current_period_start": 1700000000,
                    "current_period_end": 1702592000,
                    "metadata": {"plan_id": "pro"},
                }
            }
        }
        result = extract_subscription_event(event)
        assert result["subscription_id"] == "sub_test_123"
        assert result["customer"] == "cus_test_abc"
        assert result["status"] == "active"
        assert result["plan_id"] == "pro"
        assert result["cancel_at_period_end"] is False

    def test_extract_invoice_event(self):
        from app.services.stripe_service import extract_invoice_event
        event = {
            "data": {
                "object": {
                    "id": "in_test_123",
                    "customer": "cus_test_abc",
                    "subscription": "sub_test_def",
                    "status": "paid",
                    "amount_paid": 4900,
                    "amount_due": 4900,
                    "billing_reason": "subscription_cycle",
                }
            }
        }
        result = extract_invoice_event(event)
        assert result["invoice_id"] == "in_test_123"
        assert result["subscription"] == "sub_test_def"
        assert result["amount_paid"] == 4900
        assert result["billing_reason"] == "subscription_cycle"


# ── Customer Management Tests ──────────────────────────


class TestCustomerManagement:
    """Test customer management in stub mode."""

    @pytest.mark.asyncio
    async def test_get_or_create_customer_stub(self):
        from app.services.stripe_service import get_or_create_customer
        result = await get_or_create_customer(
            email="test@example.com",
            user_id="user-123",
            name="Test User",
        )
        assert result["mode"] == "stub"
        assert result["customer_id"] == "cus_stub_user-123"

    @pytest.mark.asyncio
    async def test_billing_portal_stub(self):
        from app.services.stripe_service import create_billing_portal_session
        result = await create_billing_portal_session("cus_stub_123")
        assert result["mode"] == "stub"
        assert result["url"] == ""

    @pytest.mark.asyncio
    async def test_cancel_subscription_stub(self):
        from app.services.stripe_service import cancel_subscription
        result = await cancel_subscription("")
        assert result["mode"] == "stub"
        assert result["status"] == "cancelled"


# ── Config Helpers Tests ───────────────────────────────


class TestConfigHelpers:
    """Test config loading helpers."""

    def test_get_plan_stripe_price_id_exists(self):
        from app.services.stripe_service import get_plan_stripe_price_id
        # Config should have stripe_price_id set (may be empty or real)
        result = get_plan_stripe_price_id("pro")
        assert isinstance(result, str)

    def test_get_plan_stripe_price_id_unknown(self):
        from app.services.stripe_service import get_plan_stripe_price_id
        result = get_plan_stripe_price_id("nonexistent")
        assert result == ""

    def test_get_oneshot_stripe_price_id_exists(self):
        from app.services.stripe_service import get_oneshot_stripe_price_id
        result = get_oneshot_stripe_price_id("Standard")
        assert isinstance(result, str)

    def test_get_pack_stripe_price_id_exists(self):
        from app.services.stripe_service import get_pack_stripe_price_id
        result = get_pack_stripe_price_id("M")
        assert isinstance(result, str)


# ── Model Tests ────────────────────────────────────────


class TestBillingEventModel:
    """Test BillingEvent model creation."""

    @pytest.mark.asyncio
    async def test_create_billing_event(self, db):
        event = BillingEvent(
            event_type="test.event",
            stripe_event_id="evt_test_123",
            amount_cents=400,
            event_data={"tier": "Standard"},
            status="success",
        )
        db.add(event)
        await db.commit()

        result = await db.execute(select(BillingEvent).where(BillingEvent.stripe_event_id == "evt_test_123"))
        saved = result.scalar_one()
        assert saved.event_type == "test.event"
        assert saved.amount_cents == 400
        assert saved.event_data == {"tier": "Standard"}

    @pytest.mark.asyncio
    async def test_billing_event_unique_stripe_id(self, db):
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
        sub = UserSubscription(
            user_id="stripe-test",
            plan_id="basic",
            stripe_customer_id="cus_test_123",
            stripe_subscription_id="sub_test_456",
        )
        db.add(sub)
        await db.commit()
        assert sub.stripe_customer_id == "cus_test_123"
        assert sub.stripe_subscription_id == "sub_test_456"

    @pytest.mark.asyncio
    async def test_oneshot_order_stripe_session(self, db):
        order = OneshotOrder(
            tier="Standard",
            price_cents=600,
            stripe_session_id="cs_test_789",
        )
        db.add(order)
        await db.commit()
        assert order.stripe_session_id == "cs_test_789"

    @pytest.mark.asyncio
    async def test_subscription_status_cancelling(self, db):
        """Test the new 'cancelling' status."""
        sub = UserSubscription(
            user_id="cancel-test",
            plan_id="pro",
            status="cancelling",
            stripe_subscription_id="sub_cancel_123",
        )
        db.add(sub)
        await db.commit()
        assert sub.status == "cancelling"

    @pytest.mark.asyncio
    async def test_subscription_status_past_due(self, db):
        """Test the 'past_due' status for failed payments."""
        sub = UserSubscription(
            user_id="pastdue-test",
            plan_id="basic",
            status="past_due",
        )
        db.add(sub)
        await db.commit()
        assert sub.status == "past_due"


# ── Rate Limiter Tests ─────────────────────────────────


class TestRateLimiter:
    """Test rate limiting logic."""

    def test_rate_limit_allows_under_threshold(self):
        import time
        from collections import defaultdict
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

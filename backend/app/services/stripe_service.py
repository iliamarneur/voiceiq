"""Stripe billing service — production-ready integration.

Handles:
- One-shot payments (Checkout Session, mode=payment)
- Extra packs purchases (Checkout Session, mode=payment)
- Plan subscriptions (Checkout Session, mode=subscription)
- Customer management (create/retrieve Stripe Customer)
- Billing portal (manage/cancel subscriptions)
- Webhook processing (idempotent, multi-event)

Config via env vars:
  STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
  STRIPE_WEBHOOK_SECRET   — whsec_...
  STRIPE_MODE             — "sandbox" (default) or "live"
  APP_BASE_URL            — for redirect URLs (default http://localhost:5173)

When STRIPE_SECRET_KEY is empty or stripe package is not installed,
all checkout functions auto-complete in stub mode (for dev/test).
"""
import json
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy import — stripe may not be installed in dev
_stripe = None


def _get_stripe():
    global _stripe
    if _stripe is None:
        try:
            import stripe
            stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
            _stripe = stripe
        except ImportError:
            logger.warning("stripe package not installed — billing runs in stub mode")
            return None
    return _stripe


def is_stripe_configured() -> bool:
    """Check if Stripe is configured (non-empty key present and package installed).
    Returns False if STRIPE_MODE=dev (bypass payments for local testing)."""
    if os.environ.get("STRIPE_MODE", "") == "dev":
        return False
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    if not key or key.startswith("sk_test_...") or key == "":
        return False
    return _get_stripe() is not None


def get_webhook_secret() -> str:
    return os.environ.get("STRIPE_WEBHOOK_SECRET", "")


def get_base_url() -> str:
    return os.environ.get("APP_BASE_URL", "http://localhost:5173")


def get_stripe_mode() -> str:
    return os.environ.get("STRIPE_MODE", "sandbox")


# ── Config helpers ─────────────────────────────────────


def _load_plans_config() -> dict:
    """Load plans.json config."""
    config_path = Path(__file__).parent.parent.parent / "config" / "plans.json"
    with open(config_path) as f:
        return json.load(f)


def get_plan_stripe_price_id(plan_id: str) -> str:
    """Get the Stripe Price ID for a plan from config."""
    config = _load_plans_config()
    for plan in config.get("plans", []):
        if plan["id"] == plan_id:
            return plan.get("stripe_price_id", "")
    return ""


def get_oneshot_stripe_price_id(tier: str) -> str:
    """Get the Stripe Price ID for a one-shot tier from config."""
    config = _load_plans_config()
    tier_info = config.get("oneshot_tiers", {}).get(tier, {})
    return tier_info.get("stripe_price_id", "")


def get_pack_stripe_price_id(pack_id: str) -> str:
    """Get the Stripe Price ID for an extra pack from config."""
    config = _load_plans_config()
    pack_info = config.get("extra_packs", {}).get(pack_id, {})
    return pack_info.get("stripe_price_id", "")


# ── Customer Management ────────────────────────────────


async def get_or_create_customer(
    email: str,
    user_id: str,
    name: Optional[str] = None,
    existing_customer_id: Optional[str] = None,
) -> dict:
    """Get or create a Stripe Customer for the given user.

    Returns {"customer_id": "cus_xxx", "mode": "stripe"|"stub"}
    """
    stripe = _get_stripe()
    if not stripe or not is_stripe_configured():
        return {"customer_id": f"cus_stub_{user_id}", "mode": "stub"}

    # If we already have a customer ID, verify it exists
    if existing_customer_id:
        try:
            customer = stripe.Customer.retrieve(existing_customer_id)
            if not customer.get("deleted"):
                return {"customer_id": customer["id"], "mode": "stripe"}
        except Exception:
            logger.warning(f"Stripe customer {existing_customer_id} not found, creating new")

    # Search by email first
    try:
        customers = stripe.Customer.list(email=email, limit=1)
        if customers.data:
            return {"customer_id": customers.data[0]["id"], "mode": "stripe"}
    except Exception:
        pass

    # Create new customer
    customer = stripe.Customer.create(
        email=email,
        name=name or "",
        metadata={"clearrecap_user_id": user_id},
    )
    return {"customer_id": customer["id"], "mode": "stripe"}


# ── Checkout Sessions ──────────────────────────────────


async def create_oneshot_checkout(
    order_id: str,
    tier: str,
    price_cents: int,
    includes: list[str],
    customer_email: Optional[str] = None,
    customer_id: Optional[str] = None,
    job_id: Optional[str] = None,
) -> dict:
    """Create a Stripe Checkout Session for a one-shot order."""
    stripe = _get_stripe()
    if not stripe or not is_stripe_configured():
        logger.info(f"[STUB] One-shot checkout for order {order_id}, {price_cents}c")
        return {"mode": "stub", "order_id": order_id, "status": "paid"}

    base_url = get_base_url()
    stripe_price_id = get_oneshot_stripe_price_id(tier)

    # Build line_items — use Price ID if available, else inline price_data
    if stripe_price_id:
        line_items = [{"price": stripe_price_id, "quantity": 1}]
    else:
        line_items = [{
            "price_data": {
                "currency": "eur",
                "unit_amount": price_cents,
                "product_data": {
                    "name": f"ClearRecap — Transcription {tier}",
                    "description": f"Inclus : {', '.join(includes)}",
                },
            },
            "quantity": 1,
        }]

    session_params = {
        "payment_method_types": ["card"],
        "mode": "payment",
        "line_items": line_items,
        "metadata": {
            "type": "oneshot",
            "order_id": order_id,
            "tier": tier,
        },
        "success_url": f"{base_url}/payment/success?type=oneshot&order_id={order_id}&session_id={{CHECKOUT_SESSION_ID}}" + (f"&job_id={job_id}" if job_id else ""),
        "cancel_url": f"{base_url}/payment/cancel?type=oneshot",
    }

    if customer_id:
        session_params["customer"] = customer_id
    elif customer_email:
        session_params["customer_email"] = customer_email

    session = stripe.checkout.Session.create(**session_params)
    return {
        "mode": "stripe",
        "checkout_url": session.url,
        "session_id": session.id,
        "order_id": order_id,
    }


async def create_pack_checkout(
    pack_id: str,
    minutes: int,
    price_cents: int,
    user_id: str = "default",
    customer_email: Optional[str] = None,
    customer_id: Optional[str] = None,
) -> dict:
    """Create a Stripe Checkout Session for an extra minutes pack."""
    stripe = _get_stripe()
    if not stripe or not is_stripe_configured():
        logger.info(f"[STUB] Pack checkout {pack_id}, {minutes}min, {price_cents}c")
        return {"mode": "stub", "pack_id": pack_id, "status": "paid"}

    base_url = get_base_url()
    stripe_price_id = get_pack_stripe_price_id(pack_id)

    if stripe_price_id:
        line_items = [{"price": stripe_price_id, "quantity": 1}]
    else:
        line_items = [{
            "price_data": {
                "currency": "eur",
                "unit_amount": price_cents,
                "product_data": {
                    "name": f"ClearRecap — Pack {minutes} minutes",
                },
            },
            "quantity": 1,
        }]

    session_params = {
        "payment_method_types": ["card"],
        "mode": "payment",
        "line_items": line_items,
        "metadata": {
            "type": "extra_pack",
            "pack_id": pack_id,
            "minutes": str(minutes),
            "user_id": user_id,
        },
        "success_url": f"{base_url}/app/plans?payment=success&pack={pack_id}",
        "cancel_url": f"{base_url}/app/plans?payment=cancelled",
    }

    if customer_id:
        session_params["customer"] = customer_id
    elif customer_email:
        session_params["customer_email"] = customer_email

    session = stripe.checkout.Session.create(**session_params)
    return {
        "mode": "stripe",
        "checkout_url": session.url,
        "session_id": session.id,
    }


async def create_plan_checkout(
    plan_id: str,
    plan_name: str,
    price_cents: int,
    user_id: str = "default",
    customer_email: Optional[str] = None,
    customer_id: Optional[str] = None,
) -> dict:
    """Create a Stripe Checkout Session for a plan subscription."""
    stripe = _get_stripe()
    if not stripe or not is_stripe_configured():
        logger.info(f"[STUB] Plan checkout {plan_id}, {price_cents}c/month")
        return {"mode": "stub", "plan_id": plan_id, "status": "paid"}

    base_url = get_base_url()
    stripe_price_id = get_plan_stripe_price_id(plan_id)

    if stripe_price_id:
        line_items = [{"price": stripe_price_id, "quantity": 1}]
    else:
        line_items = [{
            "price_data": {
                "currency": "eur",
                "unit_amount": price_cents,
                "recurring": {"interval": "month"},
                "product_data": {
                    "name": f"ClearRecap — {plan_name}",
                },
            },
            "quantity": 1,
        }]

    session_params = {
        "payment_method_types": ["card"],
        "mode": "subscription",
        "line_items": line_items,
        "metadata": {
            "type": "plan_upgrade",
            "plan_id": plan_id,
            "user_id": user_id,
        },
        "success_url": f"{base_url}/payment/success?type=plan&plan_id={plan_id}",
        "cancel_url": f"{base_url}/payment/cancel?type=plan",
    }

    if customer_id:
        session_params["customer"] = customer_id
    elif customer_email:
        session_params["customer_email"] = customer_email

    session = stripe.checkout.Session.create(**session_params)
    return {
        "mode": "stripe",
        "checkout_url": session.url,
        "session_id": session.id,
    }


# ── Billing Portal ────────────────────────────────────


async def create_billing_portal_session(
    customer_id: str,
    return_url: Optional[str] = None,
) -> dict:
    """Create a Stripe Billing Portal session for subscription management.

    Returns {"url": "https://billing.stripe.com/...", "mode": "stripe"|"stub"}
    """
    stripe = _get_stripe()
    if not stripe or not is_stripe_configured():
        return {"url": "", "mode": "stub"}

    if not customer_id or customer_id.startswith("cus_stub_"):
        return {"url": "", "mode": "stub"}

    base_url = get_base_url()
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url or f"{base_url}/app/plans",
    )
    return {"url": session.url, "mode": "stripe"}


# ── Subscription Management ───────────────────────────


async def cancel_subscription(stripe_subscription_id: str) -> dict:
    """Cancel a Stripe subscription (at period end).

    Returns the updated subscription object or stub response.
    """
    stripe = _get_stripe()
    if not stripe or not is_stripe_configured():
        return {"mode": "stub", "status": "cancelled"}

    if not stripe_subscription_id:
        return {"mode": "stub", "status": "cancelled"}

    sub = stripe.Subscription.modify(
        stripe_subscription_id,
        cancel_at_period_end=True,
    )
    return {
        "mode": "stripe",
        "status": sub.status,
        "cancel_at_period_end": sub.cancel_at_period_end,
        "current_period_end": sub.current_period_end,
    }


# ── Webhook Processing ──────────────────────────────────


def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """Verify and parse a Stripe webhook event. Raises ValueError on failure."""
    stripe = _get_stripe()
    if not stripe:
        raise ValueError("Stripe not configured")

    secret = get_webhook_secret()
    if not secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET not configured")

    event = stripe.Webhook.construct_event(payload, sig_header, secret)
    return event


def extract_checkout_metadata(event: dict) -> dict:
    """Extract metadata from a checkout.session.completed event."""
    session = event["data"]["object"]
    return {
        "type": session.get("metadata", {}).get("type"),
        "metadata": session.get("metadata", {}),
        "payment_status": session.get("payment_status"),
        "session_id": session.get("id"),
        "amount_total": session.get("amount_total"),
        "customer": session.get("customer"),
        "customer_email": session.get("customer_email") or session.get("customer_details", {}).get("email"),
        "subscription": session.get("subscription"),
    }


def extract_subscription_event(event: dict) -> dict:
    """Extract data from subscription lifecycle events."""
    sub = event["data"]["object"]
    return {
        "subscription_id": sub.get("id"),
        "customer": sub.get("customer"),
        "status": sub.get("status"),
        "plan_id": sub.get("metadata", {}).get("plan_id"),
        "cancel_at_period_end": sub.get("cancel_at_period_end"),
        "current_period_start": sub.get("current_period_start"),
        "current_period_end": sub.get("current_period_end"),
    }


def extract_invoice_event(event: dict) -> dict:
    """Extract data from invoice events."""
    invoice = event["data"]["object"]
    return {
        "invoice_id": invoice.get("id"),
        "customer": invoice.get("customer"),
        "subscription": invoice.get("subscription"),
        "status": invoice.get("status"),
        "amount_paid": invoice.get("amount_paid"),
        "amount_due": invoice.get("amount_due"),
        "billing_reason": invoice.get("billing_reason"),
    }

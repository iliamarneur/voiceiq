"""Stripe billing service — sandbox-ready integration.

Handles:
- One-shot payments (Checkout Session)
- Extra packs purchases (Checkout Session)
- Plan upgrades/downgrades (Checkout Session → Subscription)
- Webhook processing (idempotent)

Config via env vars:
  STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
  STRIPE_WEBHOOK_SECRET   — whsec_...
  STRIPE_MODE             — "sandbox" (default) or "live"
  APP_BASE_URL            — for redirect URLs (default http://localhost:5173)
"""
import logging
import os
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
    """Check if Stripe is configured (key present and package installed)."""
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    return bool(key) and _get_stripe() is not None


def get_webhook_secret() -> str:
    return os.environ.get("STRIPE_WEBHOOK_SECRET", "")


def get_base_url() -> str:
    return os.environ.get("APP_BASE_URL", "http://localhost:5173")


# ── Checkout Sessions ──────────────────────────────────


async def create_oneshot_checkout(
    order_id: str,
    tier: str,
    price_cents: int,
    includes: list[str],
) -> dict:
    """Create a Stripe Checkout Session for a one-shot order."""
    stripe = _get_stripe()
    if not stripe or not is_stripe_configured():
        # Stub mode — auto-complete
        logger.info(f"[STUB] One-shot checkout for order {order_id}, {price_cents}c")
        return {"mode": "stub", "order_id": order_id, "status": "paid"}

    base_url = get_base_url()
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "eur",
                "unit_amount": price_cents,
                "product_data": {
                    "name": f"VoiceIQ — Transcription {tier}",
                    "description": f"Inclus : {', '.join(includes)}",
                },
            },
            "quantity": 1,
        }],
        metadata={
            "type": "oneshot",
            "order_id": order_id,
            "tier": tier,
        },
        success_url=f"{base_url}/oneshot?payment=success&order_id={order_id}",
        cancel_url=f"{base_url}/oneshot?payment=cancelled",
    )
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
) -> dict:
    """Create a Stripe Checkout Session for an extra minutes pack."""
    stripe = _get_stripe()
    if not stripe or not is_stripe_configured():
        logger.info(f"[STUB] Pack checkout {pack_id}, {minutes}min, {price_cents}c")
        return {"mode": "stub", "pack_id": pack_id, "status": "paid"}

    base_url = get_base_url()
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "eur",
                "unit_amount": price_cents,
                "product_data": {
                    "name": f"VoiceIQ — Pack {minutes} minutes",
                },
            },
            "quantity": 1,
        }],
        metadata={
            "type": "extra_pack",
            "pack_id": pack_id,
            "minutes": str(minutes),
            "user_id": user_id,
        },
        success_url=f"{base_url}/plans?payment=success&pack={pack_id}",
        cancel_url=f"{base_url}/plans?payment=cancelled",
    )
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
) -> dict:
    """Create a Stripe Checkout Session for a plan subscription."""
    stripe = _get_stripe()
    if not stripe or not is_stripe_configured():
        logger.info(f"[STUB] Plan checkout {plan_id}, {price_cents}c/month")
        return {"mode": "stub", "plan_id": plan_id, "status": "paid"}

    base_url = get_base_url()
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        line_items=[{
            "price_data": {
                "currency": "eur",
                "unit_amount": price_cents,
                "recurring": {"interval": "month"},
                "product_data": {
                    "name": f"VoiceIQ — {plan_name}",
                },
            },
            "quantity": 1,
        }],
        metadata={
            "type": "plan_upgrade",
            "plan_id": plan_id,
            "user_id": user_id,
        },
        success_url=f"{base_url}/plans?payment=success&plan={plan_id}",
        cancel_url=f"{base_url}/plans?payment=cancelled",
    )
    return {
        "mode": "stripe",
        "checkout_url": session.url,
        "session_id": session.id,
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
    }

"""v7 — Subscription & usage service: plans, minutes tracking, one-shot orders.

All plan definitions, pricing, packs, and thresholds are loaded from
backend/config/plans.json — the single source of truth for pricing config.
"""
import json
import logging
import math
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Plan, UserSubscription, UsageLog, OneshotOrder

logger = logging.getLogger(__name__)

# ── Load config from JSON ─────────────────────────────────

_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "plans.json"


def _load_config() -> dict:
    """Load plans configuration from JSON file."""
    with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_config() -> dict:
    """Public accessor — reloads from disk each time for hot-reload support."""
    return _load_config()


def get_seed_plans() -> list[dict]:
    cfg = get_config()
    plans = []
    for p in cfg["plans"]:
        plans.append({**p, "active": 1})
    return plans


def get_extra_packs() -> dict:
    return get_config()["extra_packs"]


def get_oneshot_tiers() -> dict:
    return get_config()["oneshot_tiers"]


def get_alert_thresholds() -> dict:
    return get_config()["alert_thresholds"]


# ── Seed plans ──────────────────────────────────────────

async def seed_plans(db: AsyncSession):
    """Insert or update plans from config."""
    for plan_data in get_seed_plans():
        result = await db.execute(select(Plan).where(Plan.id == plan_data["id"]))
        existing = result.scalar_one_or_none()
        if existing:
            # Update existing plan with latest config values
            existing.name = plan_data["name"]
            existing.price_cents = plan_data["price_cents"]
            existing.minutes_included = plan_data["minutes_included"]
            existing.features = plan_data["features"]
            existing.max_dictionaries = plan_data.get("max_dictionaries", 1)
            existing.max_workspaces = plan_data.get("max_workspaces", 1)
            existing.priority_default = plan_data.get("priority_default", "P1")
            existing.active = plan_data.get("active", 1)
            logger.info(f"Updated plan: {plan_data['id']}")
        else:
            plan = Plan(**plan_data)
            db.add(plan)
            logger.info(f"Seeded plan: {plan_data['id']}")
    await db.commit()


# ── Subscription management ─────────────────────────────

async def get_or_create_subscription(db: AsyncSession, user_id: str = "default") -> UserSubscription:
    """Get the active subscription for a user, creating a free one if none exists."""
    result = await db.execute(
        select(UserSubscription).where(
            UserSubscription.user_id == user_id,
            UserSubscription.status == "active",
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        # Check if period needs renewal (monthly reset)
        if sub.current_period_end and datetime.utcnow() > sub.current_period_end:
            sub.current_period_start = datetime.utcnow()
            sub.current_period_end = datetime.utcnow() + timedelta(days=30)
            sub.minutes_used = 0
            await db.commit()
            await db.refresh(sub)
        return sub

    # Create free subscription
    now = datetime.utcnow()
    sub = UserSubscription(
        user_id=user_id,
        plan_id="free",
        status="active",
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
        minutes_used=0,
        extra_minutes_balance=0,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


async def get_subscription_info(db: AsyncSession, user_id: str = "default") -> dict:
    """Get full subscription info with plan details."""
    sub = await get_or_create_subscription(db, user_id)
    plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_result.scalar_one_or_none()
    plan_name = plan.name if plan else sub.plan_id
    minutes_included = plan.minutes_included if plan else 0
    minutes_remaining = max(0, minutes_included - sub.minutes_used)

    return {
        "id": sub.id,
        "user_id": sub.user_id,
        "plan_id": sub.plan_id,
        "plan_name": plan_name,
        "status": sub.status,
        "current_period_start": sub.current_period_start,
        "current_period_end": sub.current_period_end,
        "minutes_used": sub.minutes_used,
        "minutes_included": minutes_included,
        "minutes_remaining": minutes_remaining,
        "extra_minutes_balance": sub.extra_minutes_balance,
        "created_at": sub.created_at,
    }


async def change_plan(db: AsyncSession, plan_id: str, user_id: str = "default") -> UserSubscription:
    """Change the user's plan (stub: instant switch, no payment)."""
    # Verify plan exists
    plan_result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise ValueError(f"Plan '{plan_id}' not found")

    sub = await get_or_create_subscription(db, user_id)
    sub.plan_id = plan_id
    now = datetime.utcnow()
    sub.current_period_start = now
    sub.current_period_end = now + timedelta(days=30)
    sub.minutes_used = 0  # Reset on plan change
    await db.commit()
    await db.refresh(sub)
    logger.info(f"User {user_id} changed to plan {plan_id}")
    return sub


# ── Minutes consumption ─────────────────────────────────

async def check_minutes_available(db: AsyncSession, user_id: str = "default") -> dict:
    """Check if user has minutes available. Returns availability info."""
    sub = await get_or_create_subscription(db, user_id)
    plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_result.scalar_one_or_none()
    minutes_included = plan.minutes_included if plan else 0
    plan_remaining = max(0, minutes_included - sub.minutes_used)
    total_available = plan_remaining + sub.extra_minutes_balance

    return {
        "available": total_available > 0,
        "plan_remaining": plan_remaining,
        "extra_remaining": sub.extra_minutes_balance,
        "total_available": total_available,
    }


async def consume_minutes(
    db: AsyncSession,
    audio_duration_seconds: float,
    transcription_id: str = None,
    job_id: str = None,
    source_type: str = "file",
    profile_used: str = None,
    whisper_model: str = None,
    processing_time_seconds: float = None,
    language: str = None,
    user_id: str = "default",
) -> UsageLog:
    """Consume minutes from subscription and log usage."""
    minutes_needed = max(1, math.ceil(audio_duration_seconds / 60))
    sub = await get_or_create_subscription(db, user_id)

    plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_result.scalar_one_or_none()
    minutes_included = plan.minutes_included if plan else 0
    plan_remaining = max(0, minutes_included - sub.minutes_used)

    # Determine source of minutes
    if plan_remaining >= minutes_needed:
        minute_source = "plan"
        sub.minutes_used += minutes_needed
    elif plan_remaining > 0:
        # Partial plan, partial extra
        from_plan = plan_remaining
        from_extra = minutes_needed - from_plan
        if sub.extra_minutes_balance >= from_extra:
            sub.minutes_used += from_plan
            sub.extra_minutes_balance -= from_extra
            minute_source = "plan+extra"
        elif sub.extra_minutes_balance > 0:
            sub.minutes_used += from_plan
            sub.extra_minutes_balance = 0
            minute_source = "plan+extra+exceeded"
            logger.warning(f"User {user_id} partially exceeded quota")
        else:
            sub.minutes_used += minutes_needed
            minute_source = "plan_exceeded"
            logger.warning(f"User {user_id} exceeded minutes quota")
    elif sub.extra_minutes_balance >= minutes_needed:
        minute_source = "extra"
        sub.extra_minutes_balance -= minutes_needed
    else:
        sub.minutes_used += minutes_needed
        minute_source = "exceeded"
        logger.warning(f"User {user_id} has no minutes remaining")

    # Create usage log
    usage_log = UsageLog(
        user_id=user_id,
        transcription_id=transcription_id,
        job_id=job_id,
        audio_duration_seconds=audio_duration_seconds,
        minutes_charged=minutes_needed,
        minute_source=minute_source,
        source_type=source_type,
        profile_used=profile_used,
        whisper_model=whisper_model,
        processing_time_seconds=processing_time_seconds,
        language=language,
    )
    db.add(usage_log)
    await db.commit()
    await db.refresh(usage_log)
    logger.info(
        f"Usage: {minutes_needed}min from {minute_source} "
        f"(audio={audio_duration_seconds:.0f}s, user={user_id})"
    )
    return usage_log


# ── Extra minutes ───────────────────────────────────────

async def add_extra_minutes(db: AsyncSession, pack: str, user_id: str = "default") -> dict:
    """Add extra minutes to subscription (stub: no real payment)."""
    packs = get_extra_packs()
    if pack not in packs:
        raise ValueError(f"Unknown pack '{pack}'. Available: {list(packs.keys())}")

    pack_info = packs[pack]
    sub = await get_or_create_subscription(db, user_id)
    sub.extra_minutes_balance += pack_info["minutes"]
    await db.commit()
    await db.refresh(sub)

    logger.info(f"Added {pack_info['minutes']} extra minutes for user {user_id} (pack {pack})")
    return {
        "pack": pack,
        "minutes_added": pack_info["minutes"],
        "price_cents": pack_info["price_cents"],
        "new_extra_balance": sub.extra_minutes_balance,
    }


# ── Alerts ──────────────────────────────────────────────

async def get_subscription_alerts(db: AsyncSession, user_id: str = "default") -> dict:
    """Check quota usage and return alerts if thresholds are reached."""
    sub = await get_or_create_subscription(db, user_id)
    plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_result.scalar_one_or_none()
    minutes_included = plan.minutes_included if plan else 0

    if minutes_included <= 0:
        return {"alerts": [], "usage_percent": 0, "minutes_remaining": 0}

    usage_percent = round((sub.minutes_used / minutes_included) * 100, 1)
    minutes_remaining = max(0, minutes_included - sub.minutes_used)
    thresholds = get_alert_thresholds()
    critical_pct = thresholds["critical_percent"]
    warning_pct = thresholds["warning_percent"]

    alerts = []
    if usage_percent >= 100:
        alerts.append({
            "level": "blocked",
            "message": f"Quota epuise. Achetez un pack ou passez au plan superieur.",
            "percent": usage_percent,
        })
    elif usage_percent >= critical_pct:
        alerts.append({
            "level": "critical",
            "message": f"Attention : seulement {minutes_remaining} minutes restantes.",
            "percent": usage_percent,
        })
    elif usage_percent >= warning_pct:
        alerts.append({
            "level": "warning",
            "message": f"Il vous reste {minutes_remaining} minutes sur votre plan {plan.name if plan else ''}.",
            "percent": usage_percent,
        })

    return {
        "alerts": alerts,
        "usage_percent": usage_percent,
        "minutes_remaining": minutes_remaining,
        "minutes_included": minutes_included,
        "extra_minutes_balance": sub.extra_minutes_balance,
    }


# ── One-shot ────────────────────────────────────────────

def estimate_oneshot_tier(duration_seconds: float) -> dict:
    """Estimate which one-shot tier fits the audio duration."""
    tiers = get_oneshot_tiers()
    duration_minutes = math.ceil(duration_seconds / 60)
    for tier_id in ["Court", "Standard", "Long"]:
        tier = tiers[tier_id]
        if duration_minutes <= tier["max_duration_minutes"]:
            return {
                "tier": tier_id,
                "price_cents": tier["price_cents"],
                "max_duration_minutes": tier["max_duration_minutes"],
                "includes": tier["includes"],
            }
    # Exceeds all tiers
    return {
        "tier": "Long",
        "price_cents": tiers["Long"]["price_cents"],
        "max_duration_minutes": tiers["Long"]["max_duration_minutes"],
        "includes": tiers["Long"]["includes"],
        "warning": "Audio exceeds 90 minutes, consider a subscription",
    }


async def create_oneshot_order(
    db: AsyncSession, tier: str, audio_duration_seconds: float = None, user_id: str = "default"
) -> OneshotOrder:
    """Create a one-shot order (stub: auto-paid)."""
    tiers = get_oneshot_tiers()
    if tier not in tiers:
        raise ValueError(f"Unknown tier '{tier}'")

    tier_info = tiers[tier]
    order = OneshotOrder(
        user_id=user_id,
        tier=tier,
        price_cents=tier_info["price_cents"],
        audio_duration_seconds=audio_duration_seconds,
        payment_status="paid",  # stub: auto-validate in v7
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    logger.info(f"One-shot order created: {order.id} (tier={tier}, price={tier_info['price_cents']}c)")
    return order


async def link_oneshot_to_transcription(
    db: AsyncSession, order_id: str, transcription_id: str
) -> OneshotOrder:
    """Link a one-shot order to a transcription after processing."""
    result = await db.execute(select(OneshotOrder).where(OneshotOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise ValueError(f"Order '{order_id}' not found")
    order.transcription_id = transcription_id
    await db.commit()
    await db.refresh(order)
    logger.info(f"One-shot order {order_id} linked to transcription {transcription_id}")
    return order


# ── Usage analytics ─────────────────────────────────────

async def get_usage_summary(db: AsyncSession, user_id: str = "default") -> dict:
    """Get usage summary for the current billing period."""
    sub = await get_or_create_subscription(db, user_id)
    plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_result.scalar_one_or_none()

    # Get logs for current period
    logs_result = await db.execute(
        select(UsageLog).where(
            UsageLog.user_id == user_id,
            UsageLog.created_at >= sub.current_period_start,
        )
    )
    logs = logs_result.scalars().all()

    by_source = {}
    by_profile = {}
    total_audio = 0.0

    for log in logs:
        by_source[log.source_type] = by_source.get(log.source_type, 0) + log.minutes_charged
        if log.profile_used:
            by_profile[log.profile_used] = by_profile.get(log.profile_used, 0) + log.minutes_charged
        total_audio += log.audio_duration_seconds

    minutes_included = plan.minutes_included if plan else 0

    return {
        "plan_id": sub.plan_id,
        "plan_name": plan.name if plan else sub.plan_id,
        "minutes_included": minutes_included,
        "minutes_used": sub.minutes_used,
        "minutes_remaining": max(0, minutes_included - sub.minutes_used),
        "extra_minutes_balance": sub.extra_minutes_balance,
        "total_transcriptions": len(logs),
        "total_audio_minutes": round(total_audio / 60, 1),
        "by_source": by_source,
        "by_profile": by_profile,
    }


async def get_usage_logs(db: AsyncSession, user_id: str = "default", limit: int = 50) -> list:
    """Get recent usage logs."""
    result = await db.execute(
        select(UsageLog)
        .where(UsageLog.user_id == user_id)
        .order_by(UsageLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()

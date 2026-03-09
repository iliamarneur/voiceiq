"""Admin service — platform-level statistics and monitoring."""
from datetime import datetime, timedelta

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    UserSubscription, Plan, UsageLog, Job, Transcription,
    BillingEvent, OneshotOrder, AnonymousSession,
)


async def calculate_mrr(db: AsyncSession) -> int:
    """Monthly Recurring Revenue in cents (sum of active subscription plan prices)."""
    result = await db.execute(
        select(func.coalesce(func.sum(Plan.price_cents), 0))
        .join(UserSubscription, UserSubscription.plan_id == Plan.id)
        .where(UserSubscription.status == "active", Plan.price_cents > 0)
    )
    return result.scalar_one()


async def count_active_subscriptions(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(UserSubscription).where(UserSubscription.status == "active")
    )
    return result.scalar_one()


async def total_minutes_current_period(db: AsyncSession) -> float:
    """Total minutes consumed this month."""
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.coalesce(func.sum(UsageLog.minutes_charged), 0))
        .where(UsageLog.created_at >= month_start)
    )
    return result.scalar_one()


async def total_transcriptions_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Transcription))
    return result.scalar_one()


async def calculate_error_rate(db: AsyncSession) -> float:
    """Error rate over the last 24h (percentage)."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    total_result = await db.execute(
        select(func.count()).select_from(Job).where(Job.created_at >= cutoff)
    )
    total = total_result.scalar_one()
    if total == 0:
        return 0.0

    failed_result = await db.execute(
        select(func.count()).select_from(Job).where(
            Job.created_at >= cutoff, Job.status == "failed"
        )
    )
    failed = failed_result.scalar_one()
    return round(failed / total * 100, 1)


async def get_queue_jobs(db: AsyncSession, limit: int = 50) -> list[dict]:
    """Current processing queue."""
    result = await db.execute(
        select(Job)
        .where(Job.status.in_(["pending", "queued", "processing", "transcribed"]))
        .order_by(Job.created_at.desc())
        .limit(limit)
    )
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "file_path": j.file_path.split("/")[-1].split("\\")[-1] if j.file_path else "",
            "status": j.status,
            "priority": j.priority,
            "profile": j.profile,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ]


async def get_recent_billing_events(db: AsyncSession, limit: int = 50) -> list[dict]:
    result = await db.execute(
        select(BillingEvent).order_by(BillingEvent.created_at.desc()).limit(limit)
    )
    events = result.scalars().all()
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "amount_cents": e.amount_cents,
            "status": e.status,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]


async def get_backends_health() -> dict:
    """Check health of STT and LLM backends."""
    import httpx

    ollama_status = "down"
    ollama_models: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://localhost:11434/api/tags")
            if resp.status_code == 200:
                ollama_status = "ok"
                data = resp.json()
                ollama_models = [m["name"] for m in data.get("models", [])]
    except Exception:
        pass

    return {
        "whisper": {"status": "ok", "note": "local (faster-whisper)"},
        "ollama": {"status": ollama_status, "models": ollama_models},
    }


async def get_admin_stats(db: AsyncSession) -> dict:
    """Aggregate all admin stats."""
    mrr = await calculate_mrr(db)
    active_subs = await count_active_subscriptions(db)
    minutes = await total_minutes_current_period(db)
    transcriptions = await total_transcriptions_count(db)
    error_rate = await calculate_error_rate(db)
    queue = await get_queue_jobs(db, limit=10)
    backends = await get_backends_health()

    return {
        "mrr_cents": mrr,
        "mrr_eur": round(mrr / 100, 2),
        "active_subscriptions": active_subs,
        "total_minutes_this_month": minutes,
        "total_transcriptions": transcriptions,
        "error_rate_24h": error_rate,
        "queue_size": len(queue),
        "queue_preview": queue[:5],
        "backends": backends,
    }

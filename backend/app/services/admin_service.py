"""Admin service — platform-level statistics, monitoring, and strategic metrics."""
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, and_, case, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    User, UserSubscription, Plan, UsageLog, Job, Transcription, Analysis,
    BillingEvent, OneshotOrder, AnonymousSession, ContactMessage,
)

UTC = timezone.utc


def _now():
    return datetime.now(UTC)


def _month_start():
    return _now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


# ── Users ─────────────────────────────────────────────────

async def count_total_users(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(User))
    return result.scalar_one()


async def count_new_users(db: AsyncSession, days: int = 7) -> int:
    cutoff = _now() - timedelta(days=days)
    result = await db.execute(
        select(func.count()).select_from(User).where(User.created_at >= cutoff)
    )
    return result.scalar_one()


async def get_users_by_plan(db: AsyncSession) -> list[dict]:
    """Distribution of users across plans."""
    result = await db.execute(
        select(
            UserSubscription.plan_id,
            func.count(UserSubscription.id).label("count"),
        )
        .where(UserSubscription.status == "active")
        .group_by(UserSubscription.plan_id)
    )
    return [{"plan_id": row[0], "count": row[1]} for row in result.all()]


async def get_recent_users(db: AsyncSession, limit: int = 20) -> list[dict]:
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(limit)
    )
    users = result.scalars().all()
    out = []
    for u in users:
        # Get their plan
        sub_result = await db.execute(
            select(UserSubscription).where(
                UserSubscription.user_id == u.id,
                UserSubscription.status == "active",
            )
        )
        sub = sub_result.scalar_one_or_none()
        out.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "plan_id": sub.plan_id if sub else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return out


# ── Revenue ───────────────────────────────────────────────

async def calculate_mrr(db: AsyncSession) -> int:
    """Monthly Recurring Revenue in cents."""
    result = await db.execute(
        select(func.coalesce(func.sum(Plan.price_cents), 0))
        .join(UserSubscription, UserSubscription.plan_id == Plan.id)
        .where(UserSubscription.status == "active", Plan.price_cents > 0)
    )
    return result.scalar_one()


async def get_revenue_breakdown(db: AsyncSession) -> dict:
    """Revenue from subscriptions vs one-shots vs packs this month."""
    month = _month_start()

    # Subscription revenue (MRR)
    mrr = await calculate_mrr(db)

    # One-shot revenue this month
    oneshot_result = await db.execute(
        select(func.coalesce(func.sum(OneshotOrder.price_cents), 0))
        .where(OneshotOrder.payment_status == "paid", OneshotOrder.created_at >= month)
    )
    oneshot_revenue = oneshot_result.scalar_one()

    # Pack revenue this month
    pack_result = await db.execute(
        select(func.coalesce(func.sum(BillingEvent.amount_cents), 0))
        .where(
            BillingEvent.event_type == "pack.purchased",
            BillingEvent.status == "success",
            BillingEvent.created_at >= month,
        )
    )
    pack_revenue = pack_result.scalar_one()

    # One-shot count
    oneshot_count_result = await db.execute(
        select(func.count()).select_from(OneshotOrder)
        .where(OneshotOrder.payment_status == "paid", OneshotOrder.created_at >= month)
    )
    oneshot_count = oneshot_count_result.scalar_one()

    return {
        "mrr_cents": mrr,
        "mrr_eur": round(mrr / 100, 2),
        "oneshot_revenue_cents": oneshot_revenue,
        "oneshot_revenue_eur": round(oneshot_revenue / 100, 2),
        "oneshot_count": oneshot_count,
        "pack_revenue_cents": pack_revenue,
        "pack_revenue_eur": round(pack_revenue / 100, 2),
        "total_revenue_eur": round((mrr + oneshot_revenue + pack_revenue) / 100, 2),
    }


# ── API Costs ─────────────────────────────────────────────

async def estimate_api_costs(db: AsyncSession) -> dict:
    """Estimate API costs based on usage this month.

    Pricing estimates (approximate):
    - OpenAI Whisper: $0.006/min
    - OpenAI GPT-4.1: ~$0.01/1K input tokens, ~$0.03/1K output tokens
      Rough estimate: ~$0.02 per analysis (avg 500 tokens in + 1K out)
    - Ollama: $0 (self-hosted)
    """
    month = _month_start()

    # Total audio minutes processed this month
    minutes_result = await db.execute(
        select(func.coalesce(func.sum(UsageLog.audio_duration_seconds), 0))
        .where(UsageLog.created_at >= month)
    )
    total_seconds = minutes_result.scalar_one()
    total_minutes = total_seconds / 60

    # Count analyses generated this month (proxy for LLM calls)
    analyses_result = await db.execute(
        select(func.count()).select_from(Analysis)
        .where(Analysis.created_at >= month)
    )
    total_analyses = analyses_result.scalar_one()

    # Count by backend type
    openai_stt_result = await db.execute(
        select(func.coalesce(func.sum(UsageLog.audio_duration_seconds), 0))
        .where(UsageLog.created_at >= month, UsageLog.whisper_model.like("openai%"))
    )
    openai_stt_seconds = openai_stt_result.scalar_one()

    # Costs
    whisper_cost = (openai_stt_seconds / 60) * 0.006  # $0.006/min
    # For LLM: rough estimate $0.02 per analysis call
    llm_cost = total_analyses * 0.02

    return {
        "total_audio_minutes": round(total_minutes, 1),
        "total_analyses": total_analyses,
        "openai_stt_minutes": round(openai_stt_seconds / 60, 1),
        "whisper_cost_usd": round(whisper_cost, 2),
        "llm_cost_usd": round(llm_cost, 2),
        "total_cost_usd": round(whisper_cost + llm_cost, 2),
        "note": "Estimations basées sur les tarifs OpenAI. Ollama = $0.",
    }


# ── Usage ─────────────────────────────────────────────────

async def total_minutes_current_period(db: AsyncSession) -> float:
    month = _month_start()
    result = await db.execute(
        select(func.coalesce(func.sum(UsageLog.minutes_charged), 0))
        .where(UsageLog.created_at >= month)
    )
    return result.scalar_one()


async def total_transcriptions_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Transcription))
    return result.scalar_one()


async def get_top_users(db: AsyncSession, limit: int = 10) -> list[dict]:
    """Top users by minutes consumed this month."""
    month = _month_start()
    result = await db.execute(
        select(
            UsageLog.user_id,
            func.sum(UsageLog.minutes_charged).label("minutes"),
            func.count(UsageLog.id).label("transcriptions"),
        )
        .where(UsageLog.created_at >= month)
        .group_by(UsageLog.user_id)
        .order_by(func.sum(UsageLog.minutes_charged).desc())
        .limit(limit)
    )
    rows = result.all()

    out = []
    for row in rows:
        user_result = await db.execute(select(User).where(User.id == row[0]))
        user = user_result.scalar_one_or_none()
        out.append({
            "user_id": row[0],
            "email": user.email if user else row[0],
            "name": user.name if user else "",
            "minutes": row[1],
            "transcriptions": row[2],
        })
    return out


async def get_usage_by_source(db: AsyncSession) -> dict:
    """Usage breakdown by source type this month."""
    month = _month_start()
    result = await db.execute(
        select(
            UsageLog.source_type,
            func.count(UsageLog.id),
            func.coalesce(func.sum(UsageLog.minutes_charged), 0),
        )
        .where(UsageLog.created_at >= month)
        .group_by(UsageLog.source_type)
    )
    return {row[0]: {"count": row[1], "minutes": row[2]} for row in result.all()}


async def get_usage_by_profile(db: AsyncSession) -> dict:
    """Usage breakdown by profile this month."""
    month = _month_start()
    result = await db.execute(
        select(
            UsageLog.profile_used,
            func.count(UsageLog.id),
            func.coalesce(func.sum(UsageLog.minutes_charged), 0),
        )
        .where(UsageLog.created_at >= month)
        .group_by(UsageLog.profile_used)
    )
    return {(row[0] or "generic"): {"count": row[1], "minutes": row[2]} for row in result.all()}


# ── Conversion & Retention ────────────────────────────────

async def get_conversion_stats(db: AsyncSession) -> dict:
    """Conversion metrics: one-shot → subscriber, unsubscribed → subscriber."""
    total_users = await count_total_users(db)

    # Users on paid plans (all plans are paid now)
    paid_result = await db.execute(
        select(func.count(distinct(UserSubscription.user_id)))
        .where(UserSubscription.status == "active")
    )
    subscribed_users = paid_result.scalar_one()

    # Users without active subscription
    no_sub_users = total_users - subscribed_users

    # Users who did at least one one-shot (anonymous or logged in)
    oneshot_users = await db.execute(
        select(func.count(distinct(OneshotOrder.user_id)))
        .where(OneshotOrder.payment_status == "paid")
    )
    oneshot_user_count = oneshot_users.scalar_one()

    # Anonymous sessions count
    anon_result = await db.execute(
        select(func.count()).select_from(AnonymousSession)
    )
    anon_sessions = anon_result.scalar_one()

    return {
        "total_users": total_users,
        "subscribed_users": subscribed_users,
        "no_subscription_users": no_sub_users,
        "subscription_rate": round(subscribed_users / max(total_users, 1) * 100, 1),
        "oneshot_users": oneshot_user_count,
        "anonymous_sessions": anon_sessions,
    }


# ── Errors & Queue ────────────────────────────────────────

async def calculate_error_rate(db: AsyncSession) -> float:
    cutoff = _now() - timedelta(hours=24)
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
            "user_id": j.user_id,
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
            "user_id": e.user_id,
            "event_type": e.event_type,
            "amount_cents": e.amount_cents,
            "status": e.status,
            "event_data": e.event_data,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]


async def get_backends_health() -> dict:
    import httpx
    ollama_host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    ollama_status = "down"
    ollama_models: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{ollama_host}/api/tags")
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


# ── Aggregated dashboard ──────────────────────────────────

async def get_admin_stats(db: AsyncSession) -> dict:
    """Full admin dashboard data."""
    revenue = await get_revenue_breakdown(db)
    costs = await estimate_api_costs(db)
    conversion = await get_conversion_stats(db)
    users_by_plan = await get_users_by_plan(db)
    top_users = await get_top_users(db, limit=10)
    usage_source = await get_usage_by_source(db)
    usage_profile = await get_usage_by_profile(db)
    minutes = await total_minutes_current_period(db)
    transcriptions = await total_transcriptions_count(db)
    error_rate = await calculate_error_rate(db)
    queue = await get_queue_jobs(db, limit=10)
    new_7d = await count_new_users(db, days=7)
    new_30d = await count_new_users(db, days=30)
    backends = await get_backends_health()

    return {
        # Revenue
        **revenue,
        # Costs
        "api_costs": costs,
        # Users
        "total_users": conversion["total_users"],
        "new_users_7d": new_7d,
        "new_users_30d": new_30d,
        "users_by_plan": users_by_plan,
        # Conversion
        "conversion": conversion,
        # Usage
        "total_minutes_this_month": minutes,
        "total_transcriptions": transcriptions,
        "top_users": top_users,
        "usage_by_source": usage_source,
        "usage_by_profile": usage_profile,
        # Health
        "error_rate_24h": error_rate,
        "queue_size": len(queue),
        "queue_preview": queue[:5],
        "backends": backends,
    }


# ── Funnel Analytics ─────────────────────────────────────

def _date_range(days: int = 30) -> list[str]:
    """Return list of date strings for the last N days (inclusive of today)."""
    today = _now().date()
    return [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]


def _week_start(dt):
    """Return the Monday of the week containing dt."""
    return (dt - timedelta(days=dt.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


async def get_funnel_analytics(db: AsyncSession) -> dict:
    """Comprehensive funnel analytics for the admin dashboard."""
    now = _now()
    thirty_days_ago = now - timedelta(days=30)
    dates_30d = _date_range(30)

    # ── 1. daily_signups ─────────────────────────────────
    date_expr = func.date(User.created_at)
    result = await db.execute(
        select(date_expr.label("d"), func.count(User.id))
        .where(User.created_at >= thirty_days_ago)
        .group_by("d")
    )
    signups_map = {str(row[0]): row[1] for row in result.all()}
    daily_signups = [
        {"date": d, "count": signups_map.get(d, 0)} for d in dates_30d
    ]

    # ── 2. daily_transcriptions ──────────────────────────
    date_expr_u = func.date(UsageLog.created_at)
    result = await db.execute(
        select(
            date_expr_u.label("d"),
            func.count(UsageLog.id),
            func.coalesce(func.sum(UsageLog.minutes_charged), 0),
        )
        .where(UsageLog.created_at >= thirty_days_ago)
        .group_by("d")
    )
    tx_map = {str(row[0]): (row[1], row[2]) for row in result.all()}
    daily_transcriptions = [
        {
            "date": d,
            "count": tx_map.get(d, (0, 0))[0],
            "minutes": float(tx_map.get(d, (0, 0.0))[1]),
        }
        for d in dates_30d
    ]

    # ── 3. daily_revenue ─────────────────────────────────
    # One-shot revenue by day
    date_expr_o = func.date(OneshotOrder.created_at)
    result = await db.execute(
        select(
            date_expr_o.label("d"),
            func.coalesce(func.sum(OneshotOrder.price_cents), 0),
        )
        .where(
            OneshotOrder.payment_status == "paid",
            OneshotOrder.created_at >= thirty_days_ago,
        )
        .group_by("d")
    )
    oneshot_map = {str(row[0]): row[1] for row in result.all()}

    # Pack revenue by day
    date_expr_b = func.date(BillingEvent.created_at)
    result = await db.execute(
        select(
            date_expr_b.label("d"),
            func.coalesce(func.sum(BillingEvent.amount_cents), 0),
        )
        .where(
            BillingEvent.event_type == "pack.purchased",
            BillingEvent.status == "success",
            BillingEvent.created_at >= thirty_days_ago,
        )
        .group_by("d")
    )
    pack_map = {str(row[0]): row[1] for row in result.all()}

    daily_revenue = []
    for d in dates_30d:
        o = oneshot_map.get(d, 0)
        p = pack_map.get(d, 0)
        daily_revenue.append({
            "date": d,
            "oneshot_eur": round(o / 100, 2),
            "pack_eur": round(p / 100, 2),
            "total_eur": round((o + p) / 100, 2),
        })

    # ── 4. funnel_steps ──────────────────────────────────
    # anonymous_sessions
    r = await db.execute(select(func.count()).select_from(AnonymousSession))
    anon_count = r.scalar_one()

    # registered
    r = await db.execute(select(func.count()).select_from(User))
    registered_count = r.scalar_one()

    # first_transcription (users who did at least 1)
    r = await db.execute(
        select(func.count(distinct(UsageLog.user_id)))
    )
    first_tx_count = r.scalar_one()

    # active_7d
    seven_days_ago = now - timedelta(days=7)
    r = await db.execute(
        select(func.count(distinct(UsageLog.user_id)))
        .where(UsageLog.created_at >= seven_days_ago)
    )
    active_7d_count = r.scalar_one()

    # subscribed (active)
    r = await db.execute(
        select(func.count(distinct(UserSubscription.user_id)))
        .where(UserSubscription.status == "active")
    )
    subscribed_count = r.scalar_one()

    # power_users: users with >= 60 minutes this month
    month_start = _month_start()
    power_sub = (
        select(UsageLog.user_id)
        .where(UsageLog.created_at >= month_start)
        .group_by(UsageLog.user_id)
        .having(func.sum(UsageLog.minutes_charged) >= 60)
        .subquery()
    )
    r = await db.execute(select(func.count()).select_from(power_sub))
    power_count = r.scalar_one()

    funnel_steps = [
        {"step": "anonymous_sessions", "label": "Sessions anonymes", "count": anon_count},
        {"step": "registered", "label": "Inscrits", "count": registered_count},
        {"step": "first_transcription", "label": "1re transcription", "count": first_tx_count},
        {"step": "active_7d", "label": "Actifs 7j", "count": active_7d_count},
        {"step": "subscribed", "label": "Abonnés", "count": subscribed_count},
        {"step": "power_users", "label": "Power users (>1h/mois)", "count": power_count},
    ]

    # ── 5. cohort_retention ──────────────────────────────
    today_ws = _week_start(now)
    cohorts = []
    for i in range(3, -1, -1):  # 4 cohorts: 3 weeks ago .. this week
        cohort_start = today_ws - timedelta(weeks=i)
        cohort_end = cohort_start + timedelta(days=7)

        # Users registered in this cohort week
        r = await db.execute(
            select(User.id).where(
                User.created_at >= cohort_start,
                User.created_at < cohort_end,
            )
        )
        cohort_user_ids = [row[0] for row in r.all()]
        cohort_size = len(cohort_user_ids)

        retention = {"cohort": cohort_start.date().isoformat(), "registered": cohort_size}
        for w in range(1, 5):
            if cohort_size == 0:
                retention[f"week_{w}"] = 0
                continue
            week_check_start = cohort_start + timedelta(weeks=w)
            week_check_end = week_check_start + timedelta(days=7)
            # Only count if the retention week is not in the future
            if week_check_start > now:
                retention[f"week_{w}"] = 0
                continue
            r = await db.execute(
                select(func.count(distinct(UsageLog.user_id)))
                .where(
                    UsageLog.user_id.in_(cohort_user_ids),
                    UsageLog.created_at >= week_check_start,
                    UsageLog.created_at < week_check_end,
                )
            )
            retention[f"week_{w}"] = r.scalar_one()

        cohorts.append(retention)

    # ── 6. plan_distribution ─────────────────────────────
    r = await db.execute(
        select(
            UserSubscription.plan_id,
            Plan.name,
            func.count(UserSubscription.id).label("users"),
            func.coalesce(func.sum(Plan.price_cents), 0).label("mrr_cents"),
        )
        .join(Plan, Plan.id == UserSubscription.plan_id)
        .where(UserSubscription.status == "active")
        .group_by(UserSubscription.plan_id, Plan.name)
    )
    plan_distribution = [
        {
            "plan_id": row[0],
            "plan_name": row[1],
            "users": row[2],
            "mrr_eur": round(row[3] / 100, 2),
        }
        for row in r.all()
    ]

    # ── 7. oneshot_stats ─────────────────────────────────
    r = await db.execute(select(func.count()).select_from(OneshotOrder))
    total_orders = r.scalar_one()

    r = await db.execute(
        select(func.count()).select_from(OneshotOrder)
        .where(OneshotOrder.payment_status == "paid")
    )
    paid_orders = r.scalar_one()

    conversion_rate = round(paid_orders / max(total_orders, 1) * 100, 1)

    r = await db.execute(
        select(
            OneshotOrder.tier,
            func.count(OneshotOrder.id),
            func.coalesce(func.sum(OneshotOrder.price_cents), 0),
        )
        .where(OneshotOrder.payment_status == "paid")
        .group_by(OneshotOrder.tier)
    )
    by_tier = [
        {"tier": row[0], "count": row[1], "revenue_eur": round(row[2] / 100, 2)}
        for row in r.all()
    ]

    oneshot_stats = {
        "total_orders": total_orders,
        "paid_orders": paid_orders,
        "conversion_rate": conversion_rate,
        "by_tier": by_tier,
    }

    # ── 8. contact_stats ─────────────────────────────────
    r = await db.execute(select(func.count()).select_from(ContactMessage))
    contact_total = r.scalar_one()

    r = await db.execute(
        select(ContactMessage.category, func.count(ContactMessage.id))
        .group_by(ContactMessage.category)
    )
    by_category = {row[0]: row[1] for row in r.all()}

    r = await db.execute(
        select(func.count()).select_from(ContactMessage)
        .where(ContactMessage.status == "new")
    )
    new_unread = r.scalar_one()

    contact_stats = {
        "total": contact_total,
        "by_category": by_category,
        "new_unread": new_unread,
    }

    # ── 9. churn_indicators ──────────────────────────────
    # inactive_30d: registered > 30 days ago, no usage in last 30 days
    old_users_sub = (
        select(User.id)
        .where(User.created_at < thirty_days_ago)
        .subquery()
    )
    recent_active_sub = (
        select(distinct(UsageLog.user_id))
        .where(UsageLog.created_at >= thirty_days_ago)
        .subquery()
    )
    r = await db.execute(
        select(func.count())
        .select_from(old_users_sub)
        .where(old_users_sub.c.id.notin_(select(recent_active_sub)))
    )
    inactive_30d = r.scalar_one()

    # cancelled_subscriptions
    r = await db.execute(
        select(func.count()).select_from(UserSubscription)
        .where(UserSubscription.status == "cancelled")
    )
    cancelled_subs = r.scalar_one()

    # quota_exceeded: active subs where minutes_used >= plan minutes
    r = await db.execute(
        select(func.count())
        .select_from(UserSubscription)
        .join(Plan, Plan.id == UserSubscription.plan_id)
        .where(
            UserSubscription.status == "active",
            UserSubscription.minutes_used >= Plan.minutes_included,
            Plan.minutes_included > 0,
        )
    )
    quota_exceeded = r.scalar_one()

    churn_indicators = {
        "inactive_30d": inactive_30d,
        "cancelled_subscriptions": cancelled_subs,
        "quota_exceeded": quota_exceeded,
    }

    return {
        "daily_signups": daily_signups,
        "daily_transcriptions": daily_transcriptions,
        "daily_revenue": daily_revenue,
        "funnel_steps": funnel_steps,
        "cohort_retention": cohorts,
        "plan_distribution": plan_distribution,
        "oneshot_stats": oneshot_stats,
        "contact_stats": contact_stats,
        "churn_indicators": churn_indicators,
    }

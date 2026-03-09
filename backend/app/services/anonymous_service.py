"""Anonymous session management for Simple mode (one-shot without account)."""
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AnonymousSession

SESSION_DURATION_HOURS = 24
MAX_ONESHOT_PER_SESSION = 5


async def get_or_create_session(
    db: AsyncSession,
    cookie_token: str | None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AnonymousSession:
    """Return existing session or create a new one."""
    if cookie_token:
        result = await db.execute(
            select(AnonymousSession).where(
                AnonymousSession.cookie_token == cookie_token,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            if existing.expires_at > datetime.utcnow():
                return existing
            # Expired — reset and reuse
            existing.oneshot_count = 0
            existing.last_job_id = None
            existing.ip_address = ip_address
            existing.user_agent = user_agent
            existing.expires_at = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
            await db.commit()
            await db.refresh(existing)
            return existing

    # Create new session
    token = cookie_token or str(uuid.uuid4())
    session = AnonymousSession(
        cookie_token=token,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def increment_oneshot_count(db: AsyncSession, session_id: str, job_id: str) -> None:
    """Track a new one-shot usage for this anonymous session."""
    result = await db.execute(
        select(AnonymousSession).where(AnonymousSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session:
        session.oneshot_count += 1
        session.last_job_id = job_id
        await db.commit()


async def can_use_oneshot(db: AsyncSession, session_id: str) -> bool:
    """Check if session has not exceeded one-shot limit."""
    result = await db.execute(
        select(AnonymousSession).where(AnonymousSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        return False
    return session.oneshot_count < MAX_ONESHOT_PER_SESSION


async def cleanup_expired(db: AsyncSession) -> int:
    """Remove expired anonymous sessions. Returns count deleted."""
    from sqlalchemy import delete
    result = await db.execute(
        delete(AnonymousSession).where(AnonymousSession.expires_at < datetime.utcnow())
    )
    await db.commit()
    return result.rowcount

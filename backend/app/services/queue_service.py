"""Job queue management with priority ordering and ETA estimation."""
import logging
import os
from sqlalchemy import select, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Job

logger = logging.getLogger(__name__)

# Average processing rates (seconds per MB of audio file)
WHISPER_RATE_GPU = 0.5  # GPU: ~2x realtime
WHISPER_RATE_CPU = 4.0  # CPU: ~0.25x realtime
ANALYSIS_AVG_SECONDS = 15  # Average per analysis type

PRIORITY_ORDER = {"P0": 0, "P1": 1, "P2": 2}


def estimate_processing_time(file_size_bytes: int, num_analyses: int = 9, gpu: bool = True) -> float:
    """Estimate processing time in seconds based on file size and number of analyses."""
    file_mb = file_size_bytes / (1024 * 1024)
    whisper_rate = WHISPER_RATE_GPU if gpu else WHISPER_RATE_CPU
    whisper_time = file_mb * whisper_rate
    analysis_time = num_analyses * ANALYSIS_AVG_SECONDS
    return round(whisper_time + analysis_time, 1)


async def get_queue_status(db: AsyncSession) -> list[dict]:
    """Get ordered queue of pending/processing jobs with position."""
    priority_case = case(
        (Job.priority == "P0", 0),
        (Job.priority == "P1", 1),
        (Job.priority == "P2", 2),
        else_=1,
    )
    result = await db.execute(
        select(Job)
        .where(Job.status.in_(["pending", "processing"]))
        .order_by(priority_case, Job.created_at.asc())
    )
    jobs = result.scalars().all()

    queue = []
    for i, job in enumerate(jobs):
        queue.append({
            "id": job.id,
            "filename": os.path.basename(job.file_path),
            "status": job.status,
            "priority": getattr(job, "priority", "P1") or "P1",
            "profile": job.profile,
            "estimated_seconds": getattr(job, "estimated_seconds", None),
            "queue_position": i + 1,
            "created_at": str(job.created_at) if job.created_at else None,
        })
    return queue


async def update_job_priority(job_id: str, priority: str, db: AsyncSession) -> bool:
    """Update priority of a pending job. Returns False if job not found or not pending."""
    if priority not in PRIORITY_ORDER:
        return False
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job or job.status not in ("pending",):
        return False
    job.priority = priority
    await db.commit()
    logger.info(f"Job {job_id} priority changed to {priority}")
    return True


async def retry_failed_job(job_id: str, db: AsyncSession):
    """Reset a failed job to pending for retry. Returns the job or None."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job or job.status != "failed":
        return None
    job.status = "pending"
    job.error_message = None
    await db.commit()
    logger.info(f"Job {job_id} reset to pending for retry")
    return job

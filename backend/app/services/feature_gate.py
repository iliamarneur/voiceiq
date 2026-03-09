"""Feature gating service — enforces plan-based access control.

Each plan has a 'features' list in plans.json. This module provides:
- check_feature(): verify a user can access a feature
- require_feature(): FastAPI dependency for endpoint protection
- get_plan_features(): list features for current plan
"""
import logging
from functools import wraps

from fastapi import HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import Plan, UserSubscription

logger = logging.getLogger(__name__)

# Feature → human-readable label (for error messages)
FEATURE_LABELS = {
    "transcription": "Transcription",
    "summary": "Resume",
    "keypoints": "Points cles",
    "actions": "Actions",
    "flashcards": "Flashcards",
    "quiz": "Quiz",
    "chat": "Chat avec transcription",
    "dictation": "Dictee en direct",
    "mindmap": "Carte mentale",
    "slides": "Diapositives",
    "infographic": "Infographie",
    "tables": "Tableaux",
    "export_txt": "Export TXT",
    "export_pdf": "Export PDF",
    "export_md": "Export Markdown",
    "export_pptx": "Export PowerPoint",
    "templates": "Templates personnalises",
    "presets": "Presets audio",
    "priority_queue": "File prioritaire",
    "multi_workspace": "Multi-workspace",
    "shared_presets": "Presets partages",
    "batch_export": "Export groupé",
}


async def get_plan_features(db: AsyncSession, user_id: str = "default") -> dict:
    """Get features and limits for user's current plan."""
    result = await db.execute(
        select(UserSubscription).where(
            UserSubscription.user_id == user_id,
            UserSubscription.status == "active",
        )
    )
    sub = result.scalar_one_or_none()
    plan_id = sub.plan_id if sub else "free"

    plan_result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = plan_result.scalar_one_or_none()

    if not plan:
        return {"plan_id": "free", "features": ["transcription", "summary", "keypoints"], "max_dictionaries": 3, "max_workspaces": 1}

    return {
        "plan_id": plan.id,
        "plan_name": plan.name,
        "features": plan.features or [],
        "max_dictionaries": plan.max_dictionaries,
        "max_workspaces": plan.max_workspaces,
    }


async def check_feature(db: AsyncSession, feature: str, user_id: str = "default") -> bool:
    """Check if user's plan includes a feature. Returns True/False."""
    info = await get_plan_features(db, user_id)
    return feature in info["features"]


async def require_feature_check(db: AsyncSession, feature: str, user_id: str = "default"):
    """Raise HTTPException 403 if feature not in plan."""
    info = await get_plan_features(db, user_id)
    if feature not in info["features"]:
        label = FEATURE_LABELS.get(feature, feature)
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_not_available",
                "feature": feature,
                "message": f"La fonctionnalite '{label}' n'est pas incluse dans votre plan {info.get('plan_name', info['plan_id'])}. Passez a un plan superieur.",
                "plan_id": info["plan_id"],
                "upgrade_required": True,
            }
        )


async def check_dictionary_limit(db: AsyncSession, user_id: str = "default") -> dict:
    """Check if user can create more dictionaries."""
    info = await get_plan_features(db, user_id)
    max_dicts = info["max_dictionaries"]
    if max_dicts == -1:
        return {"allowed": True, "current": 0, "max": -1}

    from app.models import UserDictionary
    count_result = await db.execute(
        select(UserDictionary).where(UserDictionary.user_id == user_id)
    )
    current = len(count_result.scalars().all())

    return {
        "allowed": current < max_dicts,
        "current": current,
        "max": max_dicts,
        "plan_id": info["plan_id"],
    }

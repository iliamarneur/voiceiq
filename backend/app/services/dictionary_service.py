"""User dictionary management and transcription post-correction."""
import logging
import os
import re
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import UserDictionary, DictionaryEntry, UserCorrection, UserSubscription, Plan

logger = logging.getLogger(__name__)

ENABLE_CORRECTION_LEARNING = os.environ.get("ENABLE_CORRECTION_LEARNING", "false").lower() == "true"


async def get_all_dictionaries(db: AsyncSession) -> list:
    """Return all user dictionaries with their entries."""
    result = await db.execute(select(UserDictionary).order_by(UserDictionary.created_at.desc()))
    return result.scalars().all()


async def get_dictionary(dictionary_id: str, db: AsyncSession) -> Optional[UserDictionary]:
    result = await db.execute(select(UserDictionary).where(UserDictionary.id == dictionary_id))
    return result.scalar_one_or_none()


async def check_dictionary_limit(db: AsyncSession, user_id: str = "default") -> None:
    """Check if the user can create more dictionaries based on their plan."""
    sub_result = await db.execute(
        select(UserSubscription).where(
            UserSubscription.user_id == user_id,
            UserSubscription.status == "active",
        )
    )
    sub = sub_result.scalar_one_or_none()
    if not sub:
        return  # No subscription = no limit (free tier auto-created later)

    plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_result.scalar_one_or_none()
    if not plan or plan.max_dictionaries == -1:
        return  # Unlimited

    count_result = await db.execute(select(func.count()).select_from(UserDictionary))
    current_count = count_result.scalar() or 0

    if current_count >= plan.max_dictionaries:
        raise ValueError(
            f"Limite atteinte : votre plan {plan.name} autorise {plan.max_dictionaries} dictionnaire(s). "
            f"Passez a un plan superieur pour en creer davantage."
        )


async def create_dictionary(name: str, description: str, db: AsyncSession) -> UserDictionary:
    await check_dictionary_limit(db)
    d = UserDictionary(name=name, description=description)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return d


async def delete_dictionary(dictionary_id: str, db: AsyncSession) -> bool:
    d = await get_dictionary(dictionary_id, db)
    if not d:
        return False
    await db.delete(d)
    await db.commit()
    return True


async def add_entry(dictionary_id: str, term: str, replacement: str, category: str, db: AsyncSession) -> DictionaryEntry:
    entry = DictionaryEntry(
        dictionary_id=dictionary_id,
        term=term,
        replacement=replacement,
        category=category,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def delete_entry(entry_id: str, db: AsyncSession) -> bool:
    result = await db.execute(select(DictionaryEntry).where(DictionaryEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        return False
    await db.delete(entry)
    await db.commit()
    return True


async def get_dictionary_entries(dictionary_id: str, db: AsyncSession) -> list:
    result = await db.execute(
        select(DictionaryEntry).where(DictionaryEntry.dictionary_id == dictionary_id)
    )
    return result.scalars().all()


def apply_dictionary_corrections(text: str, entries: list[dict]) -> str:
    """Apply dictionary term replacements to transcription text.

    Uses word-boundary matching to avoid partial replacements.
    Entries should be sorted by term length (longest first) to avoid conflicts.
    """
    if not entries:
        return text
    sorted_entries = sorted(entries, key=lambda e: len(e["term"]), reverse=True)
    for entry in sorted_entries:
        term = entry["term"]
        replacement = entry["replacement"]
        pattern = re.compile(r'\b' + re.escape(term) + r'\b', re.IGNORECASE)
        text = pattern.sub(replacement, text)
    return text


def build_dictionary_context(entries: list[dict]) -> str:
    """Build a glossary context string to inject into LLM prompts."""
    if not entries:
        return ""
    lines = ["Glossaire de termes specifiques (utilise ces formes exactes) :"]
    for entry in entries:
        cat = f" [{entry['category']}]" if entry.get("category", "general") != "general" else ""
        lines.append(f"- {entry['term']} = {entry['replacement']}{cat}")
    return "\n".join(lines)


async def save_correction(
    transcription_id: str, original_text: str, corrected_text: str,
    field_type: str, db: AsyncSession
) -> UserCorrection:
    """Store a user correction. If learning is enabled, add to default dictionary."""
    correction = UserCorrection(
        transcription_id=transcription_id,
        original_text=original_text,
        corrected_text=corrected_text,
        field_type=field_type,
    )
    db.add(correction)

    if ENABLE_CORRECTION_LEARNING and field_type == "transcription":
        # Auto-learn: add to first available dictionary or create one
        result = await db.execute(select(UserDictionary).limit(1))
        dictionary = result.scalar_one_or_none()
        if not dictionary:
            dictionary = UserDictionary(name="Auto-learned", description="Corrections automatiques")
            db.add(dictionary)
            await db.flush()

        # Only add if it looks like a term substitution (not a full sentence)
        if len(original_text.split()) <= 5 and len(corrected_text.split()) <= 5:
            existing = await db.execute(
                select(DictionaryEntry).where(
                    DictionaryEntry.dictionary_id == dictionary.id,
                    DictionaryEntry.term == original_text,
                )
            )
            if not existing.scalar_one_or_none():
                entry = DictionaryEntry(
                    dictionary_id=dictionary.id,
                    term=original_text,
                    replacement=corrected_text,
                    category="auto_learned",
                )
                db.add(entry)
                logger.info(f"Auto-learned correction: '{original_text}' -> '{corrected_text}'")

    await db.commit()
    await db.refresh(correction)
    return correction


async def get_corrections(db: AsyncSession, limit: int = 50) -> list:
    result = await db.execute(
        select(UserCorrection).order_by(UserCorrection.created_at.desc()).limit(limit)
    )
    return result.scalars().all()

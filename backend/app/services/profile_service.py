import json
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

PROFILES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "profiles")

_profiles_cache: dict = {}


def _load_profiles():
    """Load all profile JSON files from the profiles directory."""
    global _profiles_cache
    _profiles_cache = {}
    if not os.path.isdir(PROFILES_DIR):
        logger.warning(f"Profiles directory not found: {PROFILES_DIR}")
        return
    for filename in os.listdir(PROFILES_DIR):
        if not filename.endswith(".json"):
            continue
        filepath = os.path.join(PROFILES_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                profile = json.load(f)
            profile_id = profile.get("id", filename.replace(".json", ""))
            _profiles_cache[profile_id] = profile
            logger.info(f"Loaded profile: {profile_id} ({profile.get('name', '')})")
        except Exception as e:
            logger.error(f"Failed to load profile {filename}: {e}")


def get_all_profiles() -> list[dict]:
    """Return all available profiles."""
    if not _profiles_cache:
        _load_profiles()
    return list(_profiles_cache.values())


def get_profile(profile_id: str) -> Optional[dict]:
    """Return a specific profile by ID."""
    if not _profiles_cache:
        _load_profiles()
    return _profiles_cache.get(profile_id)


def get_profile_analyses(profile_id: str) -> list[dict]:
    """Return the list of enabled analyses for a profile."""
    profile = get_profile(profile_id)
    if not profile:
        return []
    return [a for a in profile.get("analyses", []) if a.get("enabled", True)]


def get_analysis_prompt(profile_id: str, analysis_type: str) -> Optional[str]:
    """Return the prompt for a specific analysis type within a profile."""
    analyses = get_profile_analyses(profile_id)
    for a in analyses:
        if a["type"] == analysis_type:
            return a.get("prompt")
    return None


def get_profile_exports(profile_id: str) -> list[str]:
    """Return available export formats for a profile."""
    profile = get_profile(profile_id)
    if not profile:
        return ["json", "md", "txt"]
    return profile.get("exports", ["json", "md", "txt"])


def get_profile_templates(profile_id: str) -> list[dict]:
    """Return default templates for a profile."""
    profile = get_profile(profile_id)
    if not profile:
        return []
    return profile.get("default_templates", [])


def reload_profiles():
    """Force reload all profiles from disk."""
    _load_profiles()

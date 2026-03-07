"""Audio type detection and preprocessing configuration."""
import logging
import os

logger = logging.getLogger(__name__)

# Audio type detection profiles with default processing parameters
AUDIO_TYPE_PROFILES = {
    "meeting": {
        "label": "Reunion",
        "vad_sensitivity": "high",
        "min_silence_ms": 300,
        "description": "Multi-speaker meeting, possibly noisy",
    },
    "meeting_noisy": {
        "label": "Reunion bruyante",
        "vad_sensitivity": "high",
        "min_silence_ms": 200,
        "description": "Noisy meeting with background noise",
    },
    "podcast": {
        "label": "Podcast",
        "vad_sensitivity": "medium",
        "min_silence_ms": 500,
        "description": "Clean audio, 1-3 speakers",
    },
    "lecture": {
        "label": "Cours magistral",
        "vad_sensitivity": "low",
        "min_silence_ms": 800,
        "description": "Single speaker, structured content",
    },
    "phone_call": {
        "label": "Appel telephonique",
        "vad_sensitivity": "high",
        "min_silence_ms": 400,
        "description": "Phone quality audio, 2 speakers",
    },
    "interview": {
        "label": "Entretien",
        "vad_sensitivity": "medium",
        "min_silence_ms": 500,
        "description": "2-3 speakers, alternating",
    },
    "conference": {
        "label": "Conference",
        "vad_sensitivity": "medium",
        "min_silence_ms": 600,
        "description": "Conference talk, possibly with Q&A",
    },
    "dictation": {
        "label": "Dictee / Note vocale",
        "vad_sensitivity": "low",
        "min_silence_ms": 1000,
        "description": "Single speaker dictation",
    },
    "other": {
        "label": "Autre",
        "vad_sensitivity": "medium",
        "min_silence_ms": 500,
        "description": "Unclassified audio",
    },
}

# Mapping from business profiles to likely audio types
PROFILE_AUDIO_DEFAULTS = {
    "business": "meeting",
    "education": "lecture",
    "medical": "dictation",
    "legal": "meeting",
    "generic": "other",
}


def get_audio_type_profiles() -> dict:
    """Return all available audio type profiles."""
    return AUDIO_TYPE_PROFILES


def get_vad_params(audio_type: str = None, profile_id: str = None) -> dict:
    """Get VAD parameters for a given audio type or profile.

    Priority: explicit audio_type > profile default > global default.
    """
    effective_type = audio_type
    if not effective_type and profile_id:
        effective_type = PROFILE_AUDIO_DEFAULTS.get(profile_id)
    if not effective_type:
        effective_type = "other"

    type_config = AUDIO_TYPE_PROFILES.get(effective_type, AUDIO_TYPE_PROFILES["other"])

    sensitivity_map = {
        "low": {"min_silence_duration_ms": type_config["min_silence_ms"], "threshold": 0.3},
        "medium": {"min_silence_duration_ms": type_config["min_silence_ms"], "threshold": 0.5},
        "high": {"min_silence_duration_ms": type_config["min_silence_ms"], "threshold": 0.7},
    }
    sensitivity = type_config.get("vad_sensitivity", "medium")
    return sensitivity_map.get(sensitivity, sensitivity_map["medium"])


def detect_audio_type_heuristic(duration: float, num_segments: int, avg_segment_length: float) -> str:
    """Simple heuristic to guess audio type from transcription stats.

    This is a fast approximation. The LLM-based detection is more accurate.
    """
    if duration < 60:
        return "dictation"

    segments_per_minute = num_segments / (duration / 60) if duration > 0 else 0

    if segments_per_minute > 20:
        return "meeting_noisy"
    elif segments_per_minute > 12:
        return "meeting"
    elif avg_segment_length > 15:
        return "lecture"
    elif segments_per_minute < 5:
        return "dictation"
    elif 5 <= segments_per_minute <= 10:
        return "podcast"
    else:
        return "interview"

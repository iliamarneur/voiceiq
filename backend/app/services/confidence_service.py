"""v5.x — Confidence scoring per segment."""


def compute_segment_confidence(segment: dict, audio_type: str | None = None) -> int:
    """Compute a confidence score (0-100) for a single segment."""
    score = 75  # baseline

    # Whisper confidence if available
    if "avg_logprob" in segment:
        logprob = segment["avg_logprob"]
        if logprob > -0.2:
            score += 15
        elif logprob > -0.5:
            score += 5
        elif logprob < -1.0:
            score -= 20
        elif logprob < -0.7:
            score -= 10

    # No-speech probability
    if "no_speech_prob" in segment:
        nsp = segment["no_speech_prob"]
        if nsp > 0.8:
            score -= 25
        elif nsp > 0.5:
            score -= 10

    # Segment length heuristic
    text = segment.get("text", "")
    word_count = len(text.split())
    duration = segment.get("end", 0) - segment.get("start", 0)
    if duration > 0 and word_count > 0:
        words_per_sec = word_count / duration
        if words_per_sec > 5:  # unusually fast
            score -= 10
        elif words_per_sec < 0.5:  # unusually slow
            score -= 5

    # Overlap penalty
    if segment.get("overlap"):
        score -= 10

    # Audio type bonus (some types are more reliable)
    reliable_types = {"lecture", "interview", "podcast"}
    if audio_type in reliable_types:
        score += 5

    return max(0, min(100, score))


def compute_confidence_scores(segments: list, audio_type: str | None = None) -> list[int]:
    """Compute confidence scores for all segments."""
    return [compute_segment_confidence(seg, audio_type) for seg in segments]


def confidence_color(score: int) -> str:
    """Return CSS color class for a score."""
    if score >= 70:
        return "green"
    elif score >= 40:
        return "orange"
    return "red"


# Micro-tips based on audio type and profile
MICRO_TIPS = {
    "meeting": {
        "generic": "Audio detecte comme reunion : essayez le profil Business pour un CR structure.",
        "business": "Reunion detectee : les actions et decisions sont extraites automatiquement.",
        "education": "Reunion detectee : les points cles sont organises par theme.",
    },
    "lecture": {
        "generic": "Audio detecte comme cours : le profil Education genere des flashcards et quiz.",
        "education": "Cours detecte : flashcards et quiz sont prets pour la revision.",
    },
    "podcast": {
        "generic": "Audio detecte comme podcast : les points cles et le mindmap sont particulierement utiles.",
    },
    "phone_call": {
        "generic": "Appel telephonique detecte : la qualite peut varier, verifiez les segments orange/rouge.",
        "business": "Appel detecte : les actions et suivis sont extraits automatiquement.",
        "medical": "Appel medical detecte : les prescriptions et points de vigilance sont prioritaires.",
    },
    "interview": {
        "generic": "Interview detectee : les locuteurs sont identifies automatiquement.",
        "legal": "Entretien juridique detecte : clauses et obligations sont extraites.",
    },
}


def get_micro_tip(audio_type: str | None, profile: str) -> str | None:
    """Return a contextual micro-tip for the audio type and profile."""
    if not audio_type:
        return None
    type_tips = MICRO_TIPS.get(audio_type, {})
    return type_tips.get(profile) or type_tips.get("generic")

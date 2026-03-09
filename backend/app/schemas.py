from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class JobOut(BaseModel):
    id: str
    status: str
    file_path: str
    transcription_id: Optional[str] = None
    profile: str = "generic"
    priority: str = "P1"
    estimated_seconds: Optional[float] = None
    error_message: Optional[str] = None
    preset_id: Optional[str] = None
    model_config = {"from_attributes": True}


class TranscriptionSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscriptionOut(BaseModel):
    id: str
    filename: str
    text: str
    segments: list
    language: Optional[str] = None
    duration: Optional[float] = None
    status: str
    profile: str = "generic"
    processing_info: Optional[dict] = None
    oneshot_order_id: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class AnalysisOut(BaseModel):
    id: str
    type: str
    content: dict
    instructions: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class StatsOut(BaseModel):
    total: int
    total_duration: float
    languages: dict


class ChatMessageOut(BaseModel):
    id: int
    transcription_id: str
    role: str
    content: str
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str


class ChapterOut(BaseModel):
    id: str
    transcription_id: str
    title: str
    start_time: float
    end_time: float
    summary: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class TemplateOut(BaseModel):
    id: str
    name: str
    type: str
    instructions: str
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class TemplateCreate(BaseModel):
    name: str
    type: str
    instructions: str


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    instructions: Optional[str] = None


class TranslateRequest(BaseModel):
    target_lang: str  # "en" or "fr"


class TranslationOut(BaseModel):
    id: str
    transcription_id: str
    target_lang: str
    translated_text: str
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class GlossaryTerm(BaseModel):
    term: str
    definition: str


class GlossaryOut(BaseModel):
    terms: List[GlossaryTerm]


class ProfileAnalysis(BaseModel):
    type: str
    label: str
    enabled: bool = True


class ProfileOut(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    color: str
    version: str = "3.1"
    analyses: List[ProfileAnalysis]
    exports: List[str]
    default_templates: list = []


# ── v5 Schemas ──────────────────────────────────────────

class SpeakerLabelOut(BaseModel):
    id: str
    transcription_id: str
    speaker_id: str
    display_name: str
    model_config = {"from_attributes": True}


class SpeakerLabelUpdate(BaseModel):
    speakers: dict  # {"Speaker 1": "Dr Dupont", "Speaker 2": "Patient"}


class DictionaryEntryOut(BaseModel):
    id: str
    dictionary_id: str
    term: str
    replacement: str
    category: str = "general"
    model_config = {"from_attributes": True}


class DictionaryEntryCreate(BaseModel):
    term: str
    replacement: str
    category: str = "general"


class DictionaryOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    entries: List[DictionaryEntryOut] = []
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class DictionaryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class AudioPresetOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    profile_id: str = "generic"
    audio_type: Optional[str] = None
    vad_sensitivity: str = "medium"
    min_silence_ms: int = 500
    dictionary_id: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class AudioPresetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    profile_id: str = "generic"
    audio_type: Optional[str] = None
    vad_sensitivity: str = "medium"
    min_silence_ms: int = 500
    dictionary_id: Optional[str] = None


class AudioPresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    profile_id: Optional[str] = None
    audio_type: Optional[str] = None
    vad_sensitivity: Optional[str] = None
    min_silence_ms: Optional[int] = None
    dictionary_id: Optional[str] = None


class CorrectionCreate(BaseModel):
    original_text: str
    corrected_text: str
    field_type: str = "transcription"


class CorrectionOut(BaseModel):
    id: str
    transcription_id: str
    original_text: str
    corrected_text: str
    field_type: str
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class QueueItemOut(BaseModel):
    id: str
    filename: str
    status: str
    priority: str
    profile: str
    estimated_seconds: Optional[float] = None
    queue_position: int
    created_at: Optional[datetime] = None


class PriorityUpdate(BaseModel):
    priority: str  # P0, P1, P2


# ── v5.x Schemas ──────────────────────────────────────────

class UserPreferencesOut(BaseModel):
    id: str = "default"
    summary_detail: str = "balanced"
    summary_tone: str = "neutral"
    default_profile: str = "generic"
    default_priority: str = "P1"
    default_preset_id: Optional[str] = None
    model_config = {"from_attributes": True}


class UserPreferencesUpdate(BaseModel):
    summary_detail: Optional[str] = None  # short, balanced, detailed
    summary_tone: Optional[str] = None  # formal, neutral, friendly
    default_profile: Optional[str] = None
    default_priority: Optional[str] = None
    default_preset_id: Optional[str] = None


class KeyMomentOut(BaseModel):
    index: int
    start: float
    end: float
    text: str
    reason: str


class ConfidenceInfo(BaseModel):
    scores: List[int]
    micro_tip: Optional[str] = None


# ── v6 Schemas ────────────────────────────────────────────

# ── v7 Schemas ────────────────────────────────────────────

class PlanOut(BaseModel):
    id: str
    name: str
    price_cents: int
    minutes_included: int
    features: list
    max_dictionaries: int
    max_workspaces: int
    priority_default: str
    active: bool = True
    model_config = {"from_attributes": True}


class SubscriptionOut(BaseModel):
    id: str
    user_id: str
    plan_id: str
    plan_name: str = ""
    status: str
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    minutes_used: int = 0
    minutes_included: int = 0
    minutes_remaining: int = 0
    extra_minutes_balance: int = 0
    created_at: Optional[datetime] = None


class UsageLogOut(BaseModel):
    id: str
    transcription_id: Optional[str] = None
    audio_duration_seconds: float
    minutes_charged: int
    minute_source: str
    source_type: str
    profile_used: Optional[str] = None
    whisper_model: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    language: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class UsageSummaryOut(BaseModel):
    plan_id: str
    plan_name: str
    minutes_included: int
    minutes_used: int
    minutes_remaining: int
    extra_minutes_balance: int
    total_transcriptions: int
    total_audio_minutes: float
    by_source: dict  # {upload: X, recording: Y, dictation: Z}
    by_profile: dict  # {business: X, cours: Y, ...}


class OneshotOrderOut(BaseModel):
    id: str
    tier: str
    price_cents: int
    audio_duration_seconds: Optional[float] = None
    payment_status: str
    transcription_id: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class OneshotEstimate(BaseModel):
    tier: str
    price_cents: int
    max_duration_minutes: int
    includes: List[str]


class AddMinutesRequest(BaseModel):
    pack: str  # S, M, L


class DictationSessionOut(BaseModel):
    id: str
    status: str
    profile: str
    language: Optional[str] = None
    current_text: str = ""
    chunk_count: int = 0
    total_duration: float = 0.0
    transcription_id: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class DictationStartRequest(BaseModel):
    profile: str = "generic"


class DictationChunkResponse(BaseModel):
    chunk_text: str
    full_text: str
    chunk_count: int
    language: Optional[str] = None


class DictationSaveResponse(BaseModel):
    transcription_id: str
    job_id: str
    text: str

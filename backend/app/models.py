import uuid
from sqlalchemy import Column, String, Float, Text, ForeignKey, JSON, DateTime, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, nullable=False, default="pending")
    file_path = Column(String, nullable=False)
    transcription_id = Column(String, nullable=True)
    profile = Column(String, nullable=False, default="generic")
    priority = Column(String, nullable=False, default="P1")  # P0=urgent, P1=normal, P2=low
    estimated_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    preset_id = Column(String, nullable=True)
    source_type = Column(String, nullable=False, default="file")  # file, recording, dictation
    created_at = Column(DateTime, server_default=func.now())


class Transcription(Base):
    __tablename__ = "transcriptions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    segments = Column(JSON, nullable=False, default=list)
    language = Column(String, nullable=True)
    duration = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="completed")
    profile = Column(String, nullable=False, default="generic")
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    analyses = relationship("Analysis", back_populates="transcription", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="transcription", cascade="all, delete-orphan")
    chapters = relationship("Chapter", back_populates="transcription", cascade="all, delete-orphan")
    audio_type = Column(String, nullable=True)  # meeting, podcast, lecture, phone_call, etc.
    confidence_scores = Column(JSON, nullable=True)  # v5.x: list of confidence scores per segment [0-100]
    processing_info = Column(JSON, nullable=True)  # {stt_backend, llm_backend, stt_model, llm_model, processing_seconds}
    translations = relationship("TranslationCache", back_populates="transcription", cascade="all, delete-orphan")
    speaker_labels = relationship("SpeakerLabel", back_populates="transcription", cascade="all, delete-orphan")
    oneshot_order_id = Column(String, nullable=True)  # set when transcription comes from a one-shot order


class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transcription_id = Column(String, ForeignKey("transcriptions.id"), nullable=False)
    type = Column(String, nullable=False)
    content = Column(JSON, nullable=False, default=dict)
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    transcription = relationship("Transcription", back_populates="analyses")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    transcription_id = Column(String, ForeignKey("transcriptions.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    transcription = relationship("Transcription", back_populates="chat_messages")


class Chapter(Base):
    __tablename__ = "chapters"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transcription_id = Column(String, ForeignKey("transcriptions.id"), nullable=False)
    title = Column(String, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    transcription = relationship("Transcription", back_populates="chapters")


class Template(Base):
    __tablename__ = "templates"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # analysis type
    instructions = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TranslationCache(Base):
    __tablename__ = "translation_cache"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transcription_id = Column(String, ForeignKey("transcriptions.id"), nullable=False)
    target_lang = Column(String, nullable=False)
    translated_text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    transcription = relationship("Transcription", back_populates="translations")


# ── v5 Models ────────────────────────────────────────────

class SpeakerLabel(Base):
    __tablename__ = "speaker_labels"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transcription_id = Column(String, ForeignKey("transcriptions.id"), nullable=False)
    speaker_id = Column(String, nullable=False)  # "Speaker 1", "Speaker 2", etc.
    display_name = Column(String, nullable=False)  # "Dr Dupont", "Patient", etc.
    created_at = Column(DateTime, server_default=func.now())
    transcription = relationship("Transcription", back_populates="speaker_labels")


class UserDictionary(Base):
    __tablename__ = "user_dictionaries"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    entries = relationship("DictionaryEntry", back_populates="dictionary", cascade="all, delete-orphan")


class DictionaryEntry(Base):
    __tablename__ = "dictionary_entries"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    dictionary_id = Column(String, ForeignKey("user_dictionaries.id"), nullable=False)
    term = Column(String, nullable=False)
    replacement = Column(String, nullable=False)
    category = Column(String, nullable=False, default="general")  # nom_propre, acronyme, medical, juridique, technique, general
    created_at = Column(DateTime, server_default=func.now())
    dictionary = relationship("UserDictionary", back_populates="entries")


class AudioPreset(Base):
    __tablename__ = "audio_presets"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    profile_id = Column(String, nullable=False, default="generic")
    audio_type = Column(String, nullable=True)  # meeting, podcast, lecture, phone_call, etc.
    vad_sensitivity = Column(String, nullable=False, default="medium")  # low, medium, high
    min_silence_ms = Column(Integer, nullable=False, default=500)
    dictionary_id = Column(String, ForeignKey("user_dictionaries.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UserCorrection(Base):
    __tablename__ = "user_corrections"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transcription_id = Column(String, ForeignKey("transcriptions.id"), nullable=False)
    original_text = Column(Text, nullable=False)
    corrected_text = Column(Text, nullable=False)
    field_type = Column(String, nullable=False, default="transcription")  # transcription, analysis, speaker
    created_at = Column(DateTime, server_default=func.now())


# ── v5.x Models ──────────────────────────────────────────

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    id = Column(String, primary_key=True, default="default")  # single-user: always "default"
    summary_detail = Column(String, nullable=False, default="balanced")  # short, balanced, detailed
    summary_tone = Column(String, nullable=False, default="neutral")  # formal, neutral, friendly
    default_profile = Column(String, nullable=False, default="generic")
    default_priority = Column(String, nullable=False, default="P1")
    default_preset_id = Column(String, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ── v6 Models ────────────────────────────────────────────

# ── v7 Models ────────────────────────────────────────────

class Plan(Base):
    __tablename__ = "plans"
    id = Column(String, primary_key=True)  # free, oneshot, basic, pro, team
    name = Column(String, nullable=False)
    price_cents = Column(Integer, nullable=False, default=0)
    minutes_included = Column(Integer, nullable=False, default=0)
    features = Column(JSON, nullable=False, default=list)
    max_dictionaries = Column(Integer, nullable=False, default=1)
    max_workspaces = Column(Integer, nullable=False, default=1)
    priority_default = Column(String, nullable=False, default="P1")
    active = Column(Integer, nullable=False, default=1)  # SQLite boolean


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, default="default")
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)
    status = Column(String, nullable=False, default="active")  # active, cancelled, expired
    current_period_start = Column(DateTime, server_default=func.now())
    current_period_end = Column(DateTime, nullable=True)
    minutes_used = Column(Integer, nullable=False, default=0)
    extra_minutes_balance = Column(Integer, nullable=False, default=0)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UsageLog(Base):
    __tablename__ = "usage_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, default="default")
    transcription_id = Column(String, ForeignKey("transcriptions.id"), nullable=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True)
    audio_duration_seconds = Column(Float, nullable=False, default=0.0)
    minutes_charged = Column(Integer, nullable=False, default=0)
    minute_source = Column(String, nullable=False, default="plan")  # plan, extra, oneshot, free
    source_type = Column(String, nullable=False, default="file")  # file, recording, dictation
    profile_used = Column(String, nullable=True)
    whisper_model = Column(String, nullable=True)
    processing_time_seconds = Column(Float, nullable=True)
    language = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class OneshotOrder(Base):
    __tablename__ = "oneshot_orders"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, default="default")
    tier = Column(String, nullable=False)  # Court, Standard, Long
    price_cents = Column(Integer, nullable=False)
    audio_duration_seconds = Column(Float, nullable=True)
    payment_status = Column(String, nullable=False, default="pending")  # pending, paid, failed
    stripe_session_id = Column(String, nullable=True)
    transcription_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class BillingEvent(Base):
    __tablename__ = "billing_events"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, default="default")
    event_type = Column(String, nullable=False)  # checkout.completed, plan.changed, pack.purchased, webhook.received
    stripe_event_id = Column(String, nullable=True, unique=True)  # idempotency key
    stripe_session_id = Column(String, nullable=True)
    amount_cents = Column(Integer, nullable=True)
    event_data = Column(JSON, nullable=True)
    status = Column(String, nullable=False, default="success")  # success, failed, duplicate
    created_at = Column(DateTime, server_default=func.now())


class DictationSession(Base):
    __tablename__ = "dictation_sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, nullable=False, default="active")  # active, paused, completed
    profile = Column(String, nullable=False, default="generic")
    language = Column(String, nullable=True)
    current_text = Column(Text, nullable=False, default="")
    chunk_count = Column(Integer, nullable=False, default=0)
    total_duration = Column(Float, nullable=False, default=0.0)
    transcription_id = Column(String, nullable=True)  # set when saved as Transcription
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ── v7.1 Models (Simple mode / Anonymous sessions) ─────

class AnonymousSession(Base):
    __tablename__ = "anonymous_sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    cookie_token = Column(String, nullable=False, unique=True, index=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    oneshot_count = Column(Integer, nullable=False, default=0)
    last_job_id = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

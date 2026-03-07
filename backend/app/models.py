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
    translations = relationship("TranslationCache", back_populates="transcription", cascade="all, delete-orphan")


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

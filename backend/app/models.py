import uuid
from sqlalchemy import Column, String, Float, Text, ForeignKey, JSON, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, nullable=False, default="pending")
    file_path = Column(String, nullable=False)
    transcription_id = Column(String, nullable=True)
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
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    analyses = relationship("Analysis", back_populates="transcription", cascade="all, delete-orphan")


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

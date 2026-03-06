from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class JobOut(BaseModel):
    id: str
    status: str
    file_path: str
    transcription_id: Optional[str] = None
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

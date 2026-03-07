from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class JobOut(BaseModel):
    id: str
    status: str
    file_path: str
    transcription_id: Optional[str] = None
    profile: str = "generic"
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
    analyses: List[ProfileAnalysis]
    exports: List[str]
    default_templates: list = []

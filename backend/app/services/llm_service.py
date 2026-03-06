import json
import logging
import os
import ollama as ollama_client
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Transcription, Analysis

logger = logging.getLogger(__name__)

_OLLAMA_HOST_ENV = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
# OLLAMA_HOST may be set to 0.0.0.0 for Docker — always use 127.0.0.1 for local access
OLLAMA_HOST = _OLLAMA_HOST_ENV.replace("0.0.0.0", "127.0.0.1")
if not OLLAMA_HOST.startswith("http"):
    OLLAMA_HOST = f"http://{OLLAMA_HOST}"
_ollama = ollama_client.Client(host=OLLAMA_HOST)

ANALYSIS_TYPES = [
    "summary", "keypoints", "actions", "flashcards",
    "quiz", "mindmap", "slides", "infographic", "tables"
]

PROMPTS = {
    "summary": "Produce a structured summary of this transcript with: title, introduction, main points, and conclusion. Return valid JSON: {\"title\": \"...\", \"introduction\": \"...\", \"points\": [\"...\"], \"conclusion\": \"...\"}",
    "keypoints": "Extract the key points from this transcript as thematic bullet points. Return valid JSON: {\"keypoints\": [{\"theme\": \"...\", \"points\": [\"...\"]}]}",
    "actions": "Extract action items, decisions taken, and open questions from this transcript. Return valid JSON: {\"actions\": [\"...\"], \"decisions\": [\"...\"], \"questions\": [\"...\"]}",
    "flashcards": "Create revision flashcards (question/answer pairs) from this transcript. Return valid JSON: {\"cards\": [{\"question\": \"...\", \"answer\": \"...\"}]}",
    "quiz": "Create a multiple-choice quiz (4-5 questions) from this transcript. Each choice must be a full text answer, not just a letter. Return valid JSON: {\"questions\": [{\"question\": \"What is...?\", \"choices\": [\"The actual answer text A\", \"The actual answer text B\", \"The actual answer text C\", \"The actual answer text D\"], \"answer\": \"A\", \"explanation\": \"Because...\"}]}",
    "mindmap": "Create a hierarchical mindmap of this transcript in Markmap-compatible markdown. Return valid JSON: {\"markdown\": \"# Topic\\n## Subtopic\\n- Point\"}",
    "slides": "Create a slide presentation from this transcript. Return valid JSON: {\"slides\": [{\"title\": \"...\", \"bullets\": [\"...\"]}]}",
    "infographic": "Extract data points for a Vega-Lite chart from this transcript. Return valid JSON: {\"description\": \"...\", \"spec\": {}}",
    "tables": "Extract structured data tables from this transcript. Return valid JSON: {\"tables\": [{\"title\": \"...\", \"headers\": [\"...\"], \"rows\": [[\"...\"]]}]}",
}

OLLAMA_MODEL = "mistral-nemo:latest"


def _call_ollama(prompt: str, transcript_text: str) -> dict:
    """Call Ollama and try to parse JSON from response."""
    try:
        response = _ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": "You are an analysis assistant. Always respond with valid JSON only, no extra text."},
                {"role": "user", "content": f"{prompt}\n\nTranscript:\n{transcript_text[:8000]}"},
            ],
        )
        text = response["message"]["content"]
        # Try to parse JSON from response
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON in the response
            import re
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return {"raw": text}
    except Exception as e:
        logger.error(f"Ollama call failed: {e}")
        return {"error": str(e)}


async def generate_analyses(transcription_id: str, db: AsyncSession):
    """Generate all 9 analyses for a transcription."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return

    for analysis_type in ANALYSIS_TYPES:
        prompt = PROMPTS.get(analysis_type, f"Analyze this transcript for: {analysis_type}")
        logger.info(f"Generating {analysis_type} for {transcription_id}...")
        content = _call_ollama(prompt, transcription.text)
        analysis = Analysis(
            transcription_id=transcription_id,
            type=analysis_type,
            content=content,
        )
        db.add(analysis)

    await db.commit()
    logger.info(f"All 9 analyses generated for {transcription_id}")


async def regenerate_analysis(transcription_id: str, analysis_type: str, db: AsyncSession, instructions: str = None):
    """Regenerate a single analysis, optionally with custom instructions."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    transcription = result.scalar_one_or_none()
    if not transcription:
        return None

    prompt = PROMPTS.get(analysis_type, f"Analyze this transcript for: {analysis_type}")
    if instructions:
        prompt += f"\n\nAdditional instructions: {instructions}"

    content = _call_ollama(prompt, transcription.text)

    # Update or create
    result = await db.execute(
        select(Analysis).where(
            Analysis.transcription_id == transcription_id,
            Analysis.type == analysis_type
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.content = content
        existing.instructions = instructions
    else:
        analysis = Analysis(
            transcription_id=transcription_id,
            type=analysis_type,
            content=content,
            instructions=instructions,
        )
        db.add(analysis)

    await db.commit()
    return content

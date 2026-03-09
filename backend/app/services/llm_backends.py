"""LLM backend abstraction layer.

Provides a unified interface for LLM analysis backends.
Default: llm_open_source (Ollama local).
Premium backends are stubs — implement when API keys are available.

Usage:
    result = await analyze_transcript_via_backend(
        prompt, transcript_text, backend_id="llm_open_source"
    )
"""
import asyncio
import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_config_cache = None

# Configurable OpenAI model
_current_openai_model = os.environ.get("OPENAI_LLM_MODEL", "gpt-4.1")

VALID_OPENAI_MODELS = [
    {"name": "gpt-4.1", "description": "Dernier modele, meilleur rapport qualite/prix", "context": "1M tokens"},
    {"name": "gpt-4.1-mini", "description": "Rapide et economique", "context": "1M tokens"},
    {"name": "gpt-4.1-nano", "description": "Ultra economique, taches simples", "context": "1M tokens"},
    {"name": "gpt-4o", "description": "Multimodal, tres performant", "context": "128K tokens"},
    {"name": "gpt-4o-mini", "description": "Version legere de GPT-4o", "context": "128K tokens"},
    {"name": "o3-mini", "description": "Raisonnement avance, economique", "context": "200K tokens"},
]

VALID_OPENAI_MODEL_NAMES = [m["name"] for m in VALID_OPENAI_MODELS]


def get_openai_model() -> str:
    return _current_openai_model


def set_openai_model(model: str):
    global _current_openai_model
    _current_openai_model = model
    logger.info(f"OpenAI LLM model changed to '{model}'")


def _load_config() -> dict:
    global _config_cache
    if _config_cache is None:
        config_path = os.path.join(os.path.dirname(__file__), "..", "..", "config", "audio_backends.json")
        with open(config_path) as f:
            _config_cache = json.load(f)
    return _config_cache


def get_llm_backends() -> dict:
    """Return all registered LLM backends with availability status."""
    config = _load_config()
    result = {}
    for backend_id, info in config.get("llm_backends", {}).items():
        env_key = info.get("env_key")
        available = True
        if env_key:
            available = bool(os.environ.get(env_key))
        result[backend_id] = {**info, "available": available, "id": backend_id}
    return result


def resolve_llm_backend(mode_id: str, override: Optional[str] = None) -> str:
    """Resolve which LLM backend to use for a given mode.

    Args:
        mode_id: One of file_upload, recording, live_dictation.
        override: Optional backend_id override (dev/admin).

    Returns:
        backend_id to use, with fallback to llm_open_source if override unavailable.
    """
    config = _load_config()

    if override:
        backends = config.get("llm_backends", {})
        if override in backends:
            env_key = backends[override].get("env_key")
            if env_key and not os.environ.get(env_key):
                logger.warning(
                    f"LLM override '{override}' requested but {env_key} not set — "
                    f"falling back to llm_open_source"
                )
                return "llm_open_source"
            return override
        logger.warning(f"Unknown LLM backend '{override}', falling back to config default")

    modes = config.get("modes", {})
    mode_config = modes.get(mode_id, {})
    return mode_config.get("llm_backend", "llm_open_source")


# ── Backend implementations ──────────────────────────────


def _llm_open_source(prompt: str, transcript_text: str) -> dict:
    """Local Ollama LLM."""
    from app.services.llm_service import _call_ollama
    return _call_ollama(prompt, transcript_text)


def _llm_openai(prompt: str, transcript_text: str) -> dict:
    """OpenAI GPT API."""
    from openai import OpenAI
    import re

    client = OpenAI(api_key=os.environ["OPENAI_LLM_API_KEY"])

    response = client.chat.completions.create(
        model=_current_openai_model,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": transcript_text},
        ],
        temperature=0.3,
        max_tokens=4096,
    )

    import html as _html
    raw = _html.unescape(response.choices[0].message.content or "")

    # Try to parse JSON from the response
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try extracting JSON from markdown code blocks
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                pass
        # Return as plain text wrapper
        return {"content": raw}


def _llm_anthropic(prompt: str, transcript_text: str) -> dict:
    """Anthropic Claude API — stub."""
    raise NotImplementedError(
        "llm_anthropic: Anthropic Claude API not yet implemented. "
        "Set ANTHROPIC_API_KEY and implement in llm_backends.py"
    )


_LLM_DISPATCH = {
    "llm_open_source": _llm_open_source,
    "llm_openai": _llm_openai,
    "llm_anthropic": _llm_anthropic,
}


# ── Public API ───────────────────────────────────────────


async def analyze_transcript_via_backend(
    prompt: str,
    transcript_text: str,
    backend_id: str = "llm_open_source",
) -> dict:
    """Run LLM analysis through the specified backend.

    Args:
        prompt: Analysis prompt.
        transcript_text: Transcript text to analyze.
        backend_id: LLM backend to use.

    Returns:
        Parsed JSON dict from the LLM.
    """
    handler = _LLM_DISPATCH.get(backend_id)
    if not handler:
        logger.error(f"Unknown LLM backend '{backend_id}', falling back to open-source")
        handler = _llm_open_source

    logger.info(f"LLM backend: {backend_id} | prompt: {prompt[:60]}...")

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, handler, prompt, transcript_text)

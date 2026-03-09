# Audio Backends — STT & LLM

## Architecture

VoiceIQ utilise une couche d'abstraction pour le STT (speech-to-text) et le LLM (analyse), permettant de basculer entre backends open-source et premium sans modifier le code applicatif.

```
Upload/Recording/Dictation
    │
    ├─► stt_backends.py ──► resolve_stt_backend(mode_id, override?)
    │       │
    │       ├── stt_open_source (faster-whisper local) ← DEFAUT
    │       ├── stt_whisper_api (OpenAI Whisper API)    ← stub
    │       ├── stt_deepgram_api (Deepgram Nova-2)      ← stub
    │       └── stt_google_api (Google STT)             ← stub
    │
    └─► llm_backends.py ──► resolve_llm_backend(mode_id, override?)
            │
            ├── llm_open_source (Ollama local)          ← DEFAUT
            ├── llm_openai (OpenAI GPT)                 ← stub
            └── llm_anthropic (Anthropic Claude)        ← stub
```

## Backends disponibles

### STT (Transcription)

| ID | Nom | Status | Env var requise |
|----|-----|--------|-----------------|
| `stt_open_source` | Whisper local (faster-whisper) | Actif | — |
| `stt_whisper_api` | OpenAI Whisper API | Stub | `OPENAI_API_KEY` |
| `stt_deepgram_api` | Deepgram Nova-2 | Stub | `DEEPGRAM_API_KEY` |
| `stt_google_api` | Google Speech-to-Text | Stub | `GOOGLE_APPLICATION_CREDENTIALS` |

### LLM (Analyses)

| ID | Nom | Status | Env var requise |
|----|-----|--------|-----------------|
| `llm_open_source` | Ollama local | Actif | — |
| `llm_openai` | OpenAI GPT-4o/5 | Stub | `OPENAI_API_KEY` |
| `llm_anthropic` | Anthropic Claude | Stub | `ANTHROPIC_API_KEY` |

## Configuration par mode d'entree

Fichier : `backend/config/audio_backends.json`

```json
{
  "modes": {
    "file_upload": {
      "stt_backend": "stt_open_source",
      "llm_backend": "llm_open_source"
    },
    "recording": {
      "stt_backend": "stt_open_source",
      "llm_backend": "llm_open_source"
    },
    "live_dictation": {
      "stt_backend": "stt_open_source",
      "llm_backend": "llm_open_source"
    }
  }
}
```

Pour changer le backend d'un mode, modifier la valeur dans le JSON. Le changement est pris en compte au prochain redemarrage du backend.

## Override pour test (dev/admin)

### Via l'API

```bash
# Voir les backends disponibles
curl http://localhost:8002/api/backends

# Changer le backend d'un mode (en memoire, reset au redemarrage)
curl -X PUT http://localhost:8002/api/backends/mode/file_upload \
  -H 'Content-Type: application/json' \
  -d '{"stt_backend": "stt_whisper_api", "llm_backend": "llm_openai"}'
```

### Via l'upload (par requete)

Les endpoints `/api/upload` et `/api/upload/batch` acceptent des parametres optionnels `stt_backend` et `llm_backend` dans le FormData :

```bash
curl -X POST http://localhost:8002/api/upload \
  -F "file=@reunion.mp3" \
  -F "profile=business" \
  -F "stt_backend=stt_whisper_api" \
  -F "llm_backend=llm_openai"
```

### Via le frontend (mode dev)

En mode dev (`npm run dev`), un panneau "Backend" apparait sur les pages Upload et One-shot. Il permet de :
- Voir le backend actif (STT + LLM)
- Changer de backend via un dropdown
- Les backends non configures (cle API manquante) sont marques "non configure"

Ce panneau est invisible en production.

## Fallback

Si un backend premium est demande mais que la cle API n'est pas configuree :
1. Un warning est logge dans la console backend
2. Le fallback se fait automatiquement sur le backend open-source
3. La transcription/analyse continue normalement

## Ajouter un nouveau backend

### 1. Declarer dans la config

Ajouter une entree dans `backend/config/audio_backends.json` :

```json
"stt_backends": {
  "stt_my_new_api": {
    "name": "My New STT API",
    "provider": "my_provider",
    "description": "...",
    "env_key": "MY_API_KEY"
  }
}
```

### 2. Implementer le handler

Dans `backend/app/services/stt_backends.py` (ou `llm_backends.py`) :

```python
def _stt_my_new_api(file_path, vad_params=None, language=None, model_hint=None):
    import my_stt_sdk
    client = my_stt_sdk.Client(api_key=os.environ["MY_API_KEY"])
    result = client.transcribe(file_path, language=language)
    segments = [{"start": s.start, "end": s.end, "text": s.text} for s in result.segments]
    return segments, result.full_text, result.info

# Ajouter au dispatch
_STT_DISPATCH["stt_my_new_api"] = _stt_my_new_api
```

### 3. Tester

```bash
# Definir la cle API
export MY_API_KEY=...

# Tester via curl
curl -X POST http://localhost:8002/api/upload \
  -F "file=@test.mp3" \
  -F "stt_backend=stt_my_new_api"
```

## Fichiers

| Fichier | Role |
|---------|------|
| `backend/config/audio_backends.json` | Config backends et modes |
| `backend/app/services/stt_backends.py` | Abstraction STT + dispatch |
| `backend/app/services/llm_backends.py` | Abstraction LLM + dispatch |
| `frontend/src/components/BackendSelector.tsx` | Selecteur dev UI |

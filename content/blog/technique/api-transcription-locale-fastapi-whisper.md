---
title: "API de Transcription Locale avec FastAPI et Whisper"
slug: "api-transcription-locale-fastapi-whisper"
description: "Construisez votre propre API de transcription locale avec FastAPI et faster-whisper. Code complet, configuration GPU et déploiement Docker."
canonical: "https://clearrecap.com/blog/api-transcription-locale-fastapi-whisper"
ogTitle: "Construire une API de transcription locale : FastAPI + Whisper"
ogDescription: "Code complet pour créer une API de transcription audio locale avec FastAPI et faster-whisper. GPU, Docker, production-ready."
ogImage: "https://clearrecap.com/blog/images/api-transcription-locale-fastapi-whisper-og.png"
category: "technique"
tags: ["fastapi", "whisper", "api transcription", "python", "gpu"]
author: "Ilia Moui — CEO & Fondateur, ClearRecap"
authorUrl: "https://clearrecap.com/auteur/fondateur-clearrecap"
date: "2026-03-11"
lastModified: "2026-03-11"
readingTime: "18 min"
profile: "generique"
targetKeyword: "api transcription locale whisper"
secondaryKeywords: ["fastapi whisper", "transcription api python", "whisper api locale"]
searchIntent: "transactionnel"
funnel: "bofu"
publishDate: "2026-05-17T09:27:00"
status: "draft"
---

<!-- JSON-LD Schema -->
<!--
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "API de Transcription Locale avec FastAPI et Whisper",
  "description": "Construisez votre propre API de transcription locale avec FastAPI et faster-whisper. Code complet, configuration GPU et déploiement Docker.",
  "author": {
    "@type": "Person",
    "name": "Ilia Moui",
    "jobTitle": "CEO & Fondateur",
    "url": "https://clearrecap.com/auteur/fondateur-clearrecap",
    "worksFor": {
      "@type": "Organization",
      "name": "ClearRecap",
      "url": "https://clearrecap.com"
    }
  },
  "publisher": {
    "@type": "Organization",
    "name": "ClearRecap",
    "url": "https://clearrecap.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://clearrecap.com/logo.png"
    }
  },
  "datePublished": "2026-05-17",
  "dateModified": "2026-03-11",
  "mainEntityOfPage": "https://clearrecap.com/blog/api-transcription-locale-fastapi-whisper",
  "image": "https://clearrecap.com/blog/images/api-transcription-locale-fastapi-whisper-og.png",
  "keywords": ["fastapi", "whisper", "api transcription", "python", "gpu"],
  "proficiencyLevel": "Expert"
}
</script>
-->

# API de Transcription Locale avec FastAPI et Whisper

Construire une API de transcription locale, ça commence avec quelques dizaines de lignes de Python. Un endpoint `/transcribe`. Un modèle Whisper tiny. Le résultat est médiocre — mais l'audio ne quitte jamais la machine. C'est le point de départ.

Le moteur de transcription de [ClearRecap](https://clearrecap.com) repose sur cette architecture FastAPI + faster-whisper, capable de traiter des fichiers d'une heure en moins de quatre minutes sur GPU. Le code partagé dans cet article reprend ces fondations, dépouillées du spécifique métier, prêtes à être déployées.

Vous allez construire une API de transcription locale complète : upload audio, transcription via faster-whisper, réponse JSON structurée avec timestamps, le tout conteneurisé dans Docker avec support GPU. Pas de cloud. Pas de clé API externe. Pas de données qui s'échappent.

## Prérequis et choix techniques

Avant d'écrire la moindre ligne, parlons des choix et de leurs raisons.

### Pourquoi faster-whisper et pas openai-whisper ?

Le package `openai-whisper` original utilise PyTorch pour l'inférence. `faster-whisper` utilise CTranslate2, une bibliothèque d'inférence optimisée qui convertit les modèles Transformer dans un format quantifié plus compact. Les gains sont massifs :

- Vitesse d'inférence : 4x à 8x plus rapide selon le modèle et le hardware
- Consommation VRAM : 2x à 3x inférieure (le modèle large-v3 tourne dans 4 Go de VRAM au lieu de 10 Go)
- Précision : identique — c'est le même modèle, juste un runtime d'exécution différent

Pour des [benchmarks détaillés](/blog/faster-whisper-gpu-benchmark-2026), j'ai publié un article dédié avec des mesures sur différentes configurations GPU.

### Pourquoi FastAPI ?

Flask aurait fonctionné. Django serait excessif. FastAPI frappe au bon endroit pour une API de transcription :

- Support natif de l'asynchrone (crucial pour ne pas bloquer le serveur pendant l'inférence)
- Validation automatique des requêtes avec Pydantic
- Documentation OpenAPI générée sans effort
- Performance brute supérieure à Flask sur les I/O concurrents

### Environnement requis

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| Python | 3.10 | 3.11 ou 3.12 |
| RAM | 8 Go | 16 Go |
| GPU | Optionnel (CPU fonctionne) | NVIDIA avec 6+ Go VRAM |
| CUDA | 11.8 (si GPU) | 12.1+ |
| Stockage | 5 Go (modèle medium) | 10 Go (modèle large-v3) |
| OS | Linux, Windows, macOS | Linux (meilleur support CUDA Docker) |

## Structure du projet

Commençons par l'arborescence. Rien de superflu.

```
whisper-api/
├── app/
│   ├── __init__.py
│   ├── main.py           # Point d'entrée FastAPI
│   ├── transcriber.py    # Logique de transcription
│   ├── models.py         # Schémas Pydantic
│   └── config.py         # Configuration
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## Le code, étape par étape

### Configuration — `app/config.py`

La configuration centralise les paramètres ajustables sans toucher au code. Un piège classique : coder en dur le nom du modèle Whisper dans plusieurs fichiers. Changer de modèle exige alors de modifier chaque fichier et de reconstruire l'image Docker. La centralisation évite cette erreur.

```python
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # Modèle Whisper
    model_size: str = "medium"
    device: Literal["auto", "cpu", "cuda"] = "auto"
    compute_type: Literal["int8", "float16", "float32"] = "float16"

    # Limites
    max_file_size_mb: int = 500
    max_concurrent_tasks: int = 2

    # Serveur
    host: str = "0.0.0.0"
    port: int = 8787

    # Chemins
    upload_dir: str = "/tmp/whisper-uploads"
    model_cache_dir: str = "/app/models"

    class Config:
        env_prefix = "WHISPER_"
        env_file = ".env"


settings = Settings()
```

Le `compute_type` mérite une explication. `float16` offre le meilleur compromis vitesse/précision sur GPU. `int8` réduit encore la consommation VRAM de 30-40% avec une perte de qualité quasi imperceptible — je l'utilise quand je dois faire tourner le modèle large-v3 sur une carte avec seulement 6 Go de VRAM. `float32` ne sert que sur CPU (les GPU supportent tous le float16).

### Schémas de données — `app/models.py`

```python
from pydantic import BaseModel, Field
from typing import Optional


class TranscriptionSegment(BaseModel):
    id: int
    start: float = Field(description="Début du segment en secondes")
    end: float = Field(description="Fin du segment en secondes")
    text: str
    avg_logprob: float = Field(description="Log-probabilité moyenne du segment")
    no_speech_prob: float = Field(description="Probabilité de non-parole")


class TranscriptionResponse(BaseModel):
    text: str = Field(description="Transcription complète")
    segments: list[TranscriptionSegment]
    language: str
    language_probability: float
    duration: float = Field(description="Durée du fichier audio en secondes")
    processing_time: float = Field(description="Temps de traitement en secondes")
    model: str
    device: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
```

Les champs `avg_logprob` et `no_speech_prob` ne sont pas décoratifs. Ils permettent au client de filtrer les segments de faible confiance. Chez ClearRecap, tout segment avec un `avg_logprob < -1.0` déclenche un marquage visuel "à vérifier" dans l'interface. Ce seuil attrape la majorité des passages bruités ou des mots mal reconnus.

### Le moteur de transcription — `app/transcriber.py`

C'est le coeur du système. La classe charge le modèle une seule fois au démarrage et le réutilise pour chaque requête.

```python
import time
import os
import logging
from faster_whisper import WhisperModel
from app.config import settings
from app.models import TranscriptionSegment, TranscriptionResponse

logger = logging.getLogger(__name__)


class Transcriber:
    def __init__(self):
        self._model = None
        self._device = None

    def load_model(self):
        """Charge le modèle au démarrage. Opération lente (~10-30s)."""
        device = settings.device
        if device == "auto":
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"

        compute = settings.compute_type
        if device == "cpu" and compute == "float16":
            compute = "int8"  # float16 non supporté sur CPU
            logger.warning("CPU détecté, fallback compute_type vers int8")

        logger.info(
            f"Chargement du modèle {settings.model_size} "
            f"sur {device} ({compute})..."
        )
        start = time.monotonic()

        self._model = WhisperModel(
            settings.model_size,
            device=device,
            compute_type=compute,
            download_root=settings.model_cache_dir,
            cpu_threads=os.cpu_count() if device == "cpu" else 4,
        )
        self._device = device

        elapsed = time.monotonic() - start
        logger.info(f"Modèle chargé en {elapsed:.1f}s")

    @property
    def device(self) -> str:
        return self._device or "unknown"

    def transcribe(
        self,
        audio_path: str,
        language: str | None = None,
        task: str = "transcribe",
        beam_size: int = 5,
        vad_filter: bool = True,
    ) -> TranscriptionResponse:
        if self._model is None:
            raise RuntimeError("Modèle non chargé. Appelez load_model() d'abord.")

        start = time.monotonic()

        segments_gen, info = self._model.transcribe(
            audio_path,
            language=language,
            task=task,
            beam_size=beam_size,
            vad_filter=vad_filter,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=200,
            ),
        )

        segments = []
        full_text_parts = []

        for seg in segments_gen:
            segments.append(
                TranscriptionSegment(
                    id=seg.id,
                    start=round(seg.start, 3),
                    end=round(seg.end, 3),
                    text=seg.text.strip(),
                    avg_logprob=round(seg.avg_logprob, 4),
                    no_speech_prob=round(seg.no_speech_prob, 4),
                )
            )
            full_text_parts.append(seg.text.strip())

        elapsed = time.monotonic() - start

        return TranscriptionResponse(
            text=" ".join(full_text_parts),
            segments=segments,
            language=info.language,
            language_probability=round(info.language_probability, 4),
            duration=round(info.duration, 2),
            processing_time=round(elapsed, 2),
            model=settings.model_size,
            device=self._device,
        )


# Singleton
transcriber = Transcriber()
```

Quelques choix qui méritent justification.

**Le VAD filter.** `vad_filter=True` active le filtre Voice Activity Detection de Silero, intégré dans faster-whisper. Ce filtre découpe l'audio en segments de parole avant de les envoyer au modèle Whisper. Le gain est double : les silences et bruits de fond ne sont pas transcrits (moins d'hallucinations), et le traitement est plus rapide parce que seules les portions contenant de la parole sont traitées. Sur un enregistrement de réunion d'une heure avec 15 minutes de silence cumulé, le VAD filter réduit le temps de traitement de 20-25%.

**Le `beam_size=5`.** C'est la valeur par défaut de Whisper. Monter à 10 améliore marginalement la précision sur les passages ambigus mais double le temps d'inférence. Descendre à 1 (greedy search) accélère le traitement de 40% mais introduit des erreurs sur les mots rares. Sur des corpus de français varié, le beam_size=5 reste le sweet spot.

**Le singleton.** Le modèle Whisper consomme entre 1 et 6 Go de VRAM selon la taille choisie. Le charger à chaque requête serait catastrophique. Le pattern singleton garantit un seul chargement au démarrage du serveur.

### L'API FastAPI — `app/main.py`

```python
import os
import uuid
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from app.config import settings
from app.models import TranscriptionResponse, ErrorResponse
from app.transcriber import transcriber

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sémaphore pour limiter les transcriptions concurrentes
semaphore = asyncio.Semaphore(settings.max_concurrent_tasks)

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".webm", ".mp4"}
MAX_SIZE_BYTES = settings.max_file_size_mb * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Charge le modèle au démarrage, nettoie à l'arrêt."""
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.model_cache_dir, exist_ok=True)
    transcriber.load_model()
    logger.info(f"API prête sur {settings.host}:{settings.port}")
    yield
    logger.info("Arrêt du serveur")


app = FastAPI(
    title="API Transcription Locale",
    description="Transcription audio via faster-whisper, 100% locale",
    version="1.0.0",
    lifespan=lifespan,
)


@app.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    responses={
        400: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def transcribe_audio(
    file: UploadFile = File(..., description="Fichier audio à transcrire"),
    language: str | None = Form(
        default=None,
        description="Code langue ISO 639-1 (ex: fr, en). Auto-détecté si omis.",
    ),
    task: str = Form(
        default="transcribe",
        description="'transcribe' ou 'translate' (traduit vers l'anglais)",
    ),
    beam_size: int = Form(default=5, ge=1, le=10),
    vad_filter: bool = Form(default=True),
):
    # Validation extension
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté: {ext}. "
            f"Formats acceptés: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Sauvegarde temporaire du fichier uploadé
    file_id = uuid.uuid4().hex[:12]
    temp_path = os.path.join(settings.upload_dir, f"{file_id}{ext}")

    try:
        # Lecture avec vérification taille
        content = await file.read()
        if len(content) > MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Fichier trop volumineux ({len(content) / 1024 / 1024:.1f} Mo). "
                f"Limite: {settings.max_file_size_mb} Mo.",
            )

        with open(temp_path, "wb") as f:
            f.write(content)

        # Acquisition du sémaphore (limite la concurrence GPU)
        try:
            await asyncio.wait_for(semaphore.acquire(), timeout=30.0)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=503,
                detail="Serveur surchargé. Réessayez dans quelques secondes.",
            )

        try:
            # Exécution dans un thread pool pour ne pas bloquer l'event loop
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: transcriber.transcribe(
                    audio_path=temp_path,
                    language=language,
                    task=task,
                    beam_size=beam_size,
                    vad_filter=vad_filter,
                ),
            )
            return result
        finally:
            semaphore.release()

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erreur lors de la transcription")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Nettoyage systématique du fichier temporaire
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": settings.model_size,
        "device": transcriber.device,
    }


@app.get("/models")
async def available_models():
    return {
        "current": settings.model_size,
        "available": [
            "tiny", "base", "small", "medium",
            "large-v1", "large-v2", "large-v3",
        ],
        "note": "Changer de modèle nécessite un redémarrage du serveur.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
```

Plusieurs points méritent attention.

**Le sémaphore.** Un GPU ne peut traiter qu'une inférence à la fois efficacement (la parallélisation de batch sur Whisper est limitée). Le sémaphore à 2 autorise au maximum deux transcriptions simultanées — une sur GPU, une en attente immédiate. Au-delà, les requêtes reçoivent un HTTP 503 plutôt que de s'empiler et de consommer de la mémoire.

Sans sémaphore, un utilisateur qui envoie 15 fichiers en parallèle via un script peut provoquer un crash OOM — le système tente de charger toutes les inférences simultanément et le processus est tué. Le sémaphore empêche ce scénario.

**Le `run_in_executor`.** L'inférence Whisper est une opération CPU/GPU-bound qui bloque le thread Python pendant toute sa durée. Sans `run_in_executor`, FastAPI ne pourrait pas répondre au endpoint `/health` pendant qu'une transcription tourne. Le thread pool délègue l'inférence à un thread secondaire et libère l'event loop asyncio.

**Le nettoyage du fichier temporaire.** Le `finally` garantit la suppression même en cas d'erreur. C'est un point de [conformité RGPD](/blog/transcription-audio-rgpd-guide-2026) souvent négligé : un fichier audio temporaire non supprimé reste une donnée personnelle stockée sans base légale.

## Les dépendances — `requirements.txt`

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
pydantic-settings==2.7.1
faster-whisper==1.1.0
torch==2.5.1
```

La version de `torch` est critique. Elle doit correspondre à votre version CUDA. Pour CUDA 12.1 :

```
--index-url https://download.pytorch.org/whl/cu121
torch==2.5.1
```

Pour un déploiement CPU-only, vous pouvez remplacer par :

```
--index-url https://download.pytorch.org/whl/cpu
torch==2.5.1
```

Le poids du package torch passe de 2.4 Go (CUDA) à 200 Mo (CPU-only). La différence compte si vous distribuez une image Docker.

## Conteneurisation Docker

### Le Dockerfile

```dockerfile
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Dépendances système pour le traitement audio
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3.11 /usr/bin/python

WORKDIR /app

# Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pré-téléchargement du modèle (optionnel mais recommandé)
# Décommentez pour intégrer le modèle dans l'image
# RUN python -c "from faster_whisper import WhisperModel; \
#     WhisperModel('medium', download_root='/app/models')"

COPY app/ app/

EXPOSE 8787

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8787"]
```

Le choix de `nvidia/cuda:12.1.1-cudnn8-runtime` comme image de base est délibéré. L'image `runtime` pèse 3.6 Go contre 8.5 Go pour l'image `devel`. On n'a pas besoin du compilateur CUDA pour l'inférence — CTranslate2 est déjà compilé dans le package faster-whisper.

### Docker Compose avec GPU

```yaml
services:
  whisper-api:
    build: .
    ports:
      - "8787:8787"
    volumes:
      - whisper-models:/app/models
      - whisper-uploads:/tmp/whisper-uploads
    environment:
      - WHISPER_MODEL_SIZE=medium
      - WHISPER_DEVICE=auto
      - WHISPER_COMPUTE_TYPE=float16
      - WHISPER_MAX_FILE_SIZE_MB=500
      - WHISPER_MAX_CONCURRENT_TASKS=2
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8787/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  whisper-models:
  whisper-uploads:
```

Le `start_period: 60s` du healthcheck est capital. Le chargement du modèle prend 10 à 40 secondes selon la taille et le type de stockage. Sans cette grâce initiale, Docker tue le conteneur avant que le modèle ne soit prêt.

Le volume `whisper-models` persiste le modèle téléchargé entre les redémarrages du conteneur. Premier lancement : faster-whisper télécharge le modèle (~1.5 Go pour medium, ~3 Go pour large-v3). Lancements suivants : le modèle est déjà là, démarrage en 10 secondes.

### Variante CPU-only

Pour un déploiement sans GPU, remplacez l'image de base :

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*
```

Et supprimez la section `deploy.resources` du docker-compose. Le `WHISPER_DEVICE` sera automatiquement réglé sur `cpu` et le `compute_type` basculera sur `int8`.

## Tester l'API

### Démarrage

```bash
docker compose up --build
```

Première exécution : comptez 5 à 10 minutes pour le build de l'image et le téléchargement du modèle. Les suivantes : 15 à 40 secondes.

### Requête de transcription

```bash
curl -X POST http://localhost:8787/transcribe \
  -F "file=@reunion-equipe.wav" \
  -F "language=fr" \
  -F "beam_size=5"
```

Réponse type :

```json
{
  "text": "Bonjour à tous, on commence la réunion de ce lundi matin...",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.42,
      "text": "Bonjour à tous, on commence la réunion de ce lundi matin.",
      "avg_logprob": -0.2341,
      "no_speech_prob": 0.0012
    }
  ],
  "language": "fr",
  "language_probability": 0.9987,
  "duration": 3612.5,
  "processing_time": 218.34,
  "model": "medium",
  "device": "cuda"
}
```

### Healthcheck

```bash
curl http://localhost:8787/health
```

```json
{"status": "ok", "model": "medium", "device": "cuda"}
```

### Client Python

Pour les intégrations programmatiques, un client minimal :

```python
import httpx

async def transcribe_file(file_path: str, language: str = "fr") -> dict:
    async with httpx.AsyncClient(timeout=600.0) as client:
        with open(file_path, "rb") as f:
            response = await client.post(
                "http://localhost:8787/transcribe",
                files={"file": (file_path, f)},
                data={"language": language},
            )
        response.raise_for_status()
        return response.json()
```

Le timeout de 600 secondes (10 minutes) n'est pas excessif. Un fichier d'une heure sur CPU avec le modèle medium prend 45 à 50 minutes. Sur GPU, 3 à 5 minutes. Calibrez selon votre matériel.

## Optimisations pour la production

Le code ci-dessus fonctionne. Mais entre "ça marche" et "ça tient la charge", il y a un fossé. Voici les optimisations clés pour un usage en production.

### Gestion de la file d'attente avec Redis

Pour un usage multi-utilisateurs, le sémaphore in-process ne suffit plus. Un worker Celery ou une file Redis permet de découpler la réception des fichiers du traitement.

```python
# worker.py — esquisse d'un worker avec Redis Queue
from rq import Queue
from redis import Redis
from app.transcriber import transcriber

redis_conn = Redis(host="localhost", port=6379)
queue = Queue("transcription", connection=redis_conn)

def process_transcription(audio_path: str, language: str = None):
    result = transcriber.transcribe(
        audio_path=audio_path,
        language=language,
    )
    return result.model_dump()
```

L'endpoint FastAPI pousse le job dans la queue et retourne immédiatement un `job_id`. Un second endpoint `/result/{job_id}` permet de récupérer le résultat. Ce pattern asynchrone est indispensable quand les fichiers dépassent 30 minutes — personne ne veut qu'une connexion HTTP reste ouverte pendant 10 minutes.

### Streaming des segments

Pour les fichiers longs, envoyer les segments au fur et à mesure plutôt qu'en bloc à la fin. FastAPI supporte les Server-Sent Events (SSE) :

```python
from fastapi.responses import StreamingResponse
import json

@app.post("/transcribe/stream")
async def transcribe_stream(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
):
    # ... validation et sauvegarde identiques ...

    async def generate():
        segments, info = transcriber._model.transcribe(
            temp_path,
            language=language,
            vad_filter=True,
        )
        for seg in segments:
            data = {
                "id": seg.id,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
            }
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

Chez ClearRecap, le streaming a réduit le "temps perçu" de transcription de 60%. L'utilisateur voit les premiers mots apparaitre en 2-3 secondes au lieu d'attendre la fin complète du traitement.

### Monitoring mémoire GPU

Le piège classique avec faster-whisper : la VRAM se fragmente après plusieurs heures d'utilisation intensive. Un monitoring basique permet de détecter ce problème :

```python
@app.get("/gpu-stats")
async def gpu_stats():
    try:
        import torch
        if torch.cuda.is_available():
            return {
                "gpu_name": torch.cuda.get_device_name(0),
                "vram_total_mb": round(torch.cuda.get_device_properties(0).total_mem / 1024**2),
                "vram_used_mb": round(torch.cuda.memory_allocated(0) / 1024**2),
                "vram_cached_mb": round(torch.cuda.memory_reserved(0) / 1024**2),
            }
    except Exception:
        pass
    return {"gpu": "non disponible"}
```

Quand `vram_cached_mb` dépasse 90% de `vram_total_mb`, un redémarrage du conteneur libère proprement la mémoire. Un cron qui appelle l'endpoint toutes les 5 minutes et relance le conteneur si le seuil est franchi automatise cette surveillance.

## Sécurisation pour un réseau local

Cette API est conçue pour tourner en local. Mais "local" ne signifie pas "sans sécurité", surtout dans un contexte de [transcription médicale](/blog/transcription-medicale-note-soap-ia) ou [confidentielle](/blog/cloud-act-transcription-risque-donnees).

### Authentification par token

```python
from fastapi import Depends, Header

async def verify_token(x_api_key: str = Header(...)):
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Token invalide")

@app.post("/transcribe", dependencies=[Depends(verify_token)])
async def transcribe_audio(...):
    ...
```

Ajoutez `WHISPER_API_KEY=votre-token-secret` dans le `.env`. Simple, stateless, suffisant pour un réseau local.

### Isolation réseau Docker

```yaml
services:
  whisper-api:
    # ... config existante ...
    networks:
      - whisper-internal
    # N'exposer que sur localhost, pas sur 0.0.0.0
    ports:
      - "127.0.0.1:8787:8787"

networks:
  whisper-internal:
    driver: bridge
    internal: true
```

Le `127.0.0.1` dans le mapping de port empêche tout accès depuis d'autres machines du réseau. Combiné au réseau Docker `internal`, le conteneur n'a aucun accès internet sortant — pas de phone home possible, pas de télémétrie, pas de mise à jour automatique surprise.

## Performances réelles : mes mesures

Voici les chiffres mesurés sur une configuration de développement ClearRecap (RTX 5090 Laptop 24 Go VRAM, mais les ratios sont transposables à d'autres GPU) :

| Modèle | GPU float16 | GPU int8 | CPU int8 (12 threads) |
|--------|-------------|----------|----------------------|
| tiny | 0.02x | 0.02x | 0.15x |
| small | 0.05x | 0.04x | 0.45x |
| medium | 0.09x | 0.07x | 0.82x |
| large-v3 | 0.16x | 0.12x | 1.8x |

Le ratio représente le temps de traitement par rapport à la durée audio. 0.09x signifie que 60 minutes d'audio se transcrivent en 5 minutes 24 secondes. Les benchmarks GPU détaillés sont dans l'[article dédié](/blog/faster-whisper-gpu-benchmark-2026).

Le modèle `medium` en français atteint un WER (Word Error Rate) de 8-12% sur des enregistrements de qualité correcte (micro-cravate, salle calme). Le `large-v3` descend à 5-8%. Pour des enregistrements bruités (réunion en open space, visioconférence avec connexion médiocre), le WER grimpe à 15-25% quel que soit le modèle.

## Pièges courants

**Le format audio compte.** Un fichier WAV 16kHz mono produit les meilleurs résultats et le traitement le plus rapide. Un MP3 128kbps ajoute du bruit de compression que Whisper interprète parfois comme de la parole. faster-whisper utilise ffmpeg en interne pour décoder, mais la conversion ajoute 1-3 secondes par fichier. Préférez WAV ou FLAC en entrée.

**Les hallucinations sur le silence.** Whisper a une tendance connue à "halluciner" du texte sur les passages silencieux — générer des phrases qui n'existent pas dans l'audio. Le VAD filter règle 90% du problème. Pour les 10% restants, le champ `no_speech_prob` dans la réponse permet de filtrer côté client (seuil recommandé : 0.6).

**Le memory leak de CTranslate2 avant la version 4.5.** Les versions antérieures de CTranslate2 avaient un memory leak subtil : la VRAM n'était pas entièrement libérée entre les inférences. Sur un serveur qui tourne 24/7, la mémoire se remplissait en 48-72 heures. La version 4.5 (intégrée dans faster-whisper 1.1.0) a corrigé le problème.

## Prochaines étapes

Cette API couvre le cas de base : upload, transcription, réponse structurée. Pour aller plus loin :

- Ajout d'un endpoint de diarisation (identification des locuteurs) avec `pyannote-audio`
- Post-processing avec un LLM local pour la ponctuation et la mise en forme (c'est l'approche de ClearRecap pour les [notes SOAP médicales](/blog/transcription-medicale-note-soap-ia))
- Interface web frontend avec upload drag-and-drop et affichage temps réel des segments
- Batch processing pour les dossiers de fichiers audio

Le code de cet article est un point de départ fonctionnel. ClearRecap est construit sur ces mêmes fondations, avec des fonctionnalités métier ajoutées par-dessus. La beauté d'une API locale : chaque ajout reste sous votre contrôle. Pas de limite de rate, pas de coût par minute, pas de données qui traversent un océan.

Votre audio, votre machine, votre API. Le reste n'est que du code.

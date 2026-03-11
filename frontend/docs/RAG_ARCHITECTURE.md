# Architecture RAG Local ClearRecap — "Intelligence Collective"

## Vue d'ensemble

Le module RAG (Retrieval-Augmented Generation) local permettra aux utilisateurs de ClearRecap d'interroger l'ensemble de leurs transcriptions passées comme une base de connaissances. 100 % local, aucune donnée ne quitte l'infrastructure.

## Stack prévue

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| Embeddings | `sentence-transformers` (camembert-base ou all-MiniLM-L6-v2) | Vectorisation des chunks de transcription |
| Vector Store | ChromaDB (SQLite-backed) ou FAISS | Stockage et recherche vectorielle |
| LLM | Ollama (mistral-nemo / qwen2.5) | Génération de réponses contextualisées |
| Chunking | Segmentation par locuteur + timestamps | Découpage sémantique des transcriptions |

## Pipeline

### 1. Indexation (à chaque nouvelle transcription)

```
Transcription terminée
  → Chunking par segment (locuteur + timestamps)
  → Embedding via sentence-transformers
  → Stockage dans ChromaDB (collection par user_id)
  → Mise à jour du compteur d'indexation
```

### 2. Requête utilisateur

```
Question utilisateur
  → Embedding de la query
  → Recherche vectorielle top-k (k=5-10) dans la collection de l'utilisateur
  → Construction du prompt : contexte récupéré + question
  → Envoi au LLM local (Ollama)
  → Réponse avec citations (liens vers les segments sources)
```

### 3. Citations

Chaque réponse inclut :
- Les passages sources avec timestamps
- Liens cliquables vers le segment dans la transcription originale (`/app/transcription/:id#t=120`)
- Score de pertinence pour chaque source

## Contraintes

- **100 % local** : ChromaDB + sentence-transformers tournent en local sur le serveur
- **Isolation par utilisateur** : chaque user a sa propre collection ChromaDB
- **Performance** : < 3s pour une recherche sur 1000 transcriptions
- **Incrémental** : l'indexation se fait au fil de l'eau, pas de re-indexation globale
- **GPU partagé** : les embeddings utilisent le même GPU que faster-whisper (scheduling)

## API endpoints prévus

```
POST /api/knowledge/query
  Body: { question: string, top_k?: number }
  Response: { answer: string, sources: [{ transcription_id, segment, timestamp, score }] }

GET /api/knowledge/status
  Response: { indexed_count: number, total_chunks: number, last_indexed_at: string }

POST /api/knowledge/reindex
  Body: { transcription_id?: string }  // si vide, reindex tout
  Response: { status: "started", estimated_duration: number }
```

## Frontend (prévu)

- `src/components/KnowledgeBase/KnowledgeChat.tsx` : interface de chat
- Questions suggérées par catégorie métier
- Indicateur visuel des sources consultées
- Historique des conversations

## Dépendances Python à ajouter

```
chromadb>=0.4.0
sentence-transformers>=2.3.0
```

## Timeline

- v8.0 : MVP — indexation + recherche + interface chat basique
- v8.1 : Citations cliquables + historique de conversation
- v8.2 : Questions suggérées intelligentes + résumé de collection

# Audio-to-Knowledge — Setup & Run

## Prerequisites
- Python 3.12+
- Node.js 18+
- Ollama running locally (with mistral-nemo or qwen2.5 model pulled)
- faster-whisper (requires CUDA for GPU acceleration, or runs on CPU)

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create uploads directory
mkdir -p uploads

# Run the backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at http://localhost:8000
API docs at http://localhost:8000/docs

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will be available at http://localhost:5173

## Docker Compose (all-in-one)

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload | Upload audio file, returns job_id |
| GET | /api/jobs/{job_id} | Check job status |
| GET | /api/transcriptions | List all transcriptions (paginated) |
| GET | /api/transcriptions/{id} | Get full transcription |
| GET | /api/transcriptions/{id}/analyses | Get all 9 analyses |
| GET | /api/transcriptions/{id}/analyses/{type} | Get specific analysis |
| POST | /api/transcriptions/{id}/analyses/{type}/regenerate | Regenerate analysis |
| GET | /api/transcriptions/{id}/export/{format} | Export (pdf/srt/vtt/md/json/txt) |
| GET | /api/transcriptions/stats | Global statistics |
| DELETE | /api/transcriptions/{id} | Delete transcription |

## Quick Test

```bash
# Upload an audio file
curl -X POST http://localhost:8000/api/upload \
  -F "file=@test.mp3"

# Check job status (use job_id from upload response)
curl http://localhost:8000/api/jobs/{job_id}

# Get transcription
curl http://localhost:8000/api/transcriptions/{id}

# Get all analyses
curl http://localhost:8000/api/transcriptions/{id}/analyses
```

## Notes
- Whisper large-v3 requires ~6GB VRAM (GPU) or will fall back to CPU (slower)
- Ollama must be running before starting the backend
- SQLite database is stored in `backend/audio2k.db` by default
- Uploaded files go to `backend/uploads/`

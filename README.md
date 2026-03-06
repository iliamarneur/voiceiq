# Audio-to-Knowledge

Audio-to-Knowledge is a web application that transforms any audio file into structured content such as summaries, key points, quizzes, mind maps, slides, etc. The entire pipeline runs entirely locally, without sending any data outside.

## Features

- **Upload and Transcribe Audio**: Users can upload an audio file and receive a complete transcription with timestamps.
- **9 Automated LLM Analyses**: Automatically generate 9 structured analyses via Ollama after transcription.
- **Multi-Format Export**: Export each analysis or the entire transcription in multiple formats (PDF, PPTX).
- **Dashboard and History**: Manage all transcriptions with a list, search, filters, deletion, and statistics.

## Architecture

### Backend

- **Language**: Python 3.12
- **Framework**: FastAPI
- **Database**: SQLite (dev) / PostgreSQL (prod) via SQLAlchemy
- **ORM**: SQLAlchemy
- **Transcription**: Faster-Whisper (local execution of Whisper large-v3)
- **LLM**: Ollama (local model)
- **Scheduler**: Celery
- **Worker**: Celery
- **File Storage**: Local filesystem

### Frontend

- **Framework**: React 18
- **TypeScript**: Typing for better error management.
- **CSS Framework**: Tailwind CSS
- **State Management**: Redux Toolkit
- **API Client**: Axios
- **Build Tool**: Vite

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/audio-to-knowledge.git
   cd audio-to-knowledge
   ```

2. Build and start the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app/database.py
   uvicorn app.main:app --reload
   ```

3. Build and start the frontend:
   ```bash
   cd frontend
   npm install
   npm run start
   ```

4. Access the application at `http://localhost:3000`.
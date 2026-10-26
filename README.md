# Car Brochure RAG Assistant

A RAG-based AI assistant that helps users research and compare cars using
information from their official car brochure PDFs.

## Overview

The application allows users to upload or select car brochure PDFs and
ask questions about vehicle features, specifications, variants, pricing,
and other information available in the brochures.

The system retrieves relevant information from the selected brochures and
uses an LLM to generate grounded answers with source and page references.

## Key Capabilities

- Upload and process car brochure PDFs
- Ask questions about a specific car
- Compare information across multiple car brochures
- Retrieve relevant specifications and features
- Provide source and page references for answers
- Support conversational follow-up questions
## Project structure

```
backend/
  src/
    app/
      main.py       FastAPI app: routers, error handlers
      core/         settings (config.py) and error types
      routes/       HTTP endpoints, one file per URL prefix (+ deps.py)
      schemas/      request/response models, one file per router
      services/     business logic called by the routes
      db/           SQLAlchemy models and session
      rag/          PDF indexing and question answering
    alembic/        database migrations
    scripts/        one-off commands (init_db)
  evals/          offline evaluations of each pipeline component (see backend/evals/README.md)
  goldens/        hand-labelled gold data for the evals
  data/           brochure PDFs used by the evals (gitignored) + corpus.yaml
  .env            configuration (copy from .env.sample)
frontend/src/
  pages/          one component per route (ChatPage is the main app)
  components/     UI, grouped by screen area: auth, chat, sidebar, settings, common
  hooks/          state and data loading
  api/            backend calls: client.js + one file per resource
  utils/, constants/
docker-compose.yml  optional Qdrant server
```

New to the code? Read [ARCHITECTURE.md](ARCHITECTURE.md): how a request
flows through the layers, and where to put each kind of change.

## Running locally

Commands are for PowerShell on Windows. Use `python -m <tool>` rather than
`uvicorn`, `alembic` or `pip` directly: Windows Smart App Control blocks the
unsigned `.exe` launchers that pip puts in `.venv\Scripts\`.

### Prerequisites

- Python 3.14
- Node.js (for the frontend)
- A MySQL server
- A Gemini API key

Qdrant (the vector store) runs inside the backend process by default, so no
docker is needed.

### Backend

One-time setup, from the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r src\requirements.txt
Copy-Item .env.sample .env
```

Fill in `backend\.env`:

| Variable | Value |
|---|---|
| `GOOGLE_API_KEY` | your Gemini API key |
| `DATABASE_URL` | `mysql+aiomysql://USER:PASSWORD@localhost:3306/specsense` |
| `QDRANT_URL` | leave empty to run Qdrant in-process (data in `backend\.data\qdrant`); set to `http://localhost:6333` to use the docker compose server instead |

Create the database and tables (again after pulling new migrations):

```powershell
cd src
python -m scripts.init_db
python -m alembic upgrade head
```

Start the API, from `backend\src` with the venv active:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

Check http://localhost:8000/health; the API docs are at
http://localhost:8000/docs. Run a single process: with in-process Qdrant
only one process may open the data folder, so `--reload` is fine but
`--workers` is not.

### Frontend

In a second terminal, from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173 by default). In dev the UI
calls the API through Vite's `/api` proxy, which forwards to
`http://127.0.0.1:8000`; set `VITE_API_BASE_URL` in `frontend\.env` to point it
elsewhere.

To open the app on a phone or another device on the same Wi-Fi, run
`npm run dev -- --host` and open the Network URL Vite prints. The backend can
stay on localhost; the proxy reaches it from this machine.

### Qdrant server (optional)

To use a standalone Qdrant instead of the in-process one:

```powershell
docker compose up -d
```

and set `QDRANT_URL=http://localhost:6333` in `backend\.env`. Chunks indexed
in one store are not visible from the other, so re-upload brochures after
switching.

### Evals

See [backend/evals/README.md](backend/evals/README.md): setup, and how to run
the document loader, retrieval, generator and RAG Triad evals.

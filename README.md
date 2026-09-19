# SpecSense

Chat with car brochures. Upload PDFs, attach them to a chat, and ask about specs, features and variant comparisons. Answers come from a Retrieval-Augmented Generation (RAG) pipeline built with **FastAPI**, **LangChain**, **Qdrant** and **MySQL**, with a **React (Vite)** frontend.

- Chats and messages persist across refreshes and restarts.
- Uploaded PDFs go into a shared **library**. Each PDF is embedded once (deduplicated by content hash) and can be attached to any number of chats.
- Each chat has its own set of attached PDFs (up to 5) that are used as context.

There are no users or authentication yet: everyone shares the same chats and library. Run it locally or behind something that restricts access.

## Architecture

```
React (Vite) --> FastAPI --> MySQL    chats, documents, chat_documents, messages
                        \--> Qdrant   chunk vectors + payload (docker)
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- MySQL 8 (local install)
- Docker (for Qdrant)
- A Google AI API key (Gemini embeddings and chat model)

## Setup

### 1. Qdrant

```bash
docker compose up -d qdrant
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.sample .env             # then edit .env
```

Set these in `backend/.env`:

| Variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` | Gemini API key (required) |
| `DATABASE_URL` | e.g. `mysql+aiomysql://user:password@localhost:3306/auto_brochure_rag` |
| `QDRANT_URL` | defaults to `http://localhost:6333` |

Create the database and tables, then start the API:

```bash
python -m scripts.init_db       # creates the database if missing
alembic upgrade head            # creates/updates the tables
uvicorn app.main:app --reload   # http://127.0.0.1:8000
```

The Qdrant collection is created automatically on startup. Interactive API docs are at `/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

The frontend talks to `http://127.0.0.1:8000` by default. Set `VITE_API_BASE_URL` to change it.

## API

| Method | Path | Purpose |
|---|---|---|
| GET / POST | `/chats` | List / create chats |
| PATCH / DELETE | `/chats/{id}` | Rename / delete a chat (documents stay in the library) |
| GET / POST | `/chats/{id}/messages` | History / ask a question (saves both messages) |
| GET / POST | `/chats/{id}/documents` | List attached / attach library documents |
| DELETE | `/chats/{id}/documents/{doc_id}` | Detach from the chat |
| GET | `/documents?q=&chat_id=&limit=&offset=` | Search the library by filename |
| POST | `/documents?chat_id=` | Upload PDFs (optionally attach to a chat) |
| DELETE | `/documents/{id}` | Delete from the library and every chat |

## Limits and notes

- Max 5 PDFs per chat, 20 MB per PDF (`MAX_PDFS`, `MAX_FILE_SIZE_MB` in `backend/app/core/config.py`).
- PDF files themselves are not stored, only their vectors and metadata. Changing chunking or the embedding model means re-uploading, and a new embedding model needs a new Qdrant collection.
- Locks are in-process, so run a single backend worker.

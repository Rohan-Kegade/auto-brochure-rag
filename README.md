# SpecSense

Chat with car brochures. Upload PDFs, attach them to a chat, and ask about specs, features or variant comparisons. Answers come from a RAG (Retrieval-Augmented Generation) pipeline and are based only on the attached brochures.

## How it works

- **Indexing** (`backend/app/rag/indexing.py`): PDF → page text and tables → chunks → Gemini embeddings → Qdrant.
- **Retrieval** (`backend/app/rag/retrieval.py`): question → rewrite follow-ups → search Qdrant → answer from the retrieved chunks.

Both are LangChain (LCEL) chains.

## Tech

| | |
|---|---|
| Backend | FastAPI, LangChain, Google Gemini (embeddings + LLM), Qdrant, MySQL, SQLAlchemy, Alembic, pdfplumber |
| Frontend | React, Vite, Tailwind CSS, react-markdown |

## Run locally

**Requirements:** Python 3.11+, Node.js 20+, MySQL 8, Docker, and a Google AI API key.

**1. Qdrant**

```bash
docker compose up -d qdrant
```

**2. Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.sample .env             # then set GOOGLE_API_KEY and DATABASE_URL
python -m scripts.init_db       # create the database
alembic upgrade head            # create the tables
uvicorn app.main:app --reload   # http://127.0.0.1:8000
```

**3. Frontend**

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

The frontend calls the API at `http://127.0.0.1:8000`. Set `VITE_API_BASE_URL` to change that.

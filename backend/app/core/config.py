import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY is not set. Add it to backend/.env or the deployment "
        "environment (see backend/.env.sample)."
    )

# Persistence. DATABASE_URL is validated where the database is first used.
DATABASE_URL = os.getenv("DATABASE_URL")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_COLLECTION = "brochure_chunks"

MAX_PDFS = 5
MAX_FILE_SIZE_MB = 20
EMBEDDING_MODEL = "gemini-embedding-2"
LLM_MODEL = "gemini-3.1-flash-lite"
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 150
RETRIEVAL_K = 10
HISTORY_LIMIT = 20  # most recent messages sent to the model as history

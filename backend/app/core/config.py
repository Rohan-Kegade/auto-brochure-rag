import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY is not set. Add it to backend/.env or the deployment "
        "environment (see backend/.env.sample)."
    )

MAX_PDFS = 5
EMBEDDING_MODEL = "gemini-embedding-2"
LLM_MODEL = "gemini-3.5-flash-lite"
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 150

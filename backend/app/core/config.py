import os
from dotenv import load_dotenv

load_dotenv()

MAX_PDFS = 5
EMBEDDING_MODEL = "gemini-embedding-2"
LLM_MODEL = "gemini-3.5-flash-lite"
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 150
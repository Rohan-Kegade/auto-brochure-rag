import asyncio

state: dict = {
    "vector_db": None,
    "rag_chain": None,
    "active_pdfs": set(),
    "file_chunks": {},
    "file_ids": {},
}

write_lock = asyncio.Lock()

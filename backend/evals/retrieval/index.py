"""Index the brochure corpus with the app's own indexing steps.

Chunks go into an on-disk Qdrant store under results/qdrant/ instead of the
app's server, so the eval needs no docker and never touches app data. Each
chunking + embedding config gets its own collection, and a brochure already
in it is not embedded again, so repeat runs only pay for the queries.
"""

import logging
import re

from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient, models

from app.core.config import CHUNK_OVERLAP, CHUNK_SIZE, EMBEDDING_MODEL
from app.rag.indexing import (
    add_metadata,
    get_embedding_model,
    load_pdf_pages,
    only_these_documents,
    split_into_chunks,
)
from evals.common.dataset import Brochure
from evals.common.gemini import with_backoff

log = logging.getLogger("eval.retrieval")

BATCH = 50  # chunks per embedding call; the free tier allows 100 per minute


def collection_name() -> str:
    raw = f"{EMBEDDING_MODEL}__c{CHUNK_SIZE}_o{CHUNK_OVERLAP}"
    return re.sub(r"[^A-Za-z0-9_-]", "-", raw)


def build_store(
    brochures: list[Brochure], qdrant_dir, reindex: bool = False
) -> QdrantVectorStore:
    """A vector store holding every chunk of `brochures`, tagged with the
    brochure id as `document_id` (what retrieval filters by)."""
    client = QdrantClient(path=str(qdrant_dir))
    name = collection_name()
    embeddings = get_embedding_model()

    if reindex and client.collection_exists(name):
        client.delete_collection(name)
    if not client.collection_exists(name):
        size = len(embeddings.embed_query("dimension probe"))
        client.create_collection(
            collection_name=name,
            vectors_config=models.VectorParams(
                size=size, distance=models.Distance.COSINE
            ),
        )

    store = QdrantVectorStore(client=client, collection_name=name, embedding=embeddings)
    for b in brochures:
        # Chunking is cheap, so redo it to know how many chunks a complete
        # index of this brochure holds; a run that died halfway is redone.
        data = {"file_bytes": b.path.read_bytes(), "filename": b.file, "document_id": b.id}
        chunks = add_metadata(split_into_chunks(load_pdf_pages(data)))["chunks"]
        only_b = only_these_documents([b.id])
        stored = client.count(name, count_filter=only_b).count
        if stored == len(chunks):
            continue
        if stored:
            client.delete(name, points_selector=models.FilterSelector(filter=only_b))
        for start in range(0, len(chunks), BATCH):
            with_backoff(store.add_documents, chunks[start : start + BATCH])
        log.info("indexed %s: %d chunks", b.id, len(chunks))
    return store

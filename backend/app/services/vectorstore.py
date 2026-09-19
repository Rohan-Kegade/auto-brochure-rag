"""Qdrant-backed chunk storage.

One collection holds the chunks of every document. Each point's payload carries
`metadata.document_id`, so a chat's context is retrieved by filtering on the ids
of the documents attached to it. All functions here are blocking; call them from
async code with `asyncio.to_thread`.
"""

import logging
import uuid
from functools import lru_cache

from app.core.config import QDRANT_COLLECTION, QDRANT_URL, RETRIEVAL_K
from app.services.indexing import get_embeddings
from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient, models

logger = logging.getLogger("autobrochure.vectorstore")

DOCUMENT_ID_KEY = "metadata.document_id"


@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    return QdrantClient(url=QDRANT_URL)


def _document_filter(document_ids: list[str]) -> models.Filter:
    return models.Filter(
        must=[
            models.FieldCondition(
                key=DOCUMENT_ID_KEY, match=models.MatchAny(any=document_ids)
            )
        ]
    )


def ensure_collection() -> None:
    """Create the collection and its payload index if they do not exist yet."""
    client = get_client()
    if not client.collection_exists(QDRANT_COLLECTION):
        # The vector size depends on the embedding model, so measure it once.
        size = len(get_embeddings().embed_query("dimension probe"))
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=models.VectorParams(
                size=size, distance=models.Distance.COSINE
            ),
        )
        logger.info("Created Qdrant collection %s (dim=%d)", QDRANT_COLLECTION, size)

    client.create_payload_index(
        collection_name=QDRANT_COLLECTION,
        field_name=DOCUMENT_ID_KEY,
        field_schema=models.PayloadSchemaType.KEYWORD,
    )  # idempotent


def _store() -> QdrantVectorStore:
    return QdrantVectorStore(
        client=get_client(),
        collection_name=QDRANT_COLLECTION,
        embedding=get_embeddings(),
    )


def add_chunks(document_id: str, filename: str, chunks: list[Document]) -> int:
    """Embed and store the chunks of one document. Returns how many were stored."""
    if not chunks:
        return 0
    tagged = [
        Document(
            page_content=chunk.page_content,
            metadata={
                **chunk.metadata,
                "document_id": document_id,
                "filename": filename,
            },
        )
        for chunk in chunks
    ]
    ids = [str(uuid.uuid4()) for _ in tagged]
    _store().add_documents(tagged, ids=ids)
    return len(tagged)


def delete_document(document_id: str) -> None:
    """Remove every chunk that belongs to `document_id`."""
    get_client().delete(
        collection_name=QDRANT_COLLECTION,
        points_selector=models.FilterSelector(filter=_document_filter([document_id])),
    )


def get_retriever(document_ids: list[str], k: int = RETRIEVAL_K):
    """A retriever limited to the chunks of the given documents."""
    if not document_ids:
        raise ValueError("At least one document id is required.")
    return _store().as_retriever(
        search_kwargs={"k": k, "filter": _document_filter(document_ids)}
    )

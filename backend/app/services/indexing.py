"""INDEXING PIPELINE: PDF bytes -> chunks -> embeddings -> Qdrant.

    {file_bytes, filename, document_id}
        | load_pdf        pdfplumber: page text + tables rendered as Markdown
        | split_chunks    RecursiveCharacterTextSplitter
        | tag_metadata    stamp every chunk with document_id + filename
        | store_chunks    embed with Gemini and upsert into Qdrant

The chain itself is `indexing_chain` at the bottom of section 2. Section 1 is
the Qdrant plumbing it writes to. All functions here are blocking; call them
from async code with `asyncio.to_thread`.
"""

import io
import logging
import uuid
from functools import lru_cache

import pdfplumber
from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient, models

from app.core.config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    EMBEDDING_MODEL,
    QDRANT_COLLECTION,
    QDRANT_URL,
)

logger = logging.getLogger("autobrochure.indexing")

# ---------------------------------------------------------------------------
# 1. Storage: embeddings + Qdrant (shared with the retrieval pipeline)
#
# One collection holds the chunks of every document. Each point's payload
# carries `metadata.document_id`, so retrieval can filter by document.
# ---------------------------------------------------------------------------

DOCUMENT_ID_KEY = "metadata.document_id"


@lru_cache(maxsize=1)
def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    return QdrantClient(url=QDRANT_URL)


def get_vector_store() -> QdrantVectorStore:
    return QdrantVectorStore(
        client=get_client(),
        collection_name=QDRANT_COLLECTION,
        embedding=get_embeddings(),
    )


def document_filter(document_ids: list[str]) -> models.Filter:
    """Qdrant filter matching the chunks of any of `document_ids`."""
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


def delete_document(document_id: str) -> None:
    """Remove every chunk that belongs to `document_id`."""
    get_client().delete(
        collection_name=QDRANT_COLLECTION,
        points_selector=models.FilterSelector(filter=document_filter([document_id])),
    )


# ---------------------------------------------------------------------------
# 2. The indexing chain. Each stage takes and returns a dict, adding its
#    output under a new key, so the stages stay independent and testable.
# ---------------------------------------------------------------------------


def _table_to_markdown(table: list[list]) -> str:
    rows = [
        [str(cell).replace("\n", " ").strip() if cell else "" for cell in row]
        for row in table
    ]
    header, body = rows[0], rows[1:]
    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(["---"] * len(header)) + " |",
    ]
    lines += ["| " + " | ".join(row) + " |" for row in body]
    return "\n".join(lines)


def load_pdf(state: dict) -> dict:
    """Stage 1: one Document per page, with tables converted to Markdown so
    their rows and columns survive embedding."""
    filename = state["filename"]
    pages = []
    with pdfplumber.open(io.BytesIO(state["file_bytes"])) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            blocks = []
            text = page.extract_text()
            if text:
                blocks.append(text)
            blocks += [
                _table_to_markdown(table)
                for table in page.extract_tables()
                if table and len(table) >= 2
            ]
            content = "\n\n".join(blocks)
            if content.strip():
                pages.append(
                    Document(
                        page_content=content,
                        metadata={"source": filename, "page": page_num},
                    )
                )
    if not pages:
        raise ValueError("No readable text found in this PDF.")
    return {**state, "pages": pages}


def split_chunks(state: dict) -> dict:
    """Stage 2: split pages into overlapping chunks sized for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
    )
    return {**state, "chunks": splitter.split_documents(state["pages"])}


def tag_metadata(state: dict) -> dict:
    """Stage 3: stamp each chunk with the ids retrieval filters and cites by."""
    tagged = [
        Document(
            page_content=chunk.page_content,
            metadata={
                **chunk.metadata,
                "document_id": state["document_id"],
                "filename": state["filename"],
            },
        )
        for chunk in state["chunks"]
    ]
    return {**state, "chunks": tagged}


def store_chunks(state: dict) -> int:
    """Stage 4: embed the chunks and upsert them into Qdrant. Returns the count."""
    chunks = state["chunks"]
    ids = [str(uuid.uuid4()) for _ in chunks]
    get_vector_store().add_documents(chunks, ids=ids)
    return len(chunks)


indexing_chain = (
    RunnableLambda(load_pdf)
    | RunnableLambda(split_chunks)
    | RunnableLambda(tag_metadata)
    | RunnableLambda(store_chunks)
)
# Usage: indexing_chain.invoke(
#     {"file_bytes": ..., "filename": "creta.pdf", "document_id": "<uuid>"}
# )  ->  number of chunks stored

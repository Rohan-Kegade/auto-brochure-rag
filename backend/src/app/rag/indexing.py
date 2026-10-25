"""INDEXING: turn an uploaded PDF into searchable vectors in Qdrant.

    {file_bytes, filename, document_id}
        | load_pdf_pages     read each page's text (tables become Markdown)
        | split_into_chunks  cut pages into small overlapping pieces
        | add_metadata       tag each chunk with document_id + filename
        | embed_and_store    turn chunks into vectors (Gemini) and save in Qdrant

The pipeline is `indexing_chain` at the bottom of section 2. Section 1 is the
Qdrant / embedding setup that both indexing and retrieval share. Everything
here is blocking; call it from async code with `asyncio.to_thread`.
"""

import io
import logging
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
# 1. Setup: embedding model + Qdrant (shared with retrieval.py)
#
# One Qdrant collection holds the chunks of every PDF. Each chunk remembers
# which PDF it came from (`document_id`), so a search can be limited to the
# PDFs attached to one chat.
# ---------------------------------------------------------------------------

DOCUMENT_ID_FIELD = "metadata.document_id"


@lru_cache(maxsize=1)
def get_embedding_model() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=QDRANT_URL)


def get_vector_store() -> QdrantVectorStore:
    return QdrantVectorStore(
        client=get_qdrant_client(),
        collection_name=QDRANT_COLLECTION,
        embedding=get_embedding_model(),
    )


def only_these_documents(document_ids: list[str]) -> models.Filter:
    """Qdrant filter: keep only chunks that belong to one of `document_ids`."""
    return models.Filter(
        must=[
            models.FieldCondition(
                key=DOCUMENT_ID_FIELD, match=models.MatchAny(any=document_ids)
            )
        ]
    )


def create_collection_if_missing() -> None:
    """Run once at startup: create the collection and a filter index on document_id."""
    client = get_qdrant_client()
    if not client.collection_exists(QDRANT_COLLECTION):
        # The vector size depends on the embedding model, so measure it.
        vector_size = len(get_embedding_model().embed_query("dimension probe"))
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=models.VectorParams(
                size=vector_size, distance=models.Distance.COSINE
            ),
        )
        logger.info(
            "Created Qdrant collection %s (dim=%d)", QDRANT_COLLECTION, vector_size
        )

    client.create_payload_index(
        collection_name=QDRANT_COLLECTION,
        field_name=DOCUMENT_ID_FIELD,
        field_schema=models.PayloadSchemaType.KEYWORD,
    )  # safe to repeat


def delete_document_chunks(document_id: str) -> None:
    """Remove every chunk that belongs to `document_id`."""
    get_qdrant_client().delete(
        collection_name=QDRANT_COLLECTION,
        points_selector=models.FilterSelector(
            filter=only_these_documents([document_id])
        ),
    )


# ---------------------------------------------------------------------------
# 2. The indexing chain. Each step receives a dict, adds its result under a
#    new key and passes the dict on, so every step is easy to test alone.
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


def load_pdf_pages(data: dict) -> dict:
    """Step 1: one Document per page. Tables are written as Markdown so their
    rows and columns survive embedding."""
    filename = data["filename"]
    pages = []
    with pdfplumber.open(io.BytesIO(data["file_bytes"])) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            parts = []
            text = page.extract_text()
            if text:
                parts.append(text)
            parts += [
                _table_to_markdown(table)
                for table in page.extract_tables()
                if table and len(table) >= 2
            ]
            page_text = "\n\n".join(parts)
            if page_text.strip():
                pages.append(
                    Document(
                        page_content=page_text,
                        metadata={"source": filename, "page": page_number},
                    )
                )
    if not pages:
        raise ValueError("No readable text found in this PDF.")
    return {**data, "pages": pages}


def split_into_chunks(data: dict) -> dict:
    """Step 2: cut pages into overlapping chunks small enough to embed well."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
    )
    return {**data, "chunks": splitter.split_documents(data["pages"])}


def add_metadata(data: dict) -> dict:
    """Step 3: tag each chunk with the ids that retrieval filters and cites by."""
    for chunk in data["chunks"]:
        chunk.metadata["document_id"] = data["document_id"]
        chunk.metadata["filename"] = data["filename"]
    return data


def embed_and_store(data: dict) -> int:
    """Step 4: embed every chunk and save it in Qdrant. Returns the chunk count."""
    chunks = data["chunks"]
    get_vector_store().add_documents(chunks)
    return len(chunks)


indexing_chain = (
    RunnableLambda(load_pdf_pages)
    | RunnableLambda(split_into_chunks)
    | RunnableLambda(add_metadata)
    | RunnableLambda(embed_and_store)
)
# Usage: indexing_chain.invoke(
#     {"file_bytes": ..., "filename": "creta.pdf", "document_id": "<uuid>"}
# )  ->  number of chunks stored

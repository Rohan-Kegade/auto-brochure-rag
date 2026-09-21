import asyncio
import hashlib
import logging

from app.db.models import DOC_FAILED, DOC_PROCESSING, DOC_READY, ChatDocument, Document
from app.services import indexing
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("autobrochure.documents")

# Serializes uploads so the same file is never processed twice concurrently.
upload_lock = asyncio.Lock()

OUTCOME_CREATED = "created"
OUTCOME_EXISTING = "existing"
OUTCOME_FAILED = "failed"


class UploadResult:
    def __init__(
        self,
        filename: str,
        outcome: str,
        document: Document | None = None,
        error: str | None = None,
    ):
        self.filename = filename
        self.outcome = outcome
        self.document = document
        self.error = error


async def get_document(db: AsyncSession, document_id: str) -> Document | None:
    return await db.get(Document, document_id)


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def search_documents(
    db: AsyncSession,
    q: str | None,
    limit: int,
    offset: int,
    chat_id: str | None,
) -> tuple[list[tuple[Document, bool]], int]:
    """Ready documents matching `q`, newest first, each flagged with whether it
    is attached to `chat_id`. Returns (rows, total)."""
    conditions = [Document.status == DOC_READY]
    if q and q.strip():
        conditions.append(
            Document.filename.like(f"%{_escape_like(q.strip())}%", escape="\\")
        )

    total = await db.scalar(select(func.count()).select_from(Document).where(*conditions))

    if chat_id:
        attached = (
            select(ChatDocument.document_id)
            .where(ChatDocument.chat_id == chat_id)
            .where(ChatDocument.document_id == Document.id)
            .exists()
        )
        stmt = select(Document, attached)
    else:
        stmt = select(Document)

    stmt = stmt.where(*conditions).order_by(Document.created_at.desc(), Document.id)
    result = await db.execute(stmt.limit(limit).offset(offset))
    if chat_id:
        rows = [(doc, bool(is_attached)) for doc, is_attached in result.all()]
    else:
        rows = [(doc, False) for doc in result.scalars()]
    return rows, total or 0


async def ingest_pdf(
    db: AsyncSession, filename: str, file_bytes: bytes
) -> UploadResult:
    """Add one PDF to the library. Reuses an existing document with identical content."""
    content_hash = hashlib.sha256(file_bytes).hexdigest()

    async with upload_lock:
        existing = await db.scalar(
            select(Document).where(Document.content_hash == content_hash)
        )
        if existing is not None and existing.status == DOC_READY:
            return UploadResult(filename, OUTCOME_EXISTING, existing)

        if existing is not None:
            # A previous attempt failed or was interrupted: clear leftovers and retry.
            await asyncio.to_thread(indexing.delete_document, existing.id)
            doc = existing
            doc.filename = filename
            doc.size_bytes = len(file_bytes)
            doc.chunk_count = 0
            doc.status = DOC_PROCESSING
        else:
            doc = Document(
                filename=filename,
                content_hash=content_hash,
                size_bytes=len(file_bytes),
                chunk_count=0,
                status=DOC_PROCESSING,
            )
            db.add(doc)
        await db.commit()

        try:
            stored = await asyncio.to_thread(
                indexing.indexing_chain.invoke,
                {"file_bytes": file_bytes, "filename": filename, "document_id": doc.id},
            )
        except Exception as exc:
            if isinstance(exc, ValueError):
                logger.warning("Indexing rejected %s: %s", filename, exc)
            else:
                logger.exception("Indexing failed for %s", filename)
            # Drop any partial vectors, then record the failure.
            try:
                await asyncio.to_thread(indexing.delete_document, doc.id)
            except Exception:
                logger.exception("Cleanup failed for %s", doc.id)
            doc.status = DOC_FAILED
            await db.commit()
            message = str(exc) if isinstance(exc, ValueError) else "Could not process this PDF."
            return UploadResult(filename, OUTCOME_FAILED, error=message)

        doc.chunk_count = stored
        doc.status = DOC_READY
        await db.commit()
        return UploadResult(filename, OUTCOME_CREATED, doc)


async def delete_document(db: AsyncSession, doc: Document) -> None:
    """Remove a document from the library, its chat attachments and its vectors."""
    # Vectors first: if this fails the row is kept, so the delete can be retried.
    await asyncio.to_thread(indexing.delete_document, doc.id)
    await db.delete(doc)  # chat_documents rows go via ON DELETE CASCADE
    await db.commit()

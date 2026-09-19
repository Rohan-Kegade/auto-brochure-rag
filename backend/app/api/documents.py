from typing import List

from app.core.config import MAX_FILE_SIZE_MB, MAX_PDFS
from app.db.session import get_db
from app.models.schemas import (
    DocumentList,
    DocumentOut,
    UploadItem,
    UploadResponse,
)
from app.services import documents as document_service
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


@router.get("", response_model=DocumentList)
async def list_documents(
    q: str | None = Query(default=None, max_length=255),
    chat_id: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    rows, total = await document_service.search_documents(db, q, limit, offset, chat_id)
    items = [
        DocumentOut.model_validate(doc).model_copy(update={"attached": attached})
        for doc, attached in rows
    ]
    return DocumentList(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=UploadResponse)
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one PDF.")
    if len(files) > MAX_PDFS:
        raise HTTPException(
            status_code=400,
            detail=f"You can upload at most {MAX_PDFS} PDFs at a time.",
        )

    results: list[UploadItem] = []
    for file in files:
        name = file.filename or "unnamed.pdf"

        if not name.lower().endswith(".pdf"):
            results.append(
                UploadItem(filename=name, outcome="failed", error="Only PDF files are supported.")
            )
            continue

        file_bytes = await file.read(MAX_FILE_BYTES + 1)
        if len(file_bytes) > MAX_FILE_BYTES:
            results.append(
                UploadItem(
                    filename=name,
                    outcome="failed",
                    error=f"Exceeds the {MAX_FILE_SIZE_MB} MB limit per PDF.",
                )
            )
            continue

        result = await document_service.ingest_pdf(db, name, file_bytes)
        results.append(
            UploadItem(
                filename=name,
                outcome=result.outcome,
                error=result.error,
                document=(
                    DocumentOut.model_validate(result.document)
                    if result.document
                    else None
                ),
            )
        )

    return UploadResponse(results=results)


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await document_service.get_document(db, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    await document_service.delete_document(db, doc)
    return Response(status_code=204)

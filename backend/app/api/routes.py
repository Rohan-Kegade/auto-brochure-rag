from typing import List
from app.api.dependencies import get_session
from app.core.config import MAX_PDFS
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    DocumentsResponse,
    UploadResponse,
)
from app.services.indexing import create_vector_store_from_bytes
from app.services.rag import build_rag_chain, parse_chat_history
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_documents(
    files: List[UploadFile] = File(...),
    session: dict = Depends(get_session),
):
  if not files:
    raise HTTPException(
        status_code=400, detail="Please upload at least one PDF."
    )

  if len(files) + len(session["active_pdfs"]) > MAX_PDFS:
    remaining = MAX_PDFS - len(session["active_pdfs"])
    raise HTTPException(
        status_code=400,
        detail=(
            f"You can have a maximum of {MAX_PDFS} active PDFs. You can add"
            f" {remaining} more."
        ),
    )

  uploaded_names = []

  try:
    for file in files:
      if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF files are supported: {file.filename}",
        )

      if file.filename in session["active_pdfs"]:
        continue

      file_bytes = await file.read()
      new_vector_db = create_vector_store_from_bytes(
          file_bytes, file.filename
      )

      if new_vector_db is None:
        continue

      if session["vector_db"] is None:
        session["vector_db"] = new_vector_db
      else:
        session["vector_db"].merge_from(new_vector_db)

      session["active_pdfs"].add(file.filename)
      uploaded_names.append(file.filename)

    if session["vector_db"] is None:
      raise HTTPException(
          status_code=400, detail="No valid PDFs were processed."
      )

    session["rag_chain"] = build_rag_chain(session["vector_db"])

    return UploadResponse(
        status="Success",
        uploaded=uploaded_names,
        active_pdf_count=len(session["active_pdfs"]),
        active_pdfs=list(session["active_pdfs"]),
    )

  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat_with_brochure(
    request: ChatRequest,
    session: dict = Depends(get_session),
):
  if session["rag_chain"] is None:
    raise HTTPException(
        status_code=400, detail="Please upload at least one brochure first."
    )

  try:
    formatted_history = parse_chat_history(request.history)
    answer = session["rag_chain"].invoke({
        "input": request.message,
        "chat_history": formatted_history,
    })

    return ChatResponse(query=request.message, answer=answer)

  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))


@router.get("/files", response_model=DocumentsResponse)
async def get_active_documents(session: dict = Depends(get_session)):
  active_list = list(session["active_pdfs"])
  return DocumentsResponse(
      active_pdf_count=len(active_list),
      active_pdfs=active_list,
      indexed_files=active_list,
      max_pdfs=MAX_PDFS,
  )
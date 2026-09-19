from typing import List
from app.core.config import MAX_FILE_SIZE_MB, MAX_PDFS
from app.core.state import state, write_lock
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    DocumentsResponse,
    UploadResponse,
)
from app.services.indexing import create_chunks_and_store
from app.services.rag import build_rag_chain, parse_chat_history
from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_documents(
    files: List[UploadFile] = File(...),
):
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one PDF.")

    async with write_lock:
        if len(files) + len(state["active_pdfs"]) > MAX_PDFS:
            remaining = MAX_PDFS - len(state["active_pdfs"])
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

                if file.filename in state["active_pdfs"]:
                    continue

                file_bytes = await file.read()
                if len(file_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"'{file.filename}' exceeds the {MAX_FILE_SIZE_MB} MB"
                            " limit per PDF."
                        ),
                    )

                chunks, new_vector_db = create_chunks_and_store(
                    file_bytes, file.filename
                )
                if new_vector_db is None:
                    continue

                state["file_chunks"][file.filename] = chunks
                state["file_ids"][file.filename] = list(
                    new_vector_db.index_to_docstore_id.values()
                )

                if state["vector_db"] is None:
                    state["vector_db"] = new_vector_db
                else:
                    state["vector_db"].merge_from(new_vector_db)

                state["active_pdfs"].add(file.filename)
                uploaded_names.append(file.filename)

            if state["vector_db"] is None:
                raise HTTPException(
                    status_code=400, detail="No valid PDFs were processed."
                )

            state["rag_chain"] = build_rag_chain(state["vector_db"])

            return UploadResponse(
                status="Success",
                uploaded=uploaded_names,
                active_pdf_count=len(state["active_pdfs"]),
                active_pdfs=list(state["active_pdfs"]),
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat_with_brochure(request: ChatRequest):
    if state["rag_chain"] is None:
        raise HTTPException(
            status_code=400, detail="Please upload at least one brochure first."
        )

    try:
        formatted_history = parse_chat_history(request.history)
        answer = state["rag_chain"].invoke(
            {
                "input": request.message,
                "chat_history": formatted_history,
            }
        )

        return ChatResponse(query=request.message, answer=answer)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files", response_model=DocumentsResponse)
async def get_active_documents():
    active_list = list(state["active_pdfs"])
    return DocumentsResponse(
        active_pdf_count=len(active_list),
        active_pdfs=active_list,
        indexed_files=active_list,
        max_pdfs=MAX_PDFS,
        max_file_size_mb=MAX_FILE_SIZE_MB,
    )


@router.delete("/files/{filename}", response_model=DocumentsResponse)
async def delete_document(filename: str):
    async with write_lock:
        if filename not in state["active_pdfs"]:
            raise HTTPException(
                status_code=404,
                detail=f"File '{filename}' not found in the active files.",
            )

        state["active_pdfs"].remove(filename)
        state["file_chunks"].pop(filename, None)
        removed_ids = state["file_ids"].pop(filename, None)

        vector_db = state["vector_db"]
        if vector_db is not None and removed_ids:
            vector_db.delete(removed_ids)

        if state["active_pdfs"]:
            state["rag_chain"] = build_rag_chain(vector_db)
        else:
            state["vector_db"] = None
            state["rag_chain"] = None

        active_list = list(state["active_pdfs"])
    return DocumentsResponse(
        active_pdf_count=len(active_list),
        active_pdfs=active_list,
        indexed_files=active_list,
        max_pdfs=MAX_PDFS,
        max_file_size_mb=MAX_FILE_SIZE_MB,
    )

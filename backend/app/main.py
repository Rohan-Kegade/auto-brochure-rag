import os
import shutil
from typing import Dict, List, Optional
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from helpers.indexing_chain import indexing_chain
from helpers.rag_chain import build_rag_chain, parse_chat_history
from pydantic import BaseModel

app = FastAPI(title="AutoBrochure-RAG Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_PDFS = 5

# Global In-Memory Session Store
# sessions[session_id] = { "vector_db": FAISS, "rag_chain": Runnable, "active_pdfs": set() }
sessions: Dict[str, dict] = {}


def get_or_create_session(session_id: str) -> dict:
  if not session_id:
    raise HTTPException(status_code=400, detail="X-Session-ID header missing.")

  if session_id not in sessions:
    sessions[session_id] = {
        "vector_db": None,
        "rag_chain": None,
        "active_pdfs": set(),
    }
  return sessions[session_id]


# Pydantic models for chat requests
class ChatMessage(BaseModel):
  role: Optional[str] = None
  sender: Optional[str] = None
  content: Optional[str] = None
  text: Optional[str] = None


class ChatRequest(BaseModel):
  message: str
  history: List[ChatMessage] = []


@app.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    x_session_id: str = Header(..., alias="X-Session-ID"),
):
  session = get_or_create_session(x_session_id)

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
  temp_files = []

  try:
    for file in files:
      if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF files are supported: {file.filename}",
        )

      if file.filename in session["active_pdfs"]:
        continue

      temp_file_path = f"temp_{x_session_id}_{file.filename}"

      with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

      temp_files.append(temp_file_path)

      new_vector_db = indexing_chain.invoke((temp_file_path, file.filename))

      if session["vector_db"] is None:
        session["vector_db"] = new_vector_db
      else:
        session["vector_db"].merge_from(new_vector_db)

      session["active_pdfs"].add(file.filename)
      uploaded_names.append(file.filename)

    if session["vector_db"] is None:
      raise HTTPException(
          status_code=400, detail="No new PDFs were uploaded."
      )

    # Rebuild RAG chain for this specific session
    session["rag_chain"] = build_rag_chain(session["vector_db"])

    return {
        "status": "Success",
        "uploaded": uploaded_names,
        "active_pdf_count": len(session["active_pdfs"]),
        "active_pdfs": list(session["active_pdfs"]),
    }

  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
  finally:
    for temp_file_path in temp_files:
      if os.path.exists(temp_file_path):
        os.remove(temp_file_path)


@app.post("/chat")
def chat_with_brochure(
    request: ChatRequest, x_session_id: str = Header(..., alias="X-Session-ID")
):
  session = get_or_create_session(x_session_id)

  if session["rag_chain"] is None:
    raise HTTPException(
        status_code=400, detail="Please upload at least one brochure first."
    )

  try:
    # Convert chat history into LangChain message objects
    formatted_history = parse_chat_history(
        [msg.model_dump() for msg in request.history]
    )

    # Invoke session chain
    answer = session["rag_chain"].invoke({
        "input": request.message,
        "chat_history": formatted_history,
    })

    return {"query": request.message, "answer": answer}

  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))


@app.get("/files")
@app.get("/documents")
def get_active_documents(
    x_session_id: str = Header(..., alias="X-Session-ID"),
):
  session = get_or_create_session(x_session_id)

  return {
      "active_pdf_count": len(session["active_pdfs"]),
      "active_pdfs": list(session["active_pdfs"]),
      "indexed_files": list(session["active_pdfs"]),
      "max_pdfs": MAX_PDFS,
  }
from fastapi import FastAPI, HTTPException, File, HTTPException, UploadFile
from helpers.indexing_chain import indexing_chain
from helpers.rag_chain import build_rag_chain
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil

app = FastAPI(title="AutoBrochure-RAG Engine")

# Enable CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for active sessions
vector_db = None
rag_chain = None


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
  global vector_db, rag_chain

  if not file.filename.endswith(".pdf"):
    raise HTTPException(
        status_code=400, detail="Only PDF files are supported."
    )

  temp_file_path = f"temp_{file.filename}"

  try:
    # Save uploaded binary stream to temporary local file
    with open(temp_file_path, "wb") as buffer:
      shutil.copyfileobj(file.file, buffer)

    # 1. Execute indexing pipeline via LCEL chain
    vector_db = indexing_chain.invoke(temp_file_path)

    # 2. Build and cache the LCEL retrieval chain
    rag_chain = build_rag_chain(vector_db)

    return {
        "status": "Success",
        "message": f"Indexed '{file.filename}' and RAG chain initialized.",
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
  finally:
    # Clean up temporary disk file
    if os.path.exists(temp_file_path):
      os.remove(temp_file_path)


@app.get("/chat")
def chat_with_brochure(query: str):
  if rag_chain is None:
    raise HTTPException(
        status_code=400, detail="Please upload a document first."
    )

  try:
    # Execute single-step RAG retrieval & generation
    answer = rag_chain.invoke(query)
    return {"query": query, "answer": answer}
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
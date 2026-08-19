from fastapi import FastAPI, HTTPException
from helpers.indexing_chain import indexing_chain
from helpers.rag_chain import build_rag_chain
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AutoBrochure-RAG Engine")

# Enable CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # To do - Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for active sessions
vector_db = None
rag_chain = None


@app.post("/process")
def process_document(file_path: str = "Venue Digital Brochure.pdf"):
  global vector_db, rag_chain
  try:
    # 1. Execute indexing pipeline via LCEL chain
    vector_db = indexing_chain.invoke(file_path)

    # 2. Build and cache the LCEL retrieval chain
    rag_chain = build_rag_chain(vector_db)

    return {
        "status": "Success",
        "message": "Indexed and RAG chain initialized.",
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat")
def chat_with_brochure(query: str):
  if rag_chain is None:
    raise HTTPException(
        status_code=400, detail="Please process a document first."
    )

  try:
    # Execute single-step RAG retrieval & generation
    answer = rag_chain.invoke(query)
    return {"query": query, "answer": answer}
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
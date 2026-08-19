from fastapi import FastAPI, HTTPException
from helpers.indexing_chain import indexing_chain
from helpers.rag_chain import build_rag_chain

app = FastAPI()

# Store global references
vector_db = None
rag_chain = None  # Built ONCE after indexing


@app.post("/process")
def process_document(file_path: str = "Venue Digital Brochure.pdf"):
  global vector_db, rag_chain
  try:
    # 1. Index document
    vector_db = indexing_chain.invoke(file_path)

    # 2. Build chain ONCE and cache it in memory
    rag_chain = build_rag_chain(vector_db)

    return {"status": "Success", "message": "Indexed and RAG chain initialized."}
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat")
def chat_with_brochure(query: str):
  if rag_chain is None:
    raise HTTPException(
        status_code=400, detail="Please run POST /process first."
    )

  # Direct execution: 0 overhead from rebuilding chain objects
  answer = rag_chain.invoke(query)
  return {"query": query, "answer": answer}
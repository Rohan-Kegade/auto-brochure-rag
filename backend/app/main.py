from fastapi import FastAPI
from helpers import pdf_loader, text_splitter, vector_store
app = FastAPI()

# Global store for in-memory retrieval
db = None

@app.get("/process")
def process_pdf():
    global db
    # 1. Load PDF
    docs = pdf_loader.load_pdf()
    
    # 2. Split into chunks
    chunks = text_splitter.split_documents(docs)
    
    # 3. Embed & store in FAISS
    db = vector_store.create_vector_store(chunks)
    
    return {
        "status": "Success", 
        "total_chunks_embedded": len(chunks)
    }


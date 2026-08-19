from fastapi import FastAPI
from helpers import pdf_loader, text_splitter
app = FastAPI()

@app.get("/")
def read_root():
    docs = pdf_loader.load_pdf()
    result =  text_splitter.split_text(docs)
    return {"data": result}
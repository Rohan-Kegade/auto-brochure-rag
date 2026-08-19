import pdfplumber
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings

embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-2")

def load_pdf_step(file_path: str) -> list[Document]:
  docs = []
  with pdfplumber.open(file_path) as pdf:
    for page_num, page in enumerate(pdf.pages, start=1):
      content_blocks = []

      # Extract text
      text = page.extract_text()
      if text:
        content_blocks.append(text)

      # Extract tables into Markdown grid
      tables = page.extract_tables()
      for table in tables:
        if not table or len(table) < 2:
          continue
        header = [
            str(cell).replace("\n", " ").strip() if cell else ""
            for cell in table[0]
        ]
        markdown_rows = [
            "| " + " | ".join(header) + " |",
            "| " + " | ".join(["---"] * len(header)) + " |",
        ]
        for row in table[1:]:
          clean_row = [
              str(cell).replace("\n", " ").strip() if cell else ""
              for cell in row
          ]
          markdown_rows.append("| " + " | ".join(clean_row) + " |")
        content_blocks.append("\n".join(markdown_rows))

      full_text = "\n\n".join(content_blocks)
      if full_text.strip():
        docs.append(
            Document(
                page_content=full_text,
                metadata={"source": file_path, "page": page_num},
            )
        )
  return docs


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500, chunk_overlap=150
)


def create_vector_store_step(docs):
  return FAISS.from_documents(docs, embeddings)


indexing_chain = (
    RunnableLambda(load_pdf_step)
    | text_splitter.split_documents
    | RunnableLambda(create_vector_store_step)
)
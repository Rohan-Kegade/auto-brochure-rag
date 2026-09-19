import io
from functools import lru_cache

import pdfplumber
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import CHUNK_OVERLAP, CHUNK_SIZE, EMBEDDING_MODEL


@lru_cache(maxsize=1)
def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def get_text_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
    )


def load_pdf_bytes(file_bytes: bytes, filename: str) -> list[Document]:
    """Parses raw PDF bytes with pdfplumber, extracting text and converting

    tables into clean Markdown representations for better vector embedding.
    """
    docs = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            content_blocks = []

            # 1. Extract raw text
            text = page.extract_text()
            if text:
                content_blocks.append(text)

            # 2. Extract tables and convert to Markdown
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

            # 3. Combine page content
            full_text = "\n\n".join(content_blocks)
            if full_text.strip():
                docs.append(
                    Document(
                        page_content=full_text,
                        metadata={"source": filename, "page": page_num},
                    )
                )
    return docs


def build_chunks(file_bytes: bytes, filename: str) -> list[Document]:
    """Parses a PDF and splits it into chunks ready for embedding."""
    docs = load_pdf_bytes(file_bytes, filename)
    if not docs:
        return []
    return get_text_splitter().split_documents(docs)

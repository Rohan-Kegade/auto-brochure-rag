import pdfplumber

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-2"
)


def load_pdf_step(file_data):
    file_path, filename = file_data

    docs = []

    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):

            content_blocks = []

            text = page.extract_text()

            if text:
                content_blocks.append(text)

            tables = page.extract_tables()

            for table in tables:
                if not table or len(table) < 2:
                    continue

                header = [
                    str(cell).replace("\n", " ").strip()
                    if cell
                    else ""
                    for cell in table[0]
                ]

                markdown_rows = [
                    "| " + " | ".join(header) + " |",
                    "| " + " | ".join(["---"] * len(header)) + " |",
                ]

                for row in table[1:]:
                    clean_row = [
                        str(cell).replace("\n", " ").strip()
                        if cell
                        else ""
                        for cell in row
                    ]

                    markdown_rows.append(
                        "| " + " | ".join(clean_row) + " |"
                    )

                content_blocks.append(
                    "\n".join(markdown_rows)
                )

            full_text = "\n\n".join(content_blocks)

            if full_text.strip():
                docs.append(
                    Document(
                        page_content=full_text,
                        metadata={
                            "source": filename,
                            "page": page_num,
                        },
                    )
                )

    return docs


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,
    chunk_overlap=150
)


def split_documents(docs):
    return text_splitter.split_documents(docs)


def create_vector_store(docs):
    return FAISS.from_documents(
        docs,
        embeddings
    )


def indexing_function(file_data):
    docs = load_pdf_step(file_data)
    chunks = split_documents(docs)
    return create_vector_store(chunks)


indexing_chain = RunnableLambda(indexing_function)
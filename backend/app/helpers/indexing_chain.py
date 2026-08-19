from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_core.runnables import RunnableLambda
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 1. Shared Embedding Model & Text Splitter
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50
)


# 2. Step Functions
def load_pdf_step(file_path: str):
  loader = PyPDFLoader(file_path)
  return loader.load()


def create_vector_store_step(docs):
  return FAISS.from_documents(docs, embeddings)


# 3. LCEL Indexing Chain
indexing_chain = (
    RunnableLambda(load_pdf_step)
    | text_splitter.split_documents
    | RunnableLambda(create_vector_store_step)
)
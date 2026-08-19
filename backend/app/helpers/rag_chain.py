from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()
llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite")

PROMPT_TEMPLATE = """
    You are an AI assistant specialized in answering questions about car brochures.
    Answer the question based strictly on the provided context below.
    If the context does not contain enough information, reply with:
    "I couldn't find that information in the brochure."

    Context:
    {context}

    Question:
    {question}
"""

prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)


def format_docs(docs):
  return "\n\n---\n\n".join(doc.page_content for doc in docs)


def build_rag_chain(vector_store):
  retriever = vector_store.as_retriever(search_kwargs={"k": 3})

  # Explicit RunnableParallel step
  setup_and_retrieval = RunnableParallel({
      "context": retriever | format_docs,
      "question": RunnablePassthrough(),
  })

  # Complete LCEL Pipeline
  rag_chain = setup_and_retrieval | prompt | llm | StrOutputParser()

  return rag_chain
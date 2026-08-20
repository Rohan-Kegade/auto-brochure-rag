from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()
llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite")

PROMPT_TEMPLATE = """
  You are an expert AI assistant specialized in analyzing car brochures and technical spec sheets.

  Your task is to answer the user's question based strictly on the provided context below. 
  You are encouraged to perform logical reasoning, compare trims/variants, analyze feature trade-offs, and provide actionable recommendations based on the facts in the text.

  Guidelines:
  1. Base all deductions, comparisons, and recommendations strictly on the features and specs explicitly listed in the context. Do not rely on external automotive knowledge.
  2. For recommendation or selection queries (e.g., "which trim is best for X?"), explain your reasoning by comparing feature differences across variants found in the text.
  3. If the context does not contain enough detail to form a logical answer or deduction, reply with:
      "I couldn't find enough information in the brochure to answer that."

  Context:
  {context}

  Question:
  {question}

  Answer:
"""

prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)


def format_docs(docs):
  return "\n\n---\n\n".join(doc.page_content for doc in docs)


def build_rag_chain(vector_store):
  retriever = vector_store.as_retriever(search_kwargs={"k": 5})

  # Explicit RunnableParallel step
  setup_and_retrieval = RunnableParallel({
      "context": retriever | format_docs,
      "question": RunnablePassthrough(),
  })

  # Complete LCEL Pipeline
  rag_chain = setup_and_retrieval | prompt | llm | StrOutputParser()

  return rag_chain
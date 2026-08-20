from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite")

# Contextualization prompt to reformulate follow-up questions
CONTEXTUALIZE_Q_SYSTEM_PROMPT = """Given a chat history and the latest user question \
which might reference context in the chat history, formulate a standalone question \
which can be understood without the chat history. Do NOT answer the question, \
just reformulate it if needed and otherwise return it as is."""

contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", CONTEXTUALIZE_Q_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

# Main QA prompt
QA_SYSTEM_PROMPT = """You are an expert AI assistant specialized in analyzing car brochures
and technical specification sheets.

Your task is to answer the user's question strictly using the provided brochure context.

You can:
- Compare cars
- Compare variants
- Compare specifications
- Analyze features
- Explain differences
- Recommend a car or variant based on the information provided

Guidelines:
1. Base all answers strictly on the provided brochure context.
2. Do not use external automotive knowledge.
3. When comparing multiple cars or variants, clearly identify which brochure each specification comes from.
4. When making a recommendation, explain the reasoning using the specifications and features found in the context.
5. If the context does not contain enough information to answer the question, reply:
   "I couldn't find enough information in the brochure to answer that."

Context:
{context}"""

qa_prompt = ChatPromptTemplate.from_messages([
    ("system", QA_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])


def format_docs(docs):
  formatted_docs = []
  for doc in docs:
    source = doc.metadata.get("source", "Unknown")
    page = doc.metadata.get("page", "Unknown")
    formatted_docs.append(
        f"Source: {source}\nPage: {page}\n\n{doc.page_content}"
    )
  return "\n\n---\n\n".join(formatted_docs)


def build_rag_chain(vector_store):
  retriever = vector_store.as_retriever(search_kwargs={"k": 10})

  # Dynamically decide whether to contextualize based on history presence
  def contextualized_question(input_dict):
    if input_dict.get("chat_history"):
      return contextualize_q_prompt | llm | StrOutputParser()
    return input_dict["input"]

  retrieval_chain = RunnablePassthrough.assign(
      context=contextualized_question | retriever | format_docs
  )

  rag_chain = retrieval_chain | qa_prompt | llm | StrOutputParser()
  return rag_chain


def parse_chat_history(history_list):
  """Converts incoming client JSON message dicts into LangChain Message objects."""
  formatted = []
  for msg in history_list:
    role = msg.get("role") or msg.get("sender")
    content = msg.get("content") or msg.get("text")
    if not content:
      continue

    if role == "user":
      formatted.append(HumanMessage(content=content))
    elif role in ["assistant", "ai"]:
      formatted.append(AIMessage(content=content))
  return formatted
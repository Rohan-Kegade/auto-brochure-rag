from functools import lru_cache

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableBranch, RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import LLM_MODEL, RETRIEVAL_K


@lru_cache(maxsize=1)
def get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(model=LLM_MODEL)

# Prompt to rewrite follow-up questions using chat history context
CONTEXTUALIZE_Q_SYSTEM_PROMPT = """Given a chat history and the latest user question \
which might reference context in the chat history, formulate a standalone question \
which can be understood without the chat history. Do NOT answer the question, \
just reformulate it if needed and otherwise return it as is."""

contextualize_q_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", CONTEXTUALIZE_Q_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ]
)

# Domain-specific car brochure QA system prompt
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

qa_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", QA_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ]
)


def format_docs(docs) -> str:
    """Formats retrieved vector store documents with source metadata."""
    formatted_docs = []
    for doc in docs:
        source = doc.metadata.get("source", "Unknown")
        page = doc.metadata.get("page", "Unknown")
        formatted_docs.append(f"Source: {source}\nPage: {page}\n\n{doc.page_content}")
    return "\n\n---\n\n".join(formatted_docs)


def build_rag_chain(vector_store):
    """Constructs an LCEL RAG chain bound to the provided vector store."""
    return build_rag_chain_from_retriever(
        vector_store.as_retriever(search_kwargs={"k": RETRIEVAL_K})
    )


def build_rag_chain_from_retriever(retriever):
    """Constructs an LCEL RAG chain that retrieves context with `retriever`."""
    llm = get_llm()

    contextualized_question = RunnableBranch(
        (
            lambda x: bool(x.get("chat_history")),
            contextualize_q_prompt | llm | StrOutputParser(),
        ),
        lambda x: x["input"],
    )

    retrieval_chain = RunnablePassthrough.assign(
        context=contextualized_question | retriever | format_docs
    )

    return retrieval_chain | qa_prompt | llm | StrOutputParser()


def parse_chat_history(history_list: list) -> list:
    """Converts raw client message dicts/Pydantic schemas into standard LangChain Message objects."""
    formatted = []
    for msg in history_list:
        msg_dict = msg.model_dump() if hasattr(msg, "model_dump") else msg
        role = msg_dict.get("role")
        content = msg_dict.get("content")
        if not content:
            continue

        if role == "user":
            formatted.append(HumanMessage(content=content))
        elif role in ("assistant", "ai"):
            formatted.append(AIMessage(content=content))
    return formatted

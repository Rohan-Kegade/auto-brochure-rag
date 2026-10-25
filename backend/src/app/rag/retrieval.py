"""RETRIEVAL: question -> relevant chunks -> answer grounded in them.

    {input, chat_history}
        | rewrite_question   turn a follow-up ("and its mileage?") into a standalone question
        | search             find the closest chunks in Qdrant (only this chat's PDFs)
        | format_context     label each chunk with its file + page
        | answer_prompt | llm | StrOutputParser    answer using only that context

`build_retrieval_chain(document_ids)` in section 2 assembles the chain.
Section 1 holds the model and prompts.
"""

from functools import lru_cache
from operator import itemgetter

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableBranch, RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import LLM_MODEL, RETRIEVAL_K
from app.rag.indexing import get_vector_store, only_these_documents

# ---------------------------------------------------------------------------
# 1. Model and prompts
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(model=LLM_MODEL)


# Rewrites follow-up questions ("and its mileage?") into standalone ones so the
# vector search does not depend on the chat history.
REWRITE_QUESTION_SYSTEM_PROMPT = """Given a chat history and the latest user question \
which might reference context in the chat history, formulate a standalone question \
which can be understood without the chat history. Do NOT answer the question, \
just reformulate it if needed and otherwise return it as is."""

rewrite_question_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", REWRITE_QUESTION_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ]
)

ANSWER_SYSTEM_PROMPT = """You are an expert AI assistant specialized in analyzing car brochures
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

answer_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", ANSWER_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ]
)

# ---------------------------------------------------------------------------
# 2. The retrieval chain
# ---------------------------------------------------------------------------


def format_context(chunks) -> str:
    """Join the retrieved chunks into one text block, labelled with file and page."""
    blocks = []
    for chunk in chunks:
        source = chunk.metadata.get("source", "Unknown")
        page = chunk.metadata.get("page", "Unknown")
        blocks.append(f"Source: {source}\nPage: {page}\n\n{chunk.page_content}")
    return "\n\n---\n\n".join(blocks)


def build_retrieval_chain(document_ids: list[str]):
    """LCEL retrieval chain over the chunks of `document_ids`.

    Input:  {"input": str, "chat_history": [BaseMessage, ...]}
    Output: the answer text (streamable with `.astream`).
    """
    if not document_ids:
        raise ValueError("At least one document id is required.")

    llm = get_llm()

    # Searches Qdrant for the k closest chunks, only inside the chat's PDFs.
    search = get_vector_store().as_retriever(
        search_kwargs={"k": RETRIEVAL_K, "filter": only_these_documents(document_ids)}
    )

    # Only spend an LLM call on rewriting when there is history to resolve.
    rewrite_question = RunnableBranch(
        (
            lambda x: bool(x["chat_history"]),
            rewrite_question_prompt | llm | StrOutputParser(),
        ),
        itemgetter("input"),
    )

    return (
        RunnablePassthrough.assign(standalone_question=rewrite_question)
        | RunnablePassthrough.assign(
            context=itemgetter("standalone_question") | search | format_context
        )
        | answer_prompt
        | llm
        | StrOutputParser()
    )

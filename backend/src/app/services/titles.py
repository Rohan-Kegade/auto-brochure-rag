"""CHAT TITLES: a short LLM-written title for a new chat.

Not part of the RAG pipeline. It is one prompt and one LLM call made after the
first answer, falling back to the question's first words if the call fails.
"""

import asyncio
import logging

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.rag.retrieval import get_llm

logger = logging.getLogger("autobrochure.titles")

MAX_TITLE_LENGTH = 40

TITLE_SYSTEM_PROMPT = """Write a short title (at most 6 words) for a chat about car brochures. Include the name of the car or cars being discussed (e.g. "Creta vs Seltos safety features") whenever it can be worked out from the question, the answer or the brochure filenames. Reply with only the title: no quotes, no trailing punctuation."""

title_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", TITLE_SYSTEM_PROMPT),
        (
            "human",
            "Brochures: {filenames}\n\nUser question: {question}\n\nAssistant answer: {answer}",
        ),
    ]
)


def _ask_llm_for_title(question: str, answer: str, filenames: list[str]) -> str:
    chain = title_prompt | get_llm() | StrOutputParser()
    return chain.invoke(
        {
            "question": question[:500],
            "answer": answer[:1000],
            "filenames": ", ".join(filenames) or "none",
        }
    )


def _title_from_question(question: str) -> str:
    text = " ".join(question.split())
    if len(text) <= MAX_TITLE_LENGTH:
        return text
    return f"{text[:MAX_TITLE_LENGTH].rstrip()}…"


async def make_chat_title(question: str, answer: str, filenames: list[str]) -> str:
    """LLM-written title, falling back to the question's first words."""
    try:
        title = " ".join(
            (await asyncio.to_thread(_ask_llm_for_title, question, answer, filenames))
            .strip()
            .strip("\"'`*# ")
            .split()
        )
    except Exception:
        logger.warning("Chat title generation failed", exc_info=True)
        title = ""
    return title[:MAX_TITLE_LENGTH].rstrip() or _title_from_question(question)

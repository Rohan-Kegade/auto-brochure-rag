"""RETRIEVAL: question -> relevant chunks -> answer grounded in them.

    {input, chat_history}
        | rewrite_question   turn a follow-up ("and its mileage?") into a standalone question
        | search             find the closest chunks in Qdrant (only this chat's PDFs)
        | format_context     number each chunk and label it with its file + page
        | answer_prompt | llm | StrOutputParser    answer using only that context,
                                                   citing chunks as [1], [2]...

The citation markers never reach the user: `CitationFilter` strips them from
the streamed answer and `group_sources` turns the numbers into the brochures
and pages shown under it.

`build_retrieval_chain(document_ids)` in section 2 assembles the chain.
Section 1 holds the model and prompts; section 3 the citation helpers.
"""

import re
from functools import lru_cache
from operator import itemgetter

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableBranch, RunnableGenerator, RunnablePassthrough
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
6. The context is split into numbered sources. Right after each fact, cite the
   source(s) it came from by number, like [1] or [2][3]. Cite only numbers that
   appear in the context, and never write a source's file name or page yourself.

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
    """Join the retrieved chunks into one text block, numbered from [1] (the
    numbers the answer cites) and labelled with file and page."""
    blocks = []
    for n, chunk in enumerate(chunks, start=1):
        source = chunk.metadata.get("source", "Unknown")
        page = chunk.metadata.get("page", "Unknown")
        blocks.append(f"[{n}] Source: {source}\nPage: {page}\n\n{chunk.page_content}")
    return "\n\n---\n\n".join(blocks)


def build_search(document_ids: list[str], vector_store=None, k: int = RETRIEVAL_K):
    """The search step alone: the k closest chunks, only inside `document_ids`.
    The retrieval eval passes its own `vector_store` and `k`."""
    store = vector_store or get_vector_store()
    return store.as_retriever(
        search_kwargs={"k": k, "filter": only_these_documents(document_ids)}
    )


def build_answer(llm=None, keep_citations=False):
    """The answer step alone: {input, chat_history, context} -> answer text,
    with its [n] citations stripped unless `keep_citations` (the app strips
    them itself, to see which sources were cited). The evals feed it their own
    context."""
    chain = answer_prompt | (llm or get_llm()) | StrOutputParser()
    if keep_citations:
        return chain
    return chain | RunnableGenerator(_strip_stream, _astrip_stream)


def build_retrieval_chain(document_ids: list[str]):
    """LCEL retrieval chain over the chunks of `document_ids`.

    Input:  {"input": str, "chat_history": [BaseMessage, ...]}
    Output: {"chunks": [Document, ...], "answer": str}. Streamed with `.astream`,
    the chunks arrive whole before the answer's first piece. The answer keeps
    its [n] citations; see `CitationFilter`.
    """
    if not document_ids:
        raise ValueError("At least one document id is required.")

    llm = get_llm()
    search = build_search(document_ids)

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
        | RunnablePassthrough.assign(chunks=itemgetter("standalone_question") | search)
        | RunnablePassthrough.assign(context=lambda x: format_context(x["chunks"]))
        | RunnablePassthrough.assign(answer=build_answer(llm, keep_citations=True))
    ).pick(["chunks", "answer"])


# ---------------------------------------------------------------------------
# 3. Citations
# ---------------------------------------------------------------------------

# One marker: [2] or [2, 3], with the spaces before it (so "fact [2]." -> "fact.").
CITATION = re.compile(r"[ \t]*\[(\d+(?:\s*,\s*\d+)*)\]")
# What a marker split across streamed pieces can end with: "  [", "[2", "[2, ".
PARTIAL_CITATION = re.compile(r"[ \t]*(?:\[[\d,\s]*)?$")


class CitationFilter:
    """Strips [n] markers from an answer as it streams in, remembering the
    source numbers they cite (in first-cited order). `count` is how many sources
    the context had; other bracketed numbers ("[2024]") are left as written."""

    def __init__(self, count: int | None = None):
        self.count = count
        self.cited: list[int] = []
        self._held = ""

    def _replace(self, match: re.Match) -> str:
        numbers = [int(n) for n in re.findall(r"\d+", match.group(1))]
        if self.count is not None and not all(1 <= n <= self.count for n in numbers):
            return match.group(0)
        for n in numbers:
            if n not in self.cited:
                self.cited.append(n)
        return ""

    def feed(self, text: str) -> str:
        """Clean text that is safe to show; a possible unfinished marker at the
        end is held back until the next piece shows what it is."""
        text = self._held + text
        cut = PARTIAL_CITATION.search(text).start()
        self._held = text[cut:]
        return CITATION.sub(self._replace, text[:cut])

    def flush(self) -> str:
        """Whatever was held back, once the answer has ended."""
        text, self._held = self._held, ""
        return CITATION.sub(self._replace, text)


def strip_citations(text: str) -> str:
    citations = CitationFilter()
    return citations.feed(text) + citations.flush()


def _strip_stream(pieces):
    citations = CitationFilter()
    for piece in pieces:
        if clean := citations.feed(piece):
            yield clean
    if rest := citations.flush():
        yield rest


async def _astrip_stream(pieces):
    citations = CitationFilter()
    async for piece in pieces:
        if clean := citations.feed(piece):
            yield clean
    if rest := citations.flush():
        yield rest


def group_sources(chunks, cited: list[int]) -> list[dict]:
    """The cited chunks (1-based numbers) as one entry per brochure, in the order
    the answer first cites each, with its pages sorted and deduplicated:
    [{"document_id", "filename", "pages": [4, 7]}, ...]."""
    groups: dict[str, dict] = {}
    for n in cited:
        meta = chunks[n - 1].metadata
        group = groups.setdefault(
            meta["document_id"],
            {
                "document_id": meta["document_id"],
                "filename": meta.get("filename") or meta.get("source", "Unknown"),
                "pages": [],
            },
        )
        if (page := meta.get("page")) is not None and page not in group["pages"]:
            group["pages"].append(page)
    for group in groups.values():
        group["pages"].sort()
    return list(groups.values())

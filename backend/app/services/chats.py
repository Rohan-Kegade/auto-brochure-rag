import asyncio
import logging
from collections.abc import AsyncIterator
from datetime import timedelta

from app.core.config import HISTORY_LIMIT, MAX_PDFS
from app.core.errors import DomainError, NotFoundError
from app.db.models import (
    DEFAULT_CHAT_TITLE,
    DOC_READY,
    ROLE_AI,
    ROLE_USER,
    Chat,
    ChatDocument,
    Document,
    Message,
    _now,
)
from app.services import vectorstore
from app.services.rag import (
    build_rag_chain_from_retriever,
    generate_chat_title,
    parse_chat_history,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

MAX_TITLE_LENGTH = 40

logger = logging.getLogger(__name__)


async def list_chats(db: AsyncSession) -> list[Chat]:
    result = await db.execute(select(Chat).order_by(Chat.updated_at.desc()))
    return list(result.scalars())


async def get_chat(db: AsyncSession, chat_id: str) -> Chat | None:
    return await db.get(Chat, chat_id)


async def create_chat(db: AsyncSession, title: str | None = None) -> Chat:
    chat = Chat(title=(title or "").strip() or DEFAULT_CHAT_TITLE)
    db.add(chat)
    await db.commit()
    return chat


async def rename_chat(db: AsyncSession, chat: Chat, title: str) -> Chat:
    chat.title = title.strip()
    await db.commit()
    return chat


async def delete_chat(db: AsyncSession, chat: Chat) -> None:
    # Messages and chat_documents rows go with it via ON DELETE CASCADE.
    await db.delete(chat)
    await db.commit()


async def list_messages(db: AsyncSession, chat_id: str) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at, Message.id)
    )
    return list(result.scalars())


# --- attached documents -----------------------------------------------------


async def list_attached(db: AsyncSession, chat_id: str) -> list[Document]:
    result = await db.execute(
        select(Document)
        .join(ChatDocument, ChatDocument.document_id == Document.id)
        .where(ChatDocument.chat_id == chat_id)
        .order_by(ChatDocument.attached_at, Document.id)
    )
    return list(result.scalars())


async def attach_documents(
    db: AsyncSession, chat: Chat, document_ids: list[str]
) -> list[Document]:
    """Attach library documents to a chat. Already-attached ones are ignored.
    Returns the chat's full list of attached documents."""
    ids = list(dict.fromkeys(document_ids))
    found = {
        doc.id: doc
        for doc in (
            await db.execute(select(Document).where(Document.id.in_(ids)))
        ).scalars()
    }
    missing = [i for i in ids if i not in found]
    if missing:
        raise NotFoundError(f"Document not found: {missing[0]}")
    not_ready = [d.filename for d in found.values() if d.status != DOC_READY]
    if not_ready:
        raise DomainError(f"Document is not ready yet: {not_ready[0]}")

    attached_ids = set(
        (
            await db.execute(
                select(ChatDocument.document_id).where(ChatDocument.chat_id == chat.id)
            )
        ).scalars()
    )
    new_ids = [i for i in ids if i not in attached_ids]
    if len(attached_ids) + len(new_ids) > MAX_PDFS:
        remaining = MAX_PDFS - len(attached_ids)
        raise DomainError(
            f"A chat can have at most {MAX_PDFS} PDFs. You can add {remaining} more."
        )

    for doc_id in new_ids:
        db.add(ChatDocument(chat_id=chat.id, document_id=doc_id))
    await db.commit()
    return await list_attached(db, chat.id)


async def detach_document(db: AsyncSession, chat: Chat, document_id: str) -> None:
    link = await db.get(ChatDocument, (chat.id, document_id))
    if link is None:
        raise NotFoundError("That document is not attached to this chat.")
    await db.delete(link)
    await db.commit()


# --- asking questions -------------------------------------------------------


def _title_from(text: str) -> str:
    text = " ".join(text.split())
    if len(text) <= MAX_TITLE_LENGTH:
        return text
    return f"{text[:MAX_TITLE_LENGTH].rstrip()}…"


async def _llm_title(question: str, answer: str, filenames: list[str]) -> str:
    """LLM-written title, falling back to the question's first words."""
    try:
        title = " ".join(
            (await asyncio.to_thread(generate_chat_title, question, answer, filenames))
            .strip()
            .strip("\"'`*# ")
            .split()
        )
    except Exception:
        logger.warning("Chat title generation failed", exc_info=True)
        title = ""
    return title[:MAX_TITLE_LENGTH].rstrip() or _title_from(question)


async def _prepare_answer(db: AsyncSession, chat: Chat, question: str):
    """Everything needed to answer `question`: the RAG chain, its input and the
    chat's attached documents."""
    attached = await list_attached(db, chat.id)
    document_ids = [d.id for d in attached]
    if not document_ids:
        raise DomainError("Please add at least one brochure to this chat first.")

    recent = (
        await db.execute(
            select(Message)
            .where(Message.chat_id == chat.id)
            .order_by(Message.created_at.desc(), Message.id)
            .limit(HISTORY_LIMIT)
        )
    ).scalars()
    history = parse_chat_history(
        [{"role": m.role, "content": m.content} for m in reversed(list(recent))]
    )

    chain = build_rag_chain_from_retriever(vectorstore.get_retriever(document_ids))
    return chain, {"input": question, "chat_history": history}, attached


async def _save_exchange(
    db: AsyncSession,
    chat: Chat,
    question: str,
    answer: str,
    attached: list[Document],
) -> tuple[Message, Message]:
    now = _now()
    user_msg = Message(chat_id=chat.id, role=ROLE_USER, content=question, created_at=now)
    ai_msg = Message(
        chat_id=chat.id,
        role=ROLE_AI,
        content=answer,
        # Clocks can be coarse; force the answer strictly after the question.
        created_at=now + timedelta(microseconds=1),
    )
    db.add_all([user_msg, ai_msg])
    if chat.title == DEFAULT_CHAT_TITLE:
        chat.title = await _llm_title(question, answer, [d.filename for d in attached])
    chat.updated_at = _now()
    await db.commit()
    return user_msg, ai_msg


async def send_message(
    db: AsyncSession, chat: Chat, question: str
) -> tuple[Message, Message]:
    """Answer `question` from the chat's attached documents and persist both
    messages. If answering fails nothing is saved, so the client can retry."""
    chain, chain_input, attached = await _prepare_answer(db, chat, question)
    answer = await asyncio.to_thread(chain.invoke, chain_input)
    return await _save_exchange(db, chat, question, answer, attached)


async def ensure_can_answer(db: AsyncSession, chat: Chat) -> None:
    if not await list_attached(db, chat.id):
        raise DomainError("Please add at least one brochure to this chat first.")


async def stream_message(
    db: AsyncSession, chat: Chat, question: str
) -> AsyncIterator[str | tuple[Message, Message]]:
    """Like `send_message`, but yields the answer's text chunks as they arrive,
    then finally the saved (user, ai) messages. Nothing is saved if it fails."""
    chain, chain_input, attached = await _prepare_answer(db, chat, question)
    parts: list[str] = []
    async for chunk in chain.astream(chain_input):
        if chunk:
            parts.append(chunk)
            yield chunk
    answer = "".join(parts).strip()
    if not answer:
        raise DomainError("The model returned an empty answer. Please try again.")
    yield await _save_exchange(db, chat, question, answer, attached)

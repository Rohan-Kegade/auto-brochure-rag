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
from app.rag.retrieval import build_retrieval_chain
from app.services.titles import make_chat_title, title_from_question
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


# Every lookup by id is scoped to the user, so another user's chat is
# indistinguishable from one that does not exist.


async def list_chats(db: AsyncSession, user_id: str) -> list[Chat]:
    result = await db.execute(
        select(Chat).where(Chat.user_id == user_id).order_by(Chat.updated_at.desc())
    )
    return list(result.scalars())


async def get_chat(db: AsyncSession, user_id: str, chat_id: str) -> Chat | None:
    return await db.scalar(
        select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id)
    )


async def create_chat(
    db: AsyncSession, user_id: str, title: str | None = None
) -> Chat:
    chat = Chat(user_id=user_id, title=(title or "").strip() or DEFAULT_CHAT_TITLE)
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
    """Attach documents from the chat owner's library to a chat. Already-attached
    ones are ignored. Returns the chat's full list of attached documents."""
    ids = list(dict.fromkeys(document_ids))
    found = {
        doc.id: doc
        for doc in (
            await db.execute(
                select(Document).where(
                    Document.id.in_(ids), Document.user_id == chat.user_id
                )
            )
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


def _to_langchain_messages(messages: list[Message]) -> list[BaseMessage]:
    """Turn saved messages into the message objects LangChain prompts expect."""
    result = []
    for msg in messages:
        if msg.role == ROLE_USER:
            result.append(HumanMessage(content=msg.content))
        elif msg.role == ROLE_AI:
            result.append(AIMessage(content=msg.content))
    return result


def _answered_only(messages: list[Message]) -> list[Message]:
    """Drop questions that never got an answer (their answer failed), so the
    model sees clean question/answer pairs."""
    return [
        msg
        for i, msg in enumerate(messages)
        if msg.role != ROLE_USER
        or (i + 1 < len(messages) and messages[i + 1].role == ROLE_AI)
    ]


async def _prepare_answer(db: AsyncSession, chat: Chat, question: Message):
    """Everything needed to answer `question`: the retrieval chain, its input and the
    chat's attached documents."""
    attached = await list_attached(db, chat.id)
    document_ids = [d.id for d in attached]
    if not document_ids:
        raise DomainError("Please add at least one brochure to this chat first.")

    recent = (
        await db.execute(
            select(Message)
            .where(Message.chat_id == chat.id, Message.id != question.id)
            .order_by(Message.created_at.desc(), Message.id)
            .limit(HISTORY_LIMIT)
        )
    ).scalars()
    history = _to_langchain_messages(_answered_only(list(recent)[::-1]))

    chain = build_retrieval_chain(document_ids)
    return chain, {"input": question.content, "chat_history": history}, attached


async def save_question(db: AsyncSession, chat: Chat, question: str) -> Message:
    """Save the question before answering it, so it (and the chat's interim title)
    survive a failed answer and can be retried."""
    msg = Message(chat_id=chat.id, role=ROLE_USER, content=question, created_at=_now())
    db.add(msg)
    if chat.title == DEFAULT_CHAT_TITLE:
        chat.title = title_from_question(question)
    chat.updated_at = _now()
    await db.commit()
    return msg


async def unanswered_question(db: AsyncSession, chat: Chat) -> Message | None:
    """The chat's latest message if it is a question still waiting for an answer."""
    last = (
        await db.execute(
            select(Message)
            .where(Message.chat_id == chat.id)
            .order_by(Message.created_at.desc(), Message.id.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return last if last is not None and last.role == ROLE_USER else None


async def _has_interim_title(db: AsyncSession, chat: Chat) -> bool:
    """True until the chat's first answer: its title is still the one taken from
    its first question, waiting to be replaced by an LLM-written one."""
    messages = await list_messages(db, chat.id)
    if any(m.role == ROLE_AI for m in messages):
        return False
    first = next((m for m in messages if m.role == ROLE_USER), None)
    return first is not None and chat.title == title_from_question(first.content)


async def _save_answer(
    db: AsyncSession,
    chat: Chat,
    question: Message,
    answer: str,
    attached: list[Document],
) -> Message:
    if await _has_interim_title(db, chat):
        chat.title = await make_chat_title(
            question.content, answer, [d.filename for d in attached]
        )
    ai_msg = Message(
        chat_id=chat.id,
        role=ROLE_AI,
        content=answer,
        # Clocks can be coarse; force the answer strictly after the question.
        created_at=max(_now(), question.created_at + timedelta(microseconds=1)),
    )
    db.add(ai_msg)
    chat.updated_at = _now()
    await db.commit()
    return ai_msg


async def ensure_can_answer(db: AsyncSession, chat: Chat) -> None:
    if not await list_attached(db, chat.id):
        raise DomainError("Please add at least one brochure to this chat first.")


async def stream_answer(
    db: AsyncSession, chat: Chat, question: Message
) -> AsyncIterator[str | Message]:
    """Answer a saved `question` from the chat's attached documents. Yields the
    answer's text chunks as they arrive, then finally the saved answer. Nothing
    more is saved if it fails, so the question can be retried."""
    chain, chain_input, attached = await _prepare_answer(db, chat, question)
    parts: list[str] = []
    async for chunk in chain.astream(chain_input):
        if chunk:
            parts.append(chunk)
            yield chunk
    answer = "".join(parts).strip()
    if not answer:
        raise DomainError("The model returned an empty answer. Please try again.")
    yield await _save_answer(db, chat, question, answer, attached)

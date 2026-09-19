from app.db.models import DEFAULT_CHAT_TITLE, Chat, Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


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

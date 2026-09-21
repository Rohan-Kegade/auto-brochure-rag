import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CHAR,
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.mysql import DATETIME as MYSQL_DATETIME
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass


DOC_PROCESSING = "processing"
DOC_READY = "ready"
DOC_FAILED = "failed"
DEFAULT_CHAT_TITLE = "New chat"
ROLE_USER = "user"
ROLE_AI = "ai"


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    """Naive UTC timestamp (MySQL DATETIME has no timezone)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Chat(Base):
    __tablename__ = "chats"
    __table_args__ = (Index("ix_chats_updated_at", "updated_at"),)

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255), default=DEFAULT_CHAT_TITLE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_now, onupdate=_now
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="chat",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Message.created_at",
    )
    attachments: Mapped[list["ChatDocument"]] = relationship(
        back_populates="chat", cascade="all, delete-orphan", passive_deletes=True
    )


class Document(Base):
    """A PDF in the shared library. Vectors live in Qdrant under this id."""

    __tablename__ = "documents"
    __table_args__ = (
        UniqueConstraint("content_hash", name="uq_documents_content_hash"),
        Index("ix_documents_filename", "filename"),
    )

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(255))
    content_hash: Mapped[str] = mapped_column(CHAR(64))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default=DOC_PROCESSING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    attachments: Mapped[list["ChatDocument"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", passive_deletes=True
    )


class ChatDocument(Base):
    """Association: a document attached to a chat (an 'active PDF')."""

    __tablename__ = "chat_documents"

    chat_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True
    )
    document_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True
    )
    attached_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    chat: Mapped[Chat] = relationship(back_populates="attachments")
    document: Mapped[Document] = relationship(back_populates="attachments")


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_chat_created", "chat_id", "created_at"),)

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=_uuid)
    chat_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("chats.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(String(8))
    content: Mapped[str] = mapped_column(Text)
    # Microsecond precision so a question and its answer keep their order.
    created_at: Mapped[datetime] = mapped_column(MYSQL_DATETIME(fsp=6), default=_now)

    chat: Mapped[Chat] = relationship(back_populates="messages")

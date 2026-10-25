"""initial schema: chats, documents, chat_documents, messages

Revision ID: 0001
Revises:
Create Date: 2026-09-19
"""
import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chats",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_chats_updated_at", "chats", ["updated_at"])

    op.create_table(
        "documents",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_hash", sa.CHAR(64), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("chunk_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("content_hash", name="uq_documents_content_hash"),
    )
    op.create_index("ix_documents_filename", "documents", ["filename"])

    op.create_table(
        "chat_documents",
        sa.Column(
            "chat_id",
            sa.CHAR(36),
            sa.ForeignKey("chats.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "document_id",
            sa.CHAR(36),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("attached_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column(
            "chat_id",
            sa.CHAR(36),
            sa.ForeignKey("chats.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(8), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_messages_chat_created", "messages", ["chat_id", "created_at"])


def downgrade() -> None:
    op.drop_table("messages")
    op.drop_table("chat_documents")
    op.drop_table("documents")
    op.drop_table("chats")

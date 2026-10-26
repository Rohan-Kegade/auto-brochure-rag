"""users and sessions; every chat and document belongs to a user

Chats and documents that already exist are given to a placeholder user that
cannot log in (LEGACY_EMAIL). Move them to a real account with
`python -m scripts.claim_legacy_data you@example.com`.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-26
"""
import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

LEGACY_EMAIL = "legacy@specsense.invalid"


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "sessions",
        sa.Column("token_hash", sa.CHAR(64), primary_key=True),
        sa.Column(
            "user_id",
            sa.CHAR(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])

    op.add_column("chats", sa.Column("user_id", sa.CHAR(36), nullable=True))
    op.add_column("documents", sa.Column("user_id", sa.CHAR(36), nullable=True))

    conn = op.get_bind()
    has_rows = conn.execute(
        sa.text("SELECT EXISTS(SELECT 1 FROM chats) OR EXISTS(SELECT 1 FROM documents)")
    ).scalar()
    if has_rows:
        legacy_id = str(uuid.uuid4())
        conn.execute(
            sa.text(
                "INSERT INTO users (id, email, name, password_hash, created_at) "
                "VALUES (:id, :email, 'Legacy data', '!', :now)"
            ),
            {
                "id": legacy_id,
                "email": LEGACY_EMAIL,
                "now": datetime.now(timezone.utc).replace(tzinfo=None),
            },
        )
        conn.execute(sa.text("UPDATE chats SET user_id = :id"), {"id": legacy_id})
        conn.execute(sa.text("UPDATE documents SET user_id = :id"), {"id": legacy_id})

    for table in ("chats", "documents"):
        op.alter_column(table, "user_id", existing_type=sa.CHAR(36), nullable=False)

    # Indexes before foreign keys, so MySQL uses these for the keys instead of
    # adding its own.
    op.drop_index("ix_chats_updated_at", table_name="chats")
    op.create_index("ix_chats_user_updated", "chats", ["user_id", "updated_at"])

    # Duplicate uploads are now detected per user, not across everyone.
    op.drop_constraint("uq_documents_content_hash", "documents", type_="unique")
    op.create_unique_constraint(
        "uq_documents_user_content_hash", "documents", ["user_id", "content_hash"]
    )
    op.drop_index("ix_documents_filename", table_name="documents")
    op.create_index("ix_documents_user_filename", "documents", ["user_id", "filename"])

    for table in ("chats", "documents"):
        op.create_foreign_key(
            f"fk_{table}_user_id", table, "users", ["user_id"], ["id"], ondelete="CASCADE"
        )


def downgrade() -> None:
    for table in ("chats", "documents"):
        op.drop_constraint(f"fk_{table}_user_id", table, type_="foreignkey")

    # Fails if two users uploaded the same file: the old schema allowed only one.
    op.drop_index("ix_documents_user_filename", table_name="documents")
    op.create_index("ix_documents_filename", "documents", ["filename"])
    op.drop_constraint("uq_documents_user_content_hash", "documents", type_="unique")
    op.create_unique_constraint(
        "uq_documents_content_hash", "documents", ["content_hash"]
    )

    op.drop_index("ix_chats_user_updated", table_name="chats")
    op.create_index("ix_chats_updated_at", "chats", ["updated_at"])

    for table in ("chats", "documents"):
        op.drop_column(table, "user_id")

    op.drop_table("sessions")
    op.drop_table("users")

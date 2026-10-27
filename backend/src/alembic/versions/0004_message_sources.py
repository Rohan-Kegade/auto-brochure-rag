"""messages.sources: the brochures and pages an answer cites

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-27
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Null for questions and for answers saved before citations existed.
    op.add_column("messages", sa.Column("sources", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "sources")

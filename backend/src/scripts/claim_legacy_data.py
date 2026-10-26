"""Give the chats and documents from before accounts existed to a real account.

Migration 0003 parked them on a placeholder user that cannot log in. Sign up in
the app first, then (from backend/src/):

    python -m scripts.claim_legacy_data you@example.com

The vectors in Qdrant are keyed by document id, so they need no change.
"""

import asyncio
import sys

from app.db.models import Chat, Document, User
from app.db.session import SessionLocal, engine
from app.services.auth import normalize_email
from sqlalchemy import select, update

LEGACY_EMAIL = "legacy@specsense.invalid"  # as in alembic/versions/0003_users.py


async def main(email: str) -> None:
    try:
        await claim(email)
    finally:
        await engine.dispose()


async def claim(email: str) -> None:
    async with SessionLocal() as db:
        legacy = await db.scalar(select(User).where(User.email == LEGACY_EMAIL))
        if legacy is None:
            raise SystemExit("There is no legacy data to claim.")
        target = await db.scalar(select(User).where(User.email == normalize_email(email)))
        if target is None:
            raise SystemExit(f"No account for {email}. Sign up in the app first.")

        # A user can hold each file only once.
        clashes = (
            await db.execute(
                select(Document.filename).where(
                    Document.user_id == legacy.id,
                    Document.content_hash.in_(
                        select(Document.content_hash).where(Document.user_id == target.id)
                    ),
                )
            )
        ).scalars().all()
        if clashes:
            raise SystemExit(
                f"{email} already has these brochures: {', '.join(clashes)}. "
                "Delete them from that account, then run this again."
            )

        chats = await db.execute(
            update(Chat).where(Chat.user_id == legacy.id).values(user_id=target.id)
        )
        docs = await db.execute(
            update(Document).where(Document.user_id == legacy.id).values(user_id=target.id)
        )
        await db.delete(legacy)
        await db.commit()
    print(f"Moved {chats.rowcount} chats and {docs.rowcount} documents to {email}.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m scripts.claim_legacy_data you@example.com")
    asyncio.run(main(sys.argv[1]))

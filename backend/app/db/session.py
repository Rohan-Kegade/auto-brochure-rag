from collections.abc import AsyncIterator

from app.core.config import DATABASE_URL
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Add it to backend/.env (see backend/.env.sample)."
    )

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one session per request."""
    async with SessionLocal() as session:
        yield session

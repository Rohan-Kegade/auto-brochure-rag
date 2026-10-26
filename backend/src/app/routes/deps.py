"""FastAPI dependencies shared by the routers."""

from app.db.models import User
from app.db.session import get_db
from app.services import auth as auth_service
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

# auto_error=False so a missing token gets the same 401 as a bad one.
bearer = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Please log in to continue.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credentials is None:
        raise _unauthorized()
    return credentials.credentials


async def get_current_user(
    token: str = Depends(get_token), db: AsyncSession = Depends(get_db)
) -> User:
    """FastAPI dependency for every route that touches a user's data."""
    user = await auth_service.user_for_token(db, token)
    if user is None:
        raise _unauthorized()
    return user

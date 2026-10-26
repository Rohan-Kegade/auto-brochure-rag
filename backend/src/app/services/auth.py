"""Accounts and logins.

Passwords are hashed with scrypt (stdlib, so no compiled dependency). A login
creates a random session token: the client keeps it and sends it as a Bearer
token, the database keeps only its SHA-256, so a leaked database cannot be
used to log in.
"""

import asyncio
import hashlib
import hmac
import secrets
from datetime import timedelta

from app.core.config import SESSION_TTL_DAYS
from app.core.errors import ConflictError, DomainError, UnauthorizedError
from app.db.models import AuthSession, Document, User, _now
from app.rag import indexing
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

# scrypt cost parameters (~16 MB of memory, tens of ms per hash).
_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_SALT_BYTES = 16

INVALID_LOGIN = "Incorrect email or password."
# A 400, not a 401: the session is fine, and the client treats a 401 as logged out.
WRONG_PASSWORD = "Your current password is incorrect."


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p, dklen=32)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(_SALT_BYTES)
    digest = _scrypt(password, salt, _SCRYPT_N, _SCRYPT_R, _SCRYPT_P)
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, digest = stored.split("$")
    except ValueError:
        return False  # e.g. the "!" of an account that cannot log in
    if scheme != "scrypt":
        return False
    actual = _scrypt(password, bytes.fromhex(salt), int(n), int(r), int(p))
    return hmac.compare_digest(actual, bytes.fromhex(digest))


# Compared against when the email is unknown, so a login takes as long whether
# or not the account exists.
_DUMMY_HASH = hash_password(secrets.token_hex(16))


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def _start_session(db: AsyncSession, user: User) -> str:
    token = secrets.token_urlsafe(32)
    now = _now()
    db.add(
        AuthSession(
            token_hash=_hash_token(token),
            user_id=user.id,
            created_at=now,
            expires_at=now + timedelta(days=SESSION_TTL_DAYS),
        )
    )
    await db.commit()
    return token


async def sign_up(
    db: AsyncSession, name: str, email: str, password: str
) -> tuple[User, str]:
    """Create an account and log it in. Returns (user, session token)."""
    email = normalize_email(email)
    if await db.scalar(select(User.id).where(User.email == email)):
        raise ConflictError("An account with this email already exists.")
    password_hash = await asyncio.to_thread(hash_password, password)
    user = User(name=name.strip(), email=email, password_hash=password_hash)
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        # Lost a race with another sign-up for the same email.
        await db.rollback()
        raise ConflictError("An account with this email already exists.")
    return user, await _start_session(db, user)


async def log_in(db: AsyncSession, email: str, password: str) -> tuple[User, str]:
    """Check the credentials and start a session. Returns (user, session token)."""
    user = await db.scalar(select(User).where(User.email == normalize_email(email)))
    stored = user.password_hash if user is not None else _DUMMY_HASH
    valid = await asyncio.to_thread(verify_password, password, stored)
    if user is None or not valid:
        raise UnauthorizedError(INVALID_LOGIN)
    # Housekeeping: drop this user's expired sessions.
    await db.execute(
        delete(AuthSession).where(
            AuthSession.user_id == user.id, AuthSession.expires_at <= _now()
        )
    )
    return user, await _start_session(db, user)


async def user_for_token(db: AsyncSession, token: str) -> User | None:
    """The user a live session token belongs to, or None."""
    session = await db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == _hash_token(token),
            AuthSession.expires_at > _now(),
        )
    )
    if session is None:
        return None
    return await db.get(User, session.user_id)


async def log_out(db: AsyncSession, token: str) -> None:
    await db.execute(
        delete(AuthSession).where(AuthSession.token_hash == _hash_token(token))
    )
    await db.commit()


async def _check_password(user: User, password: str) -> None:
    if not await asyncio.to_thread(verify_password, password, user.password_hash):
        raise DomainError(WRONG_PASSWORD)


async def update_name(db: AsyncSession, user: User, name: str) -> User:
    user.name = name.strip()
    await db.commit()
    return user


async def change_password(
    db: AsyncSession, user: User, current: str, new: str, token: str
) -> None:
    """Set a new password and log out every other session of this user."""
    await _check_password(user, current)
    if current == new:
        raise DomainError("Choose a password different from your current one.")
    user.password_hash = await asyncio.to_thread(hash_password, new)
    await db.execute(
        delete(AuthSession).where(
            AuthSession.user_id == user.id,
            AuthSession.token_hash != _hash_token(token),
        )
    )
    await db.commit()


async def delete_account(db: AsyncSession, user: User, password: str) -> None:
    """Delete the user with their chats, sessions, documents and vectors."""
    await _check_password(user, password)
    document_ids = (
        await db.scalars(select(Document.id).where(Document.user_id == user.id))
    ).all()
    # Vectors first: if this fails the account is kept, so the delete can be retried.
    for document_id in document_ids:
        await asyncio.to_thread(indexing.delete_document_chunks, document_id)
    await db.delete(user)  # everything else goes via ON DELETE CASCADE
    await db.commit()

from app.core.session_store import session_store
from fastapi import Header, HTTPException


def get_session(x_session_id: str = Header(..., alias="X-Session-ID")) -> dict:
    if not x_session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID header missing.")
    return session_store.get_or_create(x_session_id)

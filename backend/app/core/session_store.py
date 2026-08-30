import time
from collections import OrderedDict
from threading import Lock

from app.core.config import MAX_ACTIVE_SESSIONS, SESSION_TTL_SECONDS


class SessionStore:

    def __init__(
        self,
        ttl_seconds: int = SESSION_TTL_SECONDS,
        max_sessions: int = MAX_ACTIVE_SESSIONS,
    ):
        self._sessions: "OrderedDict[str, dict]" = OrderedDict()
        self._last_access: dict[str, float] = {}
        self._ttl_seconds = ttl_seconds
        self._max_sessions = max_sessions
        self._lock = Lock()

    def get_or_create(self, session_id: str) -> dict:
        if not session_id:
            raise ValueError("session_id must be a non-empty string.")

        with self._lock:
            self._evict_stale()

            if session_id not in self._sessions:
                self._sessions[session_id] = {
                    "vector_db": None,
                    "rag_chain": None,
                    "active_pdfs": set(),
                    "file_chunks": {},
                    "file_ids": {},
                }

            self._sessions.move_to_end(session_id)
            self._last_access[session_id] = time.monotonic()
            self._evict_overflow()
            return self._sessions[session_id]

    def clear_session(self, session_id: str) -> None:
        with self._lock:
            self._drop(session_id)

    def _drop(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)
        self._last_access.pop(session_id, None)

    def _evict_stale(self) -> None:
        cutoff = time.monotonic() - self._ttl_seconds
        stale = [sid for sid, seen in self._last_access.items() if seen < cutoff]
        for sid in stale:
            self._drop(sid)

    def _evict_overflow(self) -> None:
        while len(self._sessions) > self._max_sessions:
            oldest, _ = self._sessions.popitem(last=False)
            self._last_access.pop(oldest, None)


session_store = SessionStore()

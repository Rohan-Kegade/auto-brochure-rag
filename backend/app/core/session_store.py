from threading import Lock
from typing import Dict


class SessionStore:

    def __init__(self):
        self._sessions: Dict[str, dict] = {}
        self._lock = Lock()

    def get_or_create(self, session_id: str) -> dict:
        if not session_id:
            raise ValueError("session_id must be a non-empty string.")

        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = {
                    "vector_db": None,
                    "rag_chain": None,
                    "active_pdfs": set(),
                    "file_chunks": {},
                }
            return self._sessions[session_id]

    def clear_session(self, session_id: str) -> None:
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]


session_store = SessionStore()

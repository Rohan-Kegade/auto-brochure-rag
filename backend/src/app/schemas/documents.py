"""Request and response bodies for the /documents routes."""

from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    size_bytes: int
    chunk_count: int
    status: str
    created_at: datetime
    attached: bool = False


class DocumentList(BaseModel):
    items: List[DocumentOut]
    total: int
    limit: int
    offset: int


class UploadItem(BaseModel):
    filename: str
    outcome: Literal["created", "existing", "failed"]
    document: DocumentOut | None = None
    error: str | None = None


class UploadResponse(BaseModel):
    results: List[UploadItem]

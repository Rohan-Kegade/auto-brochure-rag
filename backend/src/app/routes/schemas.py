from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatCreate(BaseModel):
    title: str | None = Field(default=None, max_length=255)


class ChatUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class ChatOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: Literal["user", "ai"]
    content: str
    created_at: datetime


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


class AttachRequest(BaseModel):
    document_ids: List[str] = Field(min_length=1)


class SendMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)

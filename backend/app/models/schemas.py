from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "ai"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    query: str
    answer: str


class UploadResponse(BaseModel):
    status: str
    uploaded: List[str]
    active_pdf_count: int
    active_pdfs: List[str]


class DocumentsResponse(BaseModel):
    active_pdf_count: int
    active_pdfs: List[str]
    indexed_files: List[str]
    max_pdfs: int
    max_file_size_mb: int


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

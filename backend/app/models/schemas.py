from typing import List, Literal
from pydantic import BaseModel, Field


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

from typing import List, Optional
from pydantic import BaseModel


class ChatMessage(BaseModel):
  role: Optional[str] = None
  sender: Optional[str] = None
  content: Optional[str] = None
  text: Optional[str] = None


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
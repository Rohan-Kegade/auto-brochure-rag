"""Request and response bodies for the /chats routes."""

from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class SourceOut(BaseModel):
    """One brochure an answer cites, with the pages it cites from it."""

    document_id: str
    filename: str
    pages: List[int]


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: Literal["user", "ai"]
    content: str
    created_at: datetime
    # Answers only; empty when the answer cites nothing (or predates citations).
    sources: List[SourceOut] = []

    @field_validator("sources", mode="before")
    @classmethod
    def _none_as_empty(cls, value):
        return value or []


class AttachRequest(BaseModel):
    document_ids: List[str] = Field(min_length=1)


class SendMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class RetryRequest(BaseModel):
    # The question (or answer) to answer again; omitted, the latest unanswered question.
    message_id: str | None = None

"""Request and response bodies for the /chats routes."""

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


class AttachRequest(BaseModel):
    document_ids: List[str] = Field(min_length=1)


class SendMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)

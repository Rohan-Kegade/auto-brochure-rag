from typing import List

from app.db.models import Chat
from app.db.session import get_db
from app.models.schemas import ChatCreate, ChatOut, ChatUpdate, MessageOut
from app.services import chats as chat_service
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/chats", tags=["chats"])


async def get_chat_or_404(chat_id: str, db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await chat_service.get_chat(db, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found.")
    return chat


@router.get("", response_model=List[ChatOut])
async def list_chats(db: AsyncSession = Depends(get_db)):
    return await chat_service.list_chats(db)


@router.post("", response_model=ChatOut, status_code=201)
async def create_chat(body: ChatCreate, db: AsyncSession = Depends(get_db)):
    return await chat_service.create_chat(db, body.title)


@router.patch("/{chat_id}", response_model=ChatOut)
async def rename_chat(
    body: ChatUpdate,
    chat: Chat = Depends(get_chat_or_404),
    db: AsyncSession = Depends(get_db),
):
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="Title cannot be blank.")
    return await chat_service.rename_chat(db, chat, body.title)


@router.delete("/{chat_id}", status_code=204)
async def delete_chat(
    chat: Chat = Depends(get_chat_or_404), db: AsyncSession = Depends(get_db)
):
    await chat_service.delete_chat(db, chat)
    return Response(status_code=204)


@router.get("/{chat_id}/messages", response_model=List[MessageOut])
async def list_messages(
    chat: Chat = Depends(get_chat_or_404), db: AsyncSession = Depends(get_db)
):
    return await chat_service.list_messages(db, chat.id)

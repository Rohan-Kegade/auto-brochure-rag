from typing import List

from app.db.models import Chat
from app.db.session import get_db
from app.models.schemas import (
    AttachRequest,
    ChatCreate,
    ChatOut,
    ChatUpdate,
    DocumentOut,
    MessageOut,
    SendMessageRequest,
    SendMessageResponse,
)
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


@router.post("/{chat_id}/messages", response_model=SendMessageResponse)
async def send_message(
    body: SendMessageRequest,
    chat: Chat = Depends(get_chat_or_404),
    db: AsyncSession = Depends(get_db),
):
    question = body.message.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Message cannot be blank.")
    user_msg, ai_msg = await chat_service.send_message(db, chat, question)
    return SendMessageResponse(
        user_message=MessageOut.model_validate(user_msg),
        ai_message=MessageOut.model_validate(ai_msg),
        title=chat.title,
    )


def _attached_out(docs) -> List[DocumentOut]:
    return [
        DocumentOut.model_validate(d).model_copy(update={"attached": True})
        for d in docs
    ]


@router.get("/{chat_id}/documents", response_model=List[DocumentOut])
async def list_chat_documents(
    chat: Chat = Depends(get_chat_or_404), db: AsyncSession = Depends(get_db)
):
    return _attached_out(await chat_service.list_attached(db, chat.id))


@router.post("/{chat_id}/documents", response_model=List[DocumentOut])
async def attach_documents(
    body: AttachRequest,
    chat: Chat = Depends(get_chat_or_404),
    db: AsyncSession = Depends(get_db),
):
    return _attached_out(
        await chat_service.attach_documents(db, chat, body.document_ids)
    )


@router.delete("/{chat_id}/documents/{document_id}", status_code=204)
async def detach_document(
    document_id: str,
    chat: Chat = Depends(get_chat_or_404),
    db: AsyncSession = Depends(get_db),
):
    await chat_service.detach_document(db, chat, document_id)
    return Response(status_code=204)

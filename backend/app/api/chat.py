from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.auth import verify_token
from app.models.chat import ChatMessage
import uuid

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessageCreate(BaseModel):
    channel: str
    content: str
    metadata: dict = {}

class ChatMessageResponse(BaseModel):
    id: str
    channel: str
    sender: str
    content: str
    timestamp: datetime
    metadata: dict
    
    class Config:
        from_attributes = True

@router.get("/channels", response_model=List[str])
async def list_channels(db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(ChatMessage.channel).distinct())
    return [row[0] for row in result.all()]

@router.get("/channels/{channel}/messages", response_model=List[ChatMessageResponse])
async def get_messages(channel: str, limit: int = 50, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.channel == channel)
        .order_by(desc(ChatMessage.timestamp))
        .limit(limit)
    )
    return list(reversed(result.scalars().all()))

@router.post("/channels/{channel}/messages", response_model=ChatMessageResponse)
async def send_message(channel: str, msg: ChatMessageCreate, sender: str = "user", db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    db_msg = ChatMessage(
        id=str(uuid.uuid4()),
        channel=channel,
        sender=sender,
        content=msg.content,
        metadata=msg.extra
    )
    db.add(db_msg)
    await db.commit()
    await db.refresh(db_msg)
    return db_msg

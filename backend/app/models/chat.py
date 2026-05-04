from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON
from app.core.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True)
    channel = Column(String, nullable=False, index=True)
    sender = Column(String, nullable=False)
    content = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    extra = Column("metadata", JSON, default=dict)

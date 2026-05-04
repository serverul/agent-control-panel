from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON
from app.core.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True)
    channel = Column(String, nullable=False, index=True)  # general, project:hartagis, dm:hermes:openclaw
    sender = Column(String, nullable=False)  # agent_id or "user"
    content = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    metadata = Column(JSON, default=dict)

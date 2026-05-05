from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, Enum as SQLEnum
from app.core.database import Base
import enum

class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    IDLE = "idle"
    ERROR = "error"
    OFFLINE = "offline"

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # hermes, openclaw, custom
    status = Column(SQLEnum(AgentStatus), default=AgentStatus.OFFLINE)
    model = Column(String, default="")
    provider = Column(String, default="")
    current_task = Column(String, nullable=True)
    current_project = Column(String, nullable=True)
    pending_query = Column(String, nullable=True)
    query_response = Column(String, nullable=True)
    last_activity = Column(DateTime, default=datetime.utcnow)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    config = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

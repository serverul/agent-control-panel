from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.core.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(String, primary_key=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    action = Column(String, nullable=False)
    details = Column(String, nullable=False)
    project_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.core.database import Base

class AgentProject(Base):
    __tablename__ = "agent_projects"
    
    id = Column(String, primary_key=True)
    agent_id = Column(String, nullable=False)
    project_id = Column(String, nullable=False)
    role = Column(String, nullable=False)  # owner, contributor, viewer
    status = Column(String, nullable=False)  # active, paused, completed
    joined_at = Column(DateTime, default=datetime.utcnow)

from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, default="active")  # active, paused, completed, planned
    description = Column(String, default="")
    agents = Column(JSON, default=list)  # list of agent IDs
    milestones = Column(JSON, default=list)
    notes = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

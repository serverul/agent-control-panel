from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, JSON, ForeignKey
from app.core.database import Base

class CronJob(Base):
    __tablename__ = "cron_jobs"
    
    id = Column(String, primary_key=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    name = Column(String, nullable=False)
    schedule = Column(String, nullable=False)
    prompt = Column(String, default="")
    enabled = Column(Boolean, default=True)
    last_run = Column(DateTime, nullable=True)
    last_status = Column(String, nullable=True)  # ok, error, running
    run_history = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

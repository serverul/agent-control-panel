from datetime import datetime, date as date_type
from sqlalchemy import Column, String, DateTime, Integer, Float, Date
from app.core.database import Base

class AgentStats(Base):
    __tablename__ = "agent_stats"
    
    id = Column(String, primary_key=True)
    agent_id = Column(String, index=True)
    date = Column(Date, default=date_type.today)
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    requests = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    model = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

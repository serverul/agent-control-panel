from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.auth import verify_token
from app.models.agent import Agent, AgentStatus
import uuid

router = APIRouter(prefix="/api/agents", tags=["agents"], redirect_slashes=False)

class AgentCreate(BaseModel):
    name: str
    type: str
    model: str = ""
    provider: str = ""
    config: dict = {}

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    current_task: Optional[str] = None
    config: Optional[dict] = None

class AgentResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    model: str
    provider: str
    current_task: Optional[str]
    last_activity: datetime
    last_heartbeat: datetime
    config: dict
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Agent))
    return result.scalars().all()

@router.post("/", response_model=AgentResponse)
async def create_agent(agent: AgentCreate, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    db_agent = Agent(id=str(uuid.uuid4()), **agent.model_dump())
    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, update: AgentUpdate, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(agent, key, value)
    agent.last_activity = datetime.utcnow()
    await db.commit()
    await db.refresh(agent)
    return agent

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.delete(agent)
    await db.commit()
    return {"message": "Agent deleted"}

@router.post("/{agent_id}/heartbeat")
async def agent_heartbeat(agent_id: str, status: str = "active", current_task: str = None, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = status
    agent.last_heartbeat = datetime.utcnow()
    agent.last_activity = datetime.utcnow()
    if current_task:
        agent.current_task = current_task
    await db.commit()
    return {"message": "Heartbeat received"}

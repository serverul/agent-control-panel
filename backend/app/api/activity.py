from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.auth import verify_token
from app.models.activity_log import ActivityLog
import uuid

router = APIRouter(prefix="/api", tags=["activity"], redirect_slashes=False)

class ActivityLogCreate(BaseModel):
    action: str
    details: str
    project_id: Optional[str] = None

class ActivityLogResponse(BaseModel):
    id: str
    agent_id: str
    action: str
    details: str
    project_id: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/agents/{agent_id}/activity", response_model=List[ActivityLogResponse])
async def list_agent_activity(agent_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    # Resolve agent_id to real ID (supports both UUID and name)
    from sqlalchemy import or_
    from app.models.agent import Agent
    agent_result = await db.execute(select(Agent).where(or_(Agent.id == agent_id, Agent.name.ilike(agent_id))))
    agent = agent_result.scalar_one_or_none()
    real_agent_id = agent.id if agent else agent_id
    
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.agent_id == real_agent_id)
        .order_by(ActivityLog.created_at.desc())
    )
    return result.scalars().all()

@router.post("/agents/{agent_id}/activity", response_model=ActivityLogResponse)
async def create_agent_activity(
    agent_id: str,
    activity: ActivityLogCreate,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(verify_token)
):
    db_activity = ActivityLog(id=str(uuid.uuid4()), agent_id=agent_id, **activity.model_dump())
    db.add(db_activity)
    await db.commit()
    await db.refresh(db_activity)
    return db_activity

@router.get("/activity", response_model=List[ActivityLogResponse])
async def list_all_activity(
    agent_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(verify_token)
):
    stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc())
    if agent_id:
        stmt = stmt.where(ActivityLog.agent_id == agent_id)
    result = await db.execute(stmt)
    return result.scalars().all()

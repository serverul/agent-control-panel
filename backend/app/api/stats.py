from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import date, timedelta
from app.core.database import get_db
from app.core.auth import verify_token
from app.models.stats import AgentStats
from app.models.agent import Agent

router = APIRouter(prefix="/api/stats", tags=["stats"])

class OverviewResponse(BaseModel):
    total_agents: int
    active_agents: int
    total_tokens_today: int
    total_cost_today: float
    total_requests_today: int

@router.get("/overview", response_model=OverviewResponse)
async def get_overview(db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    today = date.today()
    
    agents_result = await db.execute(select(func.count(Agent.id)))
    total_agents = agents_result.scalar() or 0
    
    active_result = await db.execute(select(func.count(Agent.id)).where(Agent.status == "active"))
    active_agents = active_result.scalar() or 0
    
    stats_result = await db.execute(
        select(
            func.coalesce(func.sum(AgentStats.tokens_input), 0) + func.coalesce(func.sum(AgentStats.tokens_output), 0),
            func.coalesce(func.sum(AgentStats.cost_usd), 0),
            func.coalesce(func.sum(AgentStats.requests), 0)
        ).where(AgentStats.date == today)
    )
    row = stats_result.one()
    
    return OverviewResponse(
        total_agents=total_agents,
        active_agents=active_agents,
        total_tokens_today=row[0],
        total_cost_today=row[1],
        total_requests_today=row[2]
    )

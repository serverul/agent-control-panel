"""
ACP Onboarding API — Simple agent self-registration
Agents can onboard themselves with a single API call
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends
from app.core.database import get_db
from app.models.agent import Agent
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/onboard", tags=["onboarding"])

class OnboardRequest(BaseModel):
    """Agent onboarding request — minimal fields"""
    name: str
    type: str = "custom"
    model: str = ""
    provider: str = ""
    hostname: str = ""
    capabilities: list = []

class OnboardResponse(BaseModel):
    agent_id: str
    name: str
    status: str
    heartbeat_url: str
    dashboard_url: str

@router.post("", response_model=OnboardResponse)
async def onboard_agent(req: OnboardRequest, db: AsyncSession = Depends(get_db)):
    """
    Onboard an agent to ACP with a single call.
    No auth required for onboarding — agents self-register.
    
    Usage:
        curl -X POST http://46.225.101.15:3102/api/onboard \
          -H "Content-Type: application/json" \
          -d '{"name":"Hermes","type":"hermes","model":"claude-sonnet-4"}'
    """
    # Generate agent ID
    agent_id = f"{req.type}-{req.name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:8]}"
    
    # Check if agent already exists (by name + type)
    existing = await db.execute(
        select(Agent).where(Agent.name == req.name, Agent.type == req.type)
    )
    existing_agent = existing.scalar_one_or_none()
    
    if existing_agent:
        # Update existing agent
        existing_agent.last_heartbeat = datetime.utcnow()
        existing_agent.last_activity = datetime.utcnow()
        existing_agent.status = "active"
        if req.model:
            existing_agent.model = req.model
        if req.provider:
            existing_agent.provider = req.provider
        await db.commit()
        
        return OnboardResponse(
            agent_id=existing_agent.id,
            name=existing_agent.name,
            status="reconnected",
            heartbeat_url=f"/api/agents/{existing_agent.id}/heartbeat",
            dashboard_url=f"/agents/{existing_agent.id}"
        )
    
    # Create new agent
    agent = Agent(
        id=agent_id,
        name=req.name,
        type=req.type,
        status="active",
        model=req.model,
        provider=req.provider,
        config={
            "hostname": req.hostname,
            "capabilities": req.capabilities,
            "onboarded_at": datetime.utcnow().isoformat()
        }
    )
    db.add(agent)
    await db.commit()
    
    return OnboardResponse(
        agent_id=agent_id,
        name=req.name,
        status="connected",
        heartbeat_url=f"/api/agents/{agent_id}/heartbeat",
        dashboard_url=f"/agents/{agent_id}"
    )

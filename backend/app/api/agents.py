from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.auth import verify_token
from app.models.agent import Agent, AgentStatus
from app.models.agent_project import AgentProject
import uuid
from app.core.config import settings
from app.api.websocket import manager as ws_manager

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
    current_project: Optional[str] = None
    config: Optional[dict] = None

class AgentResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    model: str
    provider: str
    current_task: Optional[str]
    current_project: Optional[str]
    pending_query: Optional[str] = None
    query_response: Optional[str] = None
    last_activity: datetime
    last_heartbeat: datetime
    config: dict
    created_at: datetime
    
    class Config:
        from_attributes = True

class AgentProjectCreate(BaseModel):
    project_id: str
    role: str = "contributor"
    status: str = "active"

class AgentProjectResponse(BaseModel):
    id: str
    agent_id: str
    project_id: str
    role: str
    status: str
    joined_at: datetime
    
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

class AgentPulse(BaseModel):
    model: Optional[str] = None
    provider: Optional[str] = None
    current_task: Optional[str] = None
    current_project: Optional[str] = None
    activity: Optional[str] = None  # e.g., "debugging heartbeat", "deploying backend"
    status: Optional[str] = "active"

@router.post("/{agent_id}/heartbeat", response_model=AgentResponse)
async def agent_heartbeat(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(verify_token)
):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.last_heartbeat = datetime.utcnow()
    agent.status = "active"
    await db.commit()
    await db.refresh(agent)
    
    # ✅ Broadcast to websocket
    await ws_manager.broadcast_to_agent(agent.id, {
        "type": "heartbeat",
        "agent_id": agent.id,
        "name": agent.name,
        "status": agent.status,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return agent

@router.post("/{agent_id}/pulse")
async def agent_pulse(
    agent_id: str,
    pulse: AgentPulse,
    x_pulse_key: str = Header(default="", alias="X-Pulse-Key"),
    db: AsyncSession = Depends(get_db)
):
    """Real-time pulse from the agent session itself. Updates model, task, activity."""
    # API key check if configured
    if settings.PULSE_API_KEY and x_pulse_key != settings.PULSE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid pulse key")
    
    from sqlalchemy import or_
    result = await db.execute(select(Agent).where(or_(Agent.id == agent_id, Agent.name.ilike(agent_id))))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Update agent state with real-time data from the session
    if pulse.model is not None:
        agent.model = pulse.model
    if pulse.provider is not None:
        agent.provider = pulse.provider
    if pulse.current_task is not None:
        agent.current_task = pulse.current_task
    if pulse.current_project is not None:
        agent.current_project = pulse.current_project
    if pulse.status is not None:
        agent.status = pulse.status
    agent.last_activity = datetime.utcnow()
    agent.last_heartbeat = datetime.utcnow()
    
    # Also log activity if provided
    if pulse.activity:
        from app.models.activity_log import ActivityLog
        db_activity = ActivityLog(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            action="session_activity",
            details=pulse.activity,
            project_id=None,
            created_at=datetime.utcnow()
        )
        db.add(db_activity)
    
    # ✅ Auto-create project if it doesn't exist and link agent
    if pulse.current_project:
        from app.models.project import Project
        from app.models.agent_project import AgentProject
        
        # Check if project exists
        proj_result = await db.execute(
            select(Project).where(Project.name.ilike(pulse.current_project))
        )
        project = proj_result.scalar_one_or_none()
        
        if not project:
            # Create new project
            project = Project(
                id=str(uuid.uuid4()),
                name=pulse.current_project,
                status="active",
                description=f"Auto-created from {agent.name} activity",
                agents=[agent.id],
                milestones=[],
                notes=""
            )
            db.add(project)
        
        # Check if agent is already linked to this project
        link_result = await db.execute(
            select(AgentProject).where(
                AgentProject.agent_id == agent.id,
                AgentProject.project_id == project.id
            )
        )
        existing_link = link_result.scalar_one_or_none()
        
        if not existing_link:
            # Link agent to project
            link = AgentProject(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                project_id=project.id,
                role="contributor",
                status="active",
                joined_at=datetime.utcnow()
            )
            db.add(link)
            
            # Update project agents list
            if agent.id not in (project.agents or []):
                project.agents = (project.agents or []) + [agent.id]
    
    await db.commit()
    
    # ✅ Broadcast pulse to websocket in real-time
    await ws_manager.broadcast_to_agent(agent.id, {
        "type": "pulse",
        "agent_id": agent.id,
        "name": agent.name,
        "status": agent.status,
        "model": agent.model,
        "provider": agent.provider,
        "current_task": agent.current_task,
        "current_project": agent.current_project,
        "activity": pulse.activity,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {"message": "Pulse received", "timestamp": datetime.utcnow().isoformat()}


@router.post("/{agent_id}/query")
async def query_agent(agent_id: str, query_data: dict, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    query = query_data.get("query", "")
    agent.pending_query = query
    agent.query_response = None  # Reset previous response
    await db.commit()
    
    return {"message": "Query sent", "query": query, "status": "pending"}


@router.post("/{agent_id}/query-response")
async def query_response(agent_id: str, response_data: dict, db: AsyncSession = Depends(get_db)):
    """Agent calls this to send query response"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    response = response_data.get("response", "")
    agent.query_response = response
    agent.pending_query = None  # Clear pending query
    await db.commit()
    
    return {"message": "Response received"}


@router.get("/{agent_id}/query-result")
async def get_query_result(agent_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {
        "pending_query": agent.pending_query,
        "query_response": agent.query_response,
        "status": "pending" if agent.pending_query else ("completed" if agent.query_response else "idle")
    }

@router.get("/{agent_id}/projects", response_model=List[AgentProjectResponse])
async def list_agent_projects(agent_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    from sqlalchemy import or_
    agent_result = await db.execute(select(Agent).where(or_(Agent.id == agent_id, Agent.name.ilike(agent_id))))
    agent = agent_result.scalar_one_or_none()
    real_agent_id = agent.id if agent else agent_id
    result = await db.execute(select(AgentProject).where(AgentProject.agent_id == real_agent_id))
    return result.scalars().all()

@router.post("/{agent_id}/projects", response_model=AgentProjectResponse)
async def assign_agent_to_project(
    agent_id: str,
    assignment: AgentProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(verify_token)
):
    db_assignment = AgentProject(id=str(uuid.uuid4()), agent_id=agent_id, **assignment.model_dump())
    db.add(db_assignment)
    await db.commit()
    await db.refresh(db_assignment)
    return db_assignment

@router.get("/{agent_id}/memory")
async def get_agent_memory(agent_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"entries": []}

@router.get("/{agent_id}/config")
async def get_agent_config(agent_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent.config

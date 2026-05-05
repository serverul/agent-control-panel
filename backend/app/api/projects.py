from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.auth import verify_token
from app.models.project import Project
import uuid

router = APIRouter(prefix="/api/projects", tags=["projects"], redirect_slashes=False)

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    agents: list = []
    notes: str = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    agents: Optional[list] = None
    notes: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    status: str
    description: str
    agents: list
    milestones: list
    notes: str
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """List all projects. No auth required for read access."""
    result = await db.execute(select(Project))
    return result.scalars().all()

@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    db_project = Project(id=str(uuid.uuid4()), **project.model_dump())
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, update: ProjectUpdate, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    await db.commit()
    await db.refresh(project)
    return project

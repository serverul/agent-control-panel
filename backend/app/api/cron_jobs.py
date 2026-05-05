from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.auth import verify_token
from app.models.cron_job import CronJob
import uuid

router = APIRouter(prefix="/api/cron-jobs", tags=["cron-jobs"], redirect_slashes=False)

# In-memory history store: job_id -> list of history entries
_job_history: dict[str, list] = {}

class CronJobCreate(BaseModel):
    agent_id: str
    name: str
    schedule: str
    prompt: str = ""
    enabled: bool = True

class CronJobUpdate(BaseModel):
    name: Optional[str] = None
    schedule: Optional[str] = None
    prompt: Optional[str] = None
    enabled: Optional[bool] = None

class CronJobResponse(BaseModel):
    id: str
    agent_id: str
    name: str
    schedule: str
    prompt: str
    enabled: bool
    last_run: Optional[datetime]
    last_status: Optional[str]
    run_history: list
    created_at: datetime
    
    class Config:
        from_attributes = True

class HistoryItem(BaseModel):
    run_at: datetime
    status: str
    output: str

@router.get("/", response_model=List[CronJobResponse])
async def list_cron_jobs(agent_id: str = None, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    query = select(CronJob)
    if agent_id:
        query = query.where(CronJob.agent_id == agent_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=CronJobResponse)
async def create_cron_job(job: CronJobCreate, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    db_job = CronJob(id=str(uuid.uuid4()), **job.model_dump())
    db.add(db_job)
    await db.commit()
    await db.refresh(db_job)
    return db_job

@router.put("/{job_id}", response_model=CronJobResponse)
async def update_cron_job(job_id: str, update: CronJobUpdate, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(CronJob).where(CronJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found")
    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(job, key, value)
    await db.commit()
    await db.refresh(job)
    return job

@router.post("/{job_id}/run")
async def run_cron_job(job_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(CronJob).where(CronJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found")
    job.last_run = datetime.utcnow()
    job.last_status = "running"
    await db.commit()
    return {"message": "Job triggered", "job_id": job_id}

@router.post("/{job_id}/pause")
async def pause_cron_job(job_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(CronJob).where(CronJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found")
    job.enabled = False
    await db.commit()
    return {"message": "Job paused"}

@router.post("/{job_id}/resume")
async def resume_cron_job(job_id: str, db: AsyncSession = Depends(get_db), user: str = Depends(verify_token)):
    result = await db.execute(select(CronJob).where(CronJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found")
    job.enabled = True
    await db.commit()
    return {"message": "Job resumed"}

@router.get("/{job_id}/history", response_model=List[HistoryItem])
async def get_cron_job_history(job_id: str, user: str = Depends(verify_token)):
    history = _job_history.get(job_id, [])
    return [HistoryItem(run_at=h["run_at"], status=h["status"], output=h["output"]) for h in history]

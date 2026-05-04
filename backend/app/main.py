from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db
from app.api import auth, agents, cron_jobs, projects, chat, stats, onboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Agent Control Panel", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(cron_jobs.router)
app.include_router(projects.router)
app.include_router(chat.router)
app.include_router(stats.router)
app.include_router(onboard.router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

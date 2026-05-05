from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/shared", tags=["shared"], redirect_slashes=False)

# In-memory storage
_shared_memory: List[dict] = []
_shared_messages: List[dict] = []

class SendMessage(BaseModel):
    from_agent: str
    to_agent: str
    content: str

class MessageResponse(BaseModel):
    id: str
    from_agent: str
    to_agent: str
    content: str
    timestamp: str

class ContextResponse(BaseModel):
    agents: List[dict]
    projects: List[dict]
    messages: List[dict]

class MemoryEntry(BaseModel):
    id: str
    key: str
    value: str
    created_at: str

@router.get("/context", response_model=ContextResponse)
async def get_shared_context():
    return {
        "agents": [],
        "projects": [],
        "messages": list(_shared_messages)
    }

@router.get("/memory", response_model=List[MemoryEntry])
async def get_shared_memory():
    return _shared_memory

@router.post("/message", response_model=MessageResponse)
async def post_shared_message(message: SendMessage):
    import uuid
    entry = {
        "id": str(uuid.uuid4()),
        "from_agent": message.from_agent,
        "to_agent": message.to_agent,
        "content": message.content,
        "timestamp": datetime.utcnow().isoformat()
    }
    _shared_messages.append(entry)
    _shared_memory.append({
        "id": entry["id"],
        "key": f"message:{entry['id']}",
        "value": f"[{entry['from_agent']} -> {entry['to_agent']}] {entry['content']}",
        "created_at": entry["timestamp"]
    })
    return entry

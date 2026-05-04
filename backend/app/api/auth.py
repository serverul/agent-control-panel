from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.auth import create_access_token
from app.core.config import settings
import hashlib

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Default credentials (change in production)
DEFAULT_USER = "admin"
DEFAULT_PASS_HASH = hashlib.sha256("admin123".encode()).hexdigest()

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    pass_hash = hashlib.sha256(req.password.encode()).hexdigest()
    if req.username != DEFAULT_USER or pass_hash != DEFAULT_PASS_HASH:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": req.username})
    return TokenResponse(access_token=token)

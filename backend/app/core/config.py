from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://acp:acp_secret@localhost:5432/agent_control_panel"
    SECRET_KEY: str = "change-me-in-production-very-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    class Config:
        env_file = ".env"

settings = Settings()

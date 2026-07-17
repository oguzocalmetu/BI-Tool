from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Vela BI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENCRYPTION_KEY: str = "change-me-32-bytes-fernet-key-here"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://vela:vela_pass@localhost:5432/vela_bi"
    DATABASE_URL_SYNC: str = "postgresql://vela:vela_pass@localhost:5432/vela_bi"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""          # Free via groq.com
    AI_MODEL: str = "claude-sonnet-4-6"
    AI_MAX_TOKENS: int = 4096
    AI_TEMPERATURE: float = 0.0

    # Query limits
    QUERY_TIMEOUT_SECONDS: int = 30
    QUERY_MAX_ROWS: int = 10000
    PREVIEW_MAX_ROWS: int = 100

    # Cache TTL (seconds)
    CACHE_QUERY_TTL: int = 3600
    CACHE_SCHEMA_TTL: int = 86400
    CACHE_PROFILE_TTL: int = 86400

    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "vela-bi"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

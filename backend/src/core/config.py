import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Paper Generator"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:3000"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/rpg_dev"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "e83a9f8b472e391cb4d638fa918b958c29184a86bdf382103a89342738491cba"
    TOKEN_ENCRYPTION_KEY: str = "94cbf037b51293a61f43501a2f6468923058869c991ba90f2305718a381023a1"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    SESSION_COOKIE_NAME: str = "paper_gen_session"
    SESSION_EXPIRE_HOURS: int = 24
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # UC-03 Document Indexing and Local Embedding Configurations
    EMBEDDING_MODEL_NAME: str = "intfloat/multilingual-e5-base"
    EMBEDDING_DIMENSION: int = 768
    CHUNK_SIZE: int = 1200
    CHUNK_OVERLAP: int = 150
    BATCH_SIZE: int = 32
    INDEXING_MAX_RETRIES: int = 3
    HEARTBEAT_TIMEOUT_MINUTES: int = 5

    @property
    def sync_database_url(self) -> str:
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql+psycopg2://"):
            return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()

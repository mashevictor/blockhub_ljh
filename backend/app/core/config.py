from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TrackChat PaaS API"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://101.32.209.251,http://101.32.209.251/admin"

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"
    deepseek_timeout: int = 25

    # PostgreSQL only — set DATABASE_URL in .env (see .env.example)
    database_url: str = "postgresql+psycopg2://trackchat:trackchat@localhost:5432/trackchat"
    jwt_secret: str = "change-me-in-production-trackchat-d1"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    @field_validator("database_url")
    @classmethod
    def require_postgresql(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("DATABASE_URL must be a PostgreSQL connection string (postgresql+psycopg2://…)")
        return v


settings = Settings()

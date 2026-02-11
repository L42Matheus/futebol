from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "QuemJoga API"
    debug: bool = True

    # Database
    database_url: str = "postgresql://postgres:postgres@db:5432/quemjoga"

    # Security (for future use)
    secret_key: str = "change-this-secret-key-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

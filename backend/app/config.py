from pydantic_settings import BaseSettings
from functools import lru_cache
import os


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

    # Uploads
    upload_dir: str = "uploads"
    max_upload_size: int = 5 * 1024 * 1024  # 5MB

    class Config:
        env_file = ".env"

    def get_upload_path(self) -> str:
        """Retorna o caminho completo do diretório de uploads"""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(base_dir, self.upload_dir)


@lru_cache()
def get_settings() -> Settings:
    return Settings()

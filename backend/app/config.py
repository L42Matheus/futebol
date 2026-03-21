from pydantic_settings import BaseSettings
from functools import lru_cache
import os
import logging
import warnings

logger = logging.getLogger(__name__)

_DEFAULT_SECRET_KEY = "change-this-secret-key-in-production"


class Settings(BaseSettings):
    # App
    app_name: str = "QuemJoga API"
    debug: bool = True

    # Database
    database_url: str = "postgresql://postgres:postgres@db:5432/quemjoga"

    # Security
    secret_key: str = _DEFAULT_SECRET_KEY
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    frontend_url: str = "http://localhost:3000"
    reset_password_expire_minutes: int = 30

    # Email (SMTP)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

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
    settings = Settings()
    if settings.secret_key == _DEFAULT_SECRET_KEY and not settings.debug:
        raise RuntimeError(
            "SECRET_KEY não foi configurada. Defina a variável de ambiente SECRET_KEY antes de iniciar em produção."
        )
    if settings.secret_key == _DEFAULT_SECRET_KEY:
        warnings.warn(
            "Usando SECRET_KEY padrão — configure a variável de ambiente SECRET_KEY antes de ir para produção.",
            stacklevel=2,
        )
    return settings

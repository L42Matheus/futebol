from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ArtilhariaItem(BaseModel):
    atleta_id: int
    racha_id: int
    nome: str
    apelido: Optional[str] = None
    posicao: Optional[str] = None
    foto_url: Optional[str] = None
    gols: int = 0
    assistencias: int = 0


class ArtilhariaUpdate(BaseModel):
    gols: Optional[int] = Field(None, ge=0)
    assistencias: Optional[int] = Field(None, ge=0)


class ArtilhariaResponse(BaseModel):
    atleta_id: int
    racha_id: int
    gols: int
    assistencias: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.temporada import StatusTemporada


class TemporadaBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    mes: int = Field(..., ge=1, le=12)
    ano: int = Field(..., ge=2000, le=2100)


class TemporadaCreate(TemporadaBase):
    racha_id: int
    status: StatusTemporada = StatusTemporada.ATIVA


class TemporadaUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    mes: Optional[int] = Field(None, ge=1, le=12)
    ano: Optional[int] = Field(None, ge=2000, le=2100)
    status: Optional[StatusTemporada] = None
    campeao_team_id: Optional[int] = None


class TemporadaResponse(TemporadaBase):
    id: int
    racha_id: int
    status: StatusTemporada
    campeao_team_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

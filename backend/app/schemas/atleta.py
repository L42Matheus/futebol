from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.atleta import Posicao


class AtletaBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    apelido: Optional[str] = Field(None, max_length=50)
    telefone: Optional[str] = Field(None, max_length=20)
    posicao: Posicao = Posicao.MEIA
    numero_camisa: Optional[int] = Field(None, ge=1, le=99)


class AtletaCreate(AtletaBase):
    racha_id: int
    is_admin: bool = False


class AtletaUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    apelido: Optional[str] = Field(None, max_length=50)
    telefone: Optional[str] = Field(None, max_length=20)
    foto_url: Optional[str] = None
    posicao: Optional[Posicao] = None
    numero_camisa: Optional[int] = Field(None, ge=1, le=99)
    is_admin: Optional[bool] = None
    ativo: Optional[bool] = None


class AtletaResponse(AtletaBase):
    id: int
    racha_id: int
    foto_url: Optional[str] = None
    is_admin: bool
    ativo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.racha import TipoRacha


class RachaBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    tipo: TipoRacha = TipoRacha.SOCIETY
    descricao: Optional[str] = None
    valor_mensalidade: int = Field(default=0, ge=0)
    valor_cartao_amarelo: int = Field(default=1000, ge=0)
    valor_cartao_vermelho: int = Field(default=2000, ge=0)
    estatuto: Optional[str] = None


class RachaCreate(RachaBase):
    pass


class RachaUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    tipo: Optional[TipoRacha] = None
    descricao: Optional[str] = None
    valor_mensalidade: Optional[int] = Field(None, ge=0)
    valor_cartao_amarelo: Optional[int] = Field(None, ge=0)
    valor_cartao_vermelho: Optional[int] = Field(None, ge=0)
    estatuto: Optional[str] = None
    ativo: Optional[bool] = None


class RachaResponse(RachaBase):
    id: int
    max_atletas: int
    ativo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_atletas: int = 0

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class JogoBase(BaseModel):
    data_hora: datetime
    local: Optional[str] = Field(None, max_length=200)
    endereco: Optional[str] = Field(None, max_length=300)
    valor_campo: int = Field(default=0, ge=0)
    observacoes: Optional[str] = None


class JogoCreate(JogoBase):
    racha_id: int


class JogoUpdate(BaseModel):
    data_hora: Optional[datetime] = None
    local: Optional[str] = Field(None, max_length=200)
    endereco: Optional[str] = Field(None, max_length=300)
    valor_campo: Optional[int] = Field(None, ge=0)
    observacoes: Optional[str] = None
    finalizado: Optional[bool] = None
    cancelado: Optional[bool] = None


class JogoResponse(JogoBase):
    id: int
    racha_id: int
    finalizado: bool
    cancelado: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_confirmados: int = 0

    class Config:
        from_attributes = True

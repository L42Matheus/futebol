from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.presenca import StatusPresenca


class PresencaBase(BaseModel):
    status: StatusPresenca = StatusPresenca.PENDENTE


class PresencaCreate(PresencaBase):
    jogo_id: int
    atleta_id: int


class PresencaUpdate(BaseModel):
    status: StatusPresenca


class PresencaResponse(PresencaBase):
    id: int
    jogo_id: int
    atleta_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    atleta_nome: Optional[str] = None
    atleta_posicao: Optional[str] = None

    class Config:
        from_attributes = True

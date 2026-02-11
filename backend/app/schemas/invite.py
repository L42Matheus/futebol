from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.invite import InviteStatus


class InviteCreate(BaseModel):
    racha_id: int
    email: Optional[str] = None
    telefone: Optional[str] = None
    nome: Optional[str] = None


class InviteResponse(BaseModel):
    id: int
    token: str
    racha_id: int
    email: Optional[str] = None
    telefone: Optional[str] = None
    nome: Optional[str] = None
    status: InviteStatus
    criado_em: datetime
    aceito_em: Optional[datetime] = None

    class Config:
        from_attributes = True


class InviteAccept(BaseModel):
    token: str

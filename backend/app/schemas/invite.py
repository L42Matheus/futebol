from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.invite import InviteStatus, InviteRole


class InviteCreate(BaseModel):
    racha_id: int
    email: Optional[str] = None
    telefone: Optional[str] = None
    nome: Optional[str] = None
    role: InviteRole = InviteRole.ATLETA
    team_id: Optional[int] = None


class InviteResponse(BaseModel):
    id: int
    token: str
    racha_id: int
    email: Optional[str] = None
    telefone: Optional[str] = None
    nome: Optional[str] = None
    status: InviteStatus
    role: InviteRole
    team_id: Optional[int] = None
    criado_em: datetime
    aceito_em: Optional[datetime] = None

    class Config:
        from_attributes = True


class InviteAccept(BaseModel):
    token: str

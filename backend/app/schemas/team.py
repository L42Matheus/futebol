from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TeamBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)


class TeamCreate(TeamBase):
    racha_id: int


class TeamUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    ativo: Optional[bool] = None


class TeamResponse(TeamBase):
    id: int
    racha_id: int
    ativo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Schema resumido do atleta para incluir nos membros do time
class AtletaResumo(BaseModel):
    id: int
    nome: str
    apelido: Optional[str] = None
    foto_url: Optional[str] = None
    posicao: str
    numero_camisa: Optional[int] = None

    class Config:
        from_attributes = True


class TeamMemberCreate(BaseModel):
    atleta_id: int
    is_titular: Optional[bool] = True
    posicao_escalacao: Optional[str] = None


class TeamMemberUpdate(BaseModel):
    is_titular: Optional[bool] = None
    posicao_escalacao: Optional[str] = None
    ordem_banco: Optional[int] = None


class TeamMemberResponse(BaseModel):
    id: int
    team_id: int
    atleta_id: int
    ativo: bool
    desde: datetime
    ate: Optional[datetime] = None
    is_titular: bool = True
    posicao_escalacao: Optional[str] = None
    ordem_banco: Optional[int] = None

    class Config:
        from_attributes = True


class TeamMemberWithAtleta(TeamMemberResponse):
    """Membro do time com dados completos do atleta"""
    atleta: AtletaResumo

    class Config:
        from_attributes = True


class TeamWithMembers(TeamResponse):
    membros: List[TeamMemberResponse] = []


class TeamWithMembersDetailed(TeamResponse):
    """Time com membros incluindo dados completos dos atletas"""
    membros: List[TeamMemberWithAtleta] = []

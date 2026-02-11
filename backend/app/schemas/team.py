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


class TeamMemberCreate(BaseModel):
    atleta_id: int


class TeamMemberResponse(BaseModel):
    id: int
    team_id: int
    atleta_id: int
    ativo: bool
    desde: datetime
    ate: Optional[datetime] = None

    class Config:
        from_attributes = True


class TeamWithMembers(TeamResponse):
    membros: List[TeamMemberResponse] = []

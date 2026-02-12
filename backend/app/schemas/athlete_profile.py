from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.atleta import Posicao
from app.models.athlete_profile import PernaBoa


class AthleteProfileBase(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    apelido: Optional[str] = Field(None, max_length=50)
    telefone: Optional[str] = Field(None, max_length=20)
    posicao: Optional[Posicao] = None
    perna_boa: Optional[PernaBoa] = None
    numero_camisa: Optional[int] = Field(None, ge=1, le=99)
    foto_url: Optional[str] = None


class AthleteProfileUpdate(AthleteProfileBase):
    pass


class AthleteProfileResponse(AthleteProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

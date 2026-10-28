from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IniciarPartida(BaseModel):
    # Opcionais quando o jogo já tem os dois times definidos.
    time_a_id: Optional[int] = None
    time_b_id: Optional[int] = None


class EventoCreate(BaseModel):
    tipo: str = Field(..., max_length=20)
    atleta_id: int
    # Só na substituição: quem sai (atleta_id é quem entra).
    atleta_sai_id: Optional[int] = None
    valor: int = Field(1, ge=1, le=3)


class EventoResponse(BaseModel):
    id: int
    lado: str
    tipo: str
    atleta_id: int
    atleta_sai_id: Optional[int] = None
    valor: int
    segundos: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MembroPartida(BaseModel):
    atleta_id: int
    nome: str
    apelido: Optional[str] = None
    foto_url: Optional[str] = None
    posicao: Optional[str] = None
    numero_camisa: Optional[int] = None
    is_titular: bool
    posicao_escalacao: Optional[str] = None


class TimePartida(BaseModel):
    lado: str
    team_id: Optional[int] = None
    nome: str
    placar: int
    membros: list[MembroPartida]


class PartidaResponse(BaseModel):
    jogo_id: int
    racha_id: int
    data_hora: datetime
    local: Optional[str] = None
    iniciado_em: Optional[datetime] = None
    finalizado: bool
    agora: datetime
    is_admin: bool
    esporte: str
    eventos_permitidos: list[str]
    valores_pontuacao: list[int]
    times: list[TimePartida]
    eventos: list[EventoResponse]

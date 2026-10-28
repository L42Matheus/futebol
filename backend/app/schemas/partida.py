from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IniciarPartida(BaseModel):
    # Opcionais quando o jogo já tem os dois times definidos.
    time_a_id: Optional[int] = None
    time_b_id: Optional[int] = None
    # Vôlei: até quantos pontos vai cada set.
    pontos_por_set: Optional[int] = Field(None, ge=5, le=50)


class EventoCreate(BaseModel):
    tipo: str = Field(..., max_length=20)
    # Sem atleta só no ponto do time do vôlei; aí o lado diz de quem é o ponto.
    atleta_id: Optional[int] = None
    lado: Optional[str] = Field(None, pattern="^[ab]$")
    # Só na substituição: quem sai (atleta_id é quem entra).
    atleta_sai_id: Optional[int] = None
    valor: int = Field(1, ge=1, le=3)


class EventoResponse(BaseModel):
    id: int
    lado: str
    tipo: str
    atleta_id: Optional[int] = None
    atleta_sai_id: Optional[int] = None
    valor: int
    segundos: Optional[int] = None
    periodo: Optional[int] = None
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


class Parcial(BaseModel):
    """Pontos de cada time em um quarto ou set."""
    periodo: int
    a: int
    b: int


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
    periodo: int
    periodo_nome: Optional[str] = None
    periodos: int
    placar_por_periodo: bool
    ponto_do_time: bool
    pontos_por_set: Optional[int] = None
    parciais: list[Parcial]
    times: list[TimePartida]
    eventos: list[EventoResponse]

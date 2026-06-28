from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class StatusTemporada(str, enum.Enum):
    ATIVA = "ativa"
    ENCERRADA = "encerrada"


class Temporada(Base):
    __tablename__ = "temporadas"

    id = Column(Integer, primary_key=True, index=True)
    racha_id = Column(Integer, ForeignKey("rachas.id"), nullable=False, index=True)
    nome = Column(String(100), nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    status = Column(Enum(StatusTemporada), nullable=False, default=StatusTemporada.ATIVA)
    campeao_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    racha = relationship("Racha")
    campeao = relationship("Team", foreign_keys=[campeao_team_id])

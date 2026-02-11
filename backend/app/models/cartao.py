from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TipoCartao(str, enum.Enum):
    AMARELO = "amarelo"
    VERMELHO = "vermelho"


class Cartao(Base):
    __tablename__ = "cartoes"

    id = Column(Integer, primary_key=True, index=True)
    atleta_id = Column(Integer, ForeignKey("atletas.id"), nullable=False)
    jogo_id = Column(Integer, ForeignKey("jogos.id"), nullable=False)
    tipo = Column(Enum(TipoCartao), nullable=False)
    motivo = Column(Text, nullable=True)
    multa_gerada = Column(Boolean, default=False)
    suspensao_cumprida = Column(Boolean, default=False)
    suspensao_paga = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    atleta = relationship("Atleta", back_populates="cartoes")
    jogo = relationship("Jogo", back_populates="cartoes")

from sqlalchemy import Column, Integer, String, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TipoRacha(str, enum.Enum):
    CAMPO = "campo"
    SOCIETY = "society"
    FUTSAL = "futsal"


class Racha(Base):
    __tablename__ = "rachas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    tipo = Column(Enum(TipoRacha), nullable=False, default=TipoRacha.SOCIETY)
    descricao = Column(Text, nullable=True)
    max_atletas = Column(Integer, nullable=False, default=30)
    valor_mensalidade = Column(Integer, default=0)
    valor_cartao_amarelo = Column(Integer, default=1000)
    valor_cartao_vermelho = Column(Integer, default=2000)
    estatuto = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    atletas = relationship("Atleta", back_populates="racha", cascade="all, delete-orphan")
    jogos = relationship("Jogo", back_populates="racha", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="racha", cascade="all, delete-orphan")

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Jogo(Base):
    __tablename__ = "jogos"

    id = Column(Integer, primary_key=True, index=True)
    racha_id = Column(Integer, ForeignKey("rachas.id"), nullable=False)
    data_hora = Column(DateTime(timezone=True), nullable=False)
    local = Column(String(200), nullable=True)
    endereco = Column(String(300), nullable=True)
    valor_campo = Column(Integer, default=0)
    observacoes = Column(Text, nullable=True)
    finalizado = Column(Boolean, default=False)
    cancelado = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    racha = relationship("Racha", back_populates="jogos")
    presencas = relationship("Presenca", back_populates="jogo", cascade="all, delete-orphan")
    cartoes = relationship("Cartao", back_populates="jogo", cascade="all, delete-orphan")

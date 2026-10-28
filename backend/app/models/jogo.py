from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Jogo(Base):
    __tablename__ = "jogos"

    id = Column(Integer, primary_key=True, index=True)
    racha_id = Column(Integer, ForeignKey("rachas.id"), nullable=False)
    data_hora = Column(DateTime(timezone=False), nullable=False)
    local = Column(String(200), nullable=True)
    endereco = Column(String(300), nullable=True)
    valor_campo = Column(Integer, default=0)
    observacoes = Column(Text, nullable=True)
    finalizado = Column(Boolean, default=False)
    cancelado = Column(Boolean, default=False)
    time_a_id = Column(Integer, ForeignKey("teams.id"), nullable=True, index=True)
    time_b_id = Column(Integer, ForeignKey("teams.id"), nullable=True, index=True)
    time_a_nome = Column(String(80), nullable=True)
    time_b_nome = Column(String(80), nullable=True)
    placar_time_a = Column(Integer, nullable=True)
    placar_time_b = Column(Integer, nullable=True)
    # Preenchido quando o admin inicia a partida ao vivo.
    iniciado_em = Column(DateTime(timezone=True), nullable=True)
    # Quarto ou set em andamento na partida ao vivo.
    periodo = Column(Integer, nullable=True)
    # Vôlei: até quantos pontos vai cada set.
    pontos_por_set = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())  
    updated_at = Column(DateTime(timezone=False), onupdate=func.now())  

    racha = relationship("Racha", back_populates="jogos")
    presencas = relationship("Presenca", back_populates="jogo", cascade="all, delete-orphan")
    cartoes = relationship("Cartao", back_populates="jogo", cascade="all, delete-orphan")
    eventos = relationship("EventoPartida", back_populates="jogo", cascade="all, delete-orphan", order_by="EventoPartida.id")

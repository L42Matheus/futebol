from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class StatusPresenca(str, enum.Enum):
    PENDENTE = "pendente"
    CONFIRMADO = "confirmado"
    RECUSADO = "recusado"
    TALVEZ = "talvez"


class Presenca(Base):
    __tablename__ = "presencas"

    id = Column(Integer, primary_key=True, index=True)
    jogo_id = Column(Integer, ForeignKey("jogos.id"), nullable=False)
    atleta_id = Column(Integer, ForeignKey("atletas.id"), nullable=False)
    status = Column(Enum(StatusPresenca), nullable=False, default=StatusPresenca.PENDENTE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    jogo = relationship("Jogo", back_populates="presencas")
    atleta = relationship("Atleta", back_populates="presencas")

    __table_args__ = (
        UniqueConstraint("jogo_id", "atleta_id", name="unique_presenca_jogo_atleta"),
    )

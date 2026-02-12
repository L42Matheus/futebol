from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
from app.models.atleta import Posicao


class PernaBoa(str, enum.Enum):
    DIREITA = "direita"
    ESQUERDA = "esquerda"
    AMBIDESTRA = "ambidestra"


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    nome = Column(String(100), nullable=True)
    apelido = Column(String(50), nullable=True)
    telefone = Column(String(20), nullable=True)
    posicao = Column(Enum(Posicao), nullable=True)
    perna_boa = Column(Enum(PernaBoa), nullable=True)
    numero_camisa = Column(Integer, nullable=True)
    foto_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="athlete_profile")

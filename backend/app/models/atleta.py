from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class Posicao(str, enum.Enum):
    GOLEIRO = "goleiro"
    ZAGUEIRO = "zagueiro"
    LATERAL = "lateral"
    VOLANTE = "volante"
    MEIA = "meia"
    ATACANTE = "atacante"
    PONTA = "ponta"


class Atleta(Base):
    __tablename__ = "atletas"

    id = Column(Integer, primary_key=True, index=True)
    racha_id = Column(Integer, ForeignKey("rachas.id"), nullable=False)
    nome = Column(String(100), nullable=False)
    apelido = Column(String(50), nullable=True)
    telefone = Column(String(20), nullable=True)
    foto_url = Column(String(500), nullable=True)
    posicao = Column(Enum(Posicao), nullable=False, default=Posicao.MEIA)
    numero_camisa = Column(Integer, nullable=True)
    is_admin = Column(Boolean, default=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    racha = relationship("Racha", back_populates="atletas")
    presencas = relationship("Presenca", back_populates="atleta", cascade="all, delete-orphan")
    pagamentos = relationship("Pagamento", back_populates="atleta", cascade="all, delete-orphan")
    cartoes = relationship("Cartao", back_populates="atleta", cascade="all, delete-orphan")

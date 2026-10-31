from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.esportes import TODAS_POSICOES
import enum


# Posições de todos os esportes; cada racha só aceita as do seu esporte (ver app/deps.py).
Posicao = enum.Enum("Posicao", {p.upper(): p for p in TODAS_POSICOES}, type=str)


class Atleta(Base):
    __tablename__ = "atletas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # An Atleta can exist without a User account initially
    racha_id = Column(Integer, ForeignKey("rachas.id"), nullable=False)
    nome = Column(String(100), nullable=False)
    apelido = Column(String(50), nullable=True)
    telefone = Column(String(20), nullable=True)
    foto_url = Column(String(500), nullable=True)
    posicao = Column(Enum(Posicao), nullable=False, default=Posicao.MEIA)
    numero_camisa = Column(Integer, nullable=True)
    # Notas da carta do atleta dadas pelo admin, por sigla do esporte (ex.: {"rit": 81, "fin": 78}).
    atributos = Column(JSON, nullable=True)
    is_admin = Column(Boolean, default=False) # Admin for this specific racha
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    racha = relationship("Racha", back_populates="atletas")
    user = relationship("User", back_populates="atletas")
    presencas = relationship("Presenca", back_populates="atleta", cascade="all, delete-orphan")
    pagamentos = relationship("Pagamento", back_populates="atleta", cascade="all, delete-orphan")
    cartoes = relationship("Cartao", back_populates="atleta", cascade="all, delete-orphan")
    team_members = relationship("TeamMember", back_populates="atleta", cascade="all, delete-orphan")

    @property
    def nota(self) -> int | None:
        """Nota geral da carta: média dos atributos avaliados."""
        valores = [v for v in (self.atributos or {}).values() if isinstance(v, (int, float))]
        return round(sum(valores) / len(valores)) if valores else None

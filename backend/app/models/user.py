from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ATLETA = "atleta"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True, unique=True, index=True)
    telefone = Column(String(20), nullable=True, unique=True, index=True)
    senha_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.ATLETA)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    atletas = relationship("Atleta", back_populates="user")
    athlete_profile = relationship("AthleteProfile", back_populates="user", uselist=False)
    push_tokens = relationship("PushToken", back_populates="user", cascade="all, delete-orphan")
    convites_enviados = relationship("Invite", back_populates="convidado_por")
    rachas_admin = relationship("RachaAdmin", back_populates="user")

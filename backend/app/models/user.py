from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True, unique=True, index=True)
    telefone = Column(String(20), nullable=True, unique=True, index=True)
    senha_hash = Column(String(255), nullable=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    atletas = relationship("Atleta", back_populates="user")
    push_tokens = relationship("PushToken", back_populates="user", cascade="all, delete-orphan")
    convites_enviados = relationship("Invite", back_populates="convidado_por")

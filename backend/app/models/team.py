from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    racha_id = Column(Integer, ForeignKey("rachas.id"), nullable=False)
    nome = Column(String(100), nullable=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    racha = relationship("Racha", back_populates="teams")
    membros = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")

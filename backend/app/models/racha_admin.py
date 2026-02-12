from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class RachaAdmin(Base):
    """Administradores do racha (separado dos atletas)"""
    __tablename__ = "racha_admins"

    id = Column(Integer, primary_key=True, index=True)
    racha_id = Column(Integer, ForeignKey("rachas.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_owner = Column(Boolean, default=False)  # Criador do racha
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    racha = relationship("Racha", back_populates="admins")
    user = relationship("User", back_populates="rachas_admin")

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), nullable=False, index=True)
    plataforma = Column(String(50), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="push_tokens")

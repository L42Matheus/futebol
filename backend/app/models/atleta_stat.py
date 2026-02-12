from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AtletaStat(Base):
    __tablename__ = "atleta_stats"

    id = Column(Integer, primary_key=True, index=True)
    atleta_id = Column(Integer, ForeignKey("atletas.id"), nullable=False)
    racha_id = Column(Integer, ForeignKey("rachas.id"), nullable=False)
    gols = Column(Integer, default=0)
    assistencias = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    atleta = relationship("Atleta")
    racha = relationship("Racha")

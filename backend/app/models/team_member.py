from sqlalchemy import Column, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    atleta_id = Column(Integer, ForeignKey("atletas.id"), nullable=False)
    ativo = Column(Boolean, default=True)
    desde = Column(DateTime(timezone=True), server_default=func.now())
    ate = Column(DateTime(timezone=True), nullable=True)

    team = relationship("Team", back_populates="membros")
    atleta = relationship("Atleta", back_populates="team_members")

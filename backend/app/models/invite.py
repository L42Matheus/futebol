from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class InviteStatus(str, enum.Enum):
    PENDENTE = "pendente"
    ACEITO = "aceito"
    CANCELADO = "cancelado"
    EXPIRADO = "expirado"


class InviteRole(str, enum.Enum):
    ADMIN = "admin"
    ATLETA = "atleta"


class Invite(Base):
    __tablename__ = "invites"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(100), unique=True, index=True, nullable=False)
    racha_id = Column(Integer, ForeignKey("rachas.id"), nullable=False)
    email = Column(String(255), nullable=True)
    telefone = Column(String(20), nullable=True)
    nome = Column(String(100), nullable=True)
    status = Column(Enum(InviteStatus), default=InviteStatus.PENDENTE)
    role = Column(Enum(InviteRole), default=InviteRole.ATLETA)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    criado_por_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    aceito_em = Column(DateTime(timezone=True), nullable=True)
    expira_em = Column(DateTime(timezone=True), nullable=True)

    racha = relationship("Racha")
    team = relationship("Team")
    convidado_por = relationship("User", back_populates="convites_enviados")

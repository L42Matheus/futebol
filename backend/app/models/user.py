from datetime import datetime, timezone

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
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    admin_subscription_status = Column(String(50), nullable=True)
    admin_subscription_started_at = Column(DateTime(timezone=True), nullable=True)
    admin_subscription_current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    atletas = relationship("Atleta", back_populates="user")
    athlete_profile = relationship("AthleteProfile", back_populates="user", uselist=False)
    push_tokens = relationship("PushToken", back_populates="user", cascade="all, delete-orphan")
    convites_enviados = relationship("Invite", back_populates="convidado_por")
    rachas_admin = relationship("RachaAdmin", back_populates="user")

    @property
    def admin_billing_active(self) -> bool:
        if self.role != UserRole.ADMIN:
            return True

        if self.admin_subscription_status not in {"active", "trialing"}:
            return False

        if not self.admin_subscription_current_period_end:
            return True

        period_end = self.admin_subscription_current_period_end
        if period_end.tzinfo is None:
            period_end = period_end.replace(tzinfo=timezone.utc)

        return period_end > datetime.now(timezone.utc)

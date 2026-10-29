from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class ChamadoSuporte(Base):
    """Mensagem enviada pelo formulário de suporte (com ou sem login)."""

    __tablename__ = "chamados_suporte"

    id = Column(Integer, primary_key=True, index=True)
    # Vazio quando quem escreveu não estava logado, ou se a conta foi excluída depois.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    # Texto livre em vez de enum do Postgres: a lista de assuntos pode mudar.
    assunto = Column(String(30), nullable=False)
    mensagem = Column(Text, nullable=False)
    # Tela de onde veio e aparelho, para ajudar a reproduzir problemas.
    pagina = Column(String(300), nullable=True)
    navegador = Column(String(300), nullable=True)
    status = Column(String(20), nullable=False, default="aberto")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

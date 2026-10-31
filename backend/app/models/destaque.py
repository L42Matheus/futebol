from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class VotoDestaque(Base):
    """Voto de quem jogou nos três melhores da partida (1º vale 3 pontos, 2º 2, 3º 1)."""

    __tablename__ = "votos_destaque"
    __table_args__ = (
        UniqueConstraint("jogo_id", "eleitor_atleta_id", "posicao", name="uq_voto_posicao"),
        UniqueConstraint("jogo_id", "eleitor_atleta_id", "atleta_id", name="uq_voto_atleta"),
    )

    id = Column(Integer, primary_key=True, index=True)
    jogo_id = Column(Integer, ForeignKey("jogos.id", ondelete="CASCADE"), nullable=False, index=True)
    eleitor_atleta_id = Column(Integer, ForeignKey("atletas.id", ondelete="CASCADE"), nullable=False)
    atleta_id = Column(Integer, ForeignKey("atletas.id", ondelete="CASCADE"), nullable=False)
    posicao = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DestaquePartida(Base):
    """Os três melhores da partida depois de fechada a escolha."""

    __tablename__ = "destaques_partida"
    __table_args__ = (UniqueConstraint("jogo_id", "posicao", name="uq_destaque_posicao"),)

    id = Column(Integer, primary_key=True, index=True)
    jogo_id = Column(Integer, ForeignKey("jogos.id", ondelete="CASCADE"), nullable=False, index=True)
    atleta_id = Column(Integer, ForeignKey("atletas.id", ondelete="CASCADE"), nullable=False)
    posicao = Column(Integer, nullable=False)
    # votacao (dos atletas), admin (escolha do admin) ou lances (ninguém votou).
    origem = Column(String(12), nullable=False)
    pontos = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

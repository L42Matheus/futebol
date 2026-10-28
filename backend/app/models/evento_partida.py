from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class EventoPartida(Base):
    """Lance registrado pelo admin durante a partida ao vivo."""

    __tablename__ = "eventos_partida"

    id = Column(Integer, primary_key=True, index=True)
    jogo_id = Column(Integer, ForeignKey("jogos.id"), nullable=False, index=True)
    # 'a' ou 'b': de qual time é o atleta do lance.
    lado = Column(String(1), nullable=False)
    # Texto em vez de enum do Postgres: os tipos variam por esporte (app/esportes).
    tipo = Column(String(20), nullable=False)
    # Vazio no ponto do time do vôlei (erro do adversário).
    atleta_id = Column(Integer, ForeignKey("atletas.id"), nullable=True)
    # Só na substituição: quem saiu (atleta_id é quem entrou).
    atleta_sai_id = Column(Integer, ForeignKey("atletas.id"), nullable=True)
    # Quanto o lance soma no placar (cesta de 1, 2 ou 3; gol e ponto valem 1).
    valor = Column(Integer, nullable=False, default=1)
    # Segundos desde o início da partida.
    segundos = Column(Integer, nullable=True)
    # Quarto ou set em que o lance aconteceu.
    periodo = Column(Integer, nullable=True)
    # Cartão criado pelo lance, para desfazer junto com a multa.
    cartao_id = Column(Integer, ForeignKey("cartoes.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    jogo = relationship("Jogo", back_populates="eventos")

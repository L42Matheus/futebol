from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.database import Base


class ParticipantePartida(Base):
    """Quem jogou cada partida ao vivo e por qual lado.

    A escalação dos times muda com o tempo; esta foto tirada no início da partida (mais quem
    entrar depois) é o que permite contar jogos, vitórias e aproveitamento de cada atleta.
    """

    __tablename__ = "participantes_partida"
    __table_args__ = (UniqueConstraint("jogo_id", "atleta_id", name="uq_participante_partida"),)

    id = Column(Integer, primary_key=True, index=True)
    jogo_id = Column(Integer, ForeignKey("jogos.id", ondelete="CASCADE"), nullable=False, index=True)
    atleta_id = Column(Integer, ForeignKey("atletas.id", ondelete="CASCADE"), nullable=False, index=True)
    # 'a' ou 'b'
    lado = Column(String(1), nullable=False)

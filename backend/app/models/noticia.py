from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Noticia(Base):
    """Item da Resenha do racha: resultado, destaques, marcas, novos atletas, jogos e avisos."""

    __tablename__ = "noticias"

    id = Column(Integer, primary_key=True, index=True)
    racha_id = Column(Integer, ForeignKey("rachas.id", ondelete="CASCADE"), nullable=False, index=True)
    # resultado, destaques, marca, novo_atleta, jogo_marcado ou aviso.
    tipo = Column(String(20), nullable=False)
    titulo = Column(String(200), nullable=False)
    texto = Column(Text, nullable=True)
    jogo_id = Column(Integer, ForeignKey("jogos.id", ondelete="SET NULL"), nullable=True)
    atleta_id = Column(Integer, ForeignKey("atletas.id", ondelete="SET NULL"), nullable=True)
    # Só nos avisos escritos pelo admin.
    autor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

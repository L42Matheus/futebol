from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TipoPagamento(str, enum.Enum):
    MENSALIDADE = "mensalidade"
    RATEIO = "rateio"
    UNIFORME = "uniforme"
    MULTA_AMARELO = "multa_amarelo"
    MULTA_VERMELHO = "multa_vermelho"
    OUTRO = "outro"


class StatusPagamento(str, enum.Enum):
    PENDENTE = "pendente"
    AGUARDANDO_APROVACAO = "aguardando_aprovacao"
    APROVADO = "aprovado"
    REJEITADO = "rejeitado"


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id = Column(Integer, primary_key=True, index=True)
    atleta_id = Column(Integer, ForeignKey("atletas.id"), nullable=False)
    tipo = Column(Enum(TipoPagamento), nullable=False)
    valor = Column(Integer, nullable=False)
    descricao = Column(String(200), nullable=True)
    referencia = Column(String(100), nullable=True)
    comprovante_url = Column(String(500), nullable=True)
    status = Column(Enum(StatusPagamento), nullable=False, default=StatusPagamento.PENDENTE)
    motivo_rejeicao = Column(Text, nullable=True)
    aprovado_por = Column(Integer, nullable=True)
    data_aprovacao = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    atleta = relationship("Atleta", back_populates="pagamentos")

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.pagamento import TipoPagamento, StatusPagamento


class PagamentoBase(BaseModel):
    tipo: TipoPagamento
    valor: int = Field(..., gt=0)
    descricao: Optional[str] = Field(None, max_length=200)
    referencia: Optional[str] = Field(None, max_length=100)


class PagamentoCreate(PagamentoBase):
    atleta_id: int


class PagamentoUpdate(BaseModel):
    comprovante_url: Optional[str] = None
    status: Optional[StatusPagamento] = None
    motivo_rejeicao: Optional[str] = None


class PagamentoAprovacao(BaseModel):
    aprovado: bool
    motivo_rejeicao: Optional[str] = None


class PagamentoResponse(PagamentoBase):
    id: int
    atleta_id: int
    comprovante_url: Optional[str] = None
    status: StatusPagamento
    motivo_rejeicao: Optional[str] = None
    aprovado_por: Optional[int] = None
    data_aprovacao: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    atleta_nome: Optional[str] = None

    class Config:
        from_attributes = True

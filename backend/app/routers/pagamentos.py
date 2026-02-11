from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Pagamento, Atleta, StatusPagamento, TipoPagamento, User
from app.schemas.pagamento import PagamentoCreate, PagamentoUpdate, PagamentoResponse, PagamentoAprovacao
from app.services.auth import get_current_user

router = APIRouter(prefix="/pagamentos", tags=["Pagamentos"])


def verificar_acesso_racha(db: Session, user: User, racha_id: int):
    """Verifica se o usuário tem acesso ao racha"""
    atleta = db.query(Atleta).filter(
        Atleta.user_id == user.id,
        Atleta.racha_id == racha_id,
        Atleta.ativo == True
    ).first()
    if not atleta:
        raise HTTPException(status_code=403, detail="Sem acesso a este racha")
    return atleta


def verificar_admin_racha(db: Session, user: User, racha_id: int):
    """Verifica se o usuário é admin do racha"""
    atleta = db.query(Atleta).filter(
        Atleta.user_id == user.id,
        Atleta.racha_id == racha_id,
        Atleta.is_admin == True,
        Atleta.ativo == True
    ).first()
    if not atleta:
        raise HTTPException(status_code=403, detail="Apenas administradores podem realizar esta ação")
    return atleta


@router.post("/", response_model=PagamentoResponse, status_code=status.HTTP_201_CREATED)
def criar_pagamento(pagamento: PagamentoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    atleta = db.query(Atleta).filter(Atleta.id == pagamento.atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    verificar_acesso_racha(db, current_user, atleta.racha_id)
    db_pagamento = Pagamento(**pagamento.model_dump())
    db.add(db_pagamento)
    db.commit()
    db.refresh(db_pagamento)
    return PagamentoResponse(**{c.name: getattr(db_pagamento, c.name) for c in db_pagamento.__table__.columns}, atleta_nome=atleta.nome)


@router.get("/", response_model=List[PagamentoResponse])
def listar_pagamentos(racha_id: int, atleta_id: Optional[int] = None, status_filter: Optional[StatusPagamento] = None,
                      tipo: Optional[TipoPagamento] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_acesso_racha(db, current_user, racha_id)
    query = db.query(Pagamento, Atleta).join(Atleta).filter(Atleta.racha_id == racha_id)
    if atleta_id:
        query = query.filter(Pagamento.atleta_id == atleta_id)
    if status_filter:
        query = query.filter(Pagamento.status == status_filter)
    if tipo:
        query = query.filter(Pagamento.tipo == tipo)
    results = query.order_by(Pagamento.created_at.desc()).offset(skip).limit(limit).all()
    return [PagamentoResponse(**{c.name: getattr(pag, c.name) for c in pag.__table__.columns}, atleta_nome=atleta.nome)
            for pag, atleta in results]


@router.get("/pendentes/{racha_id}")
def listar_pendentes(racha_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_admin_racha(db, current_user, racha_id)
    results = db.query(Pagamento, Atleta).join(Atleta).filter(
        Atleta.racha_id == racha_id, Pagamento.status == StatusPagamento.AGUARDANDO_APROVACAO
    ).order_by(Pagamento.created_at).all()
    return [{"id": pag.id, "atleta_id": atleta.id, "atleta_nome": atleta.nome, "tipo": pag.tipo.value,
             "valor": pag.valor, "valor_formatado": f"R$ {pag.valor / 100:.2f}",
             "comprovante_url": pag.comprovante_url, "referencia": pag.referencia, "created_at": pag.created_at}
            for pag, atleta in results]


@router.patch("/{pagamento_id}/comprovante")
def enviar_comprovante(pagamento_id: int, comprovante_url: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pagamento = db.query(Pagamento).filter(Pagamento.id == pagamento_id).first()
    if not pagamento:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    atleta = db.query(Atleta).filter(Atleta.id == pagamento.atleta_id).first()
    verificar_acesso_racha(db, current_user, atleta.racha_id)
    if pagamento.status not in [StatusPagamento.PENDENTE, StatusPagamento.REJEITADO]:
        raise HTTPException(status_code=400, detail="Pagamento já está em análise ou foi aprovado")
    pagamento.comprovante_url = comprovante_url
    pagamento.status = StatusPagamento.AGUARDANDO_APROVACAO
    db.commit()
    return {"message": "Comprovante enviado para aprovação"}


@router.post("/{pagamento_id}/aprovar")
def aprovar_pagamento(pagamento_id: int, aprovacao: PagamentoAprovacao, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pagamento = db.query(Pagamento).filter(Pagamento.id == pagamento_id).first()
    if not pagamento:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    atleta = db.query(Atleta).filter(Atleta.id == pagamento.atleta_id).first()
    admin = verificar_admin_racha(db, current_user, atleta.racha_id)
    if pagamento.status != StatusPagamento.AGUARDANDO_APROVACAO:
        raise HTTPException(status_code=400, detail="Pagamento não está aguardando aprovação")
    if aprovacao.aprovado:
        pagamento.status = StatusPagamento.APROVADO
        pagamento.aprovado_por = admin.id
        pagamento.data_aprovacao = datetime.now()
        message = "Pagamento aprovado"
    else:
        pagamento.status = StatusPagamento.REJEITADO
        pagamento.motivo_rejeicao = aprovacao.motivo_rejeicao
        message = "Pagamento rejeitado"
    db.commit()
    return {"message": message, "status": pagamento.status.value}


@router.post("/gerar-mensalidade/{racha_id}")
def gerar_mensalidade(racha_id: int, referencia: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_admin_racha(db, current_user, racha_id)
    from app.models import Racha
    racha = db.query(Racha).filter(Racha.id == racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    if racha.valor_mensalidade <= 0:
        raise HTTPException(status_code=400, detail="Racha não possui mensalidade configurada")
    atletas = db.query(Atleta).filter(Atleta.racha_id == racha_id, Atleta.ativo == True).all()
    criados = 0
    for atleta in atletas:
        existing = db.query(Pagamento).filter(
            Pagamento.atleta_id == atleta.id, Pagamento.tipo == TipoPagamento.MENSALIDADE, Pagamento.referencia == referencia).first()
        if not existing:
            pagamento = Pagamento(atleta_id=atleta.id, tipo=TipoPagamento.MENSALIDADE, valor=racha.valor_mensalidade,
                                  referencia=referencia, descricao=f"Mensalidade {referencia}")
            db.add(pagamento)
            criados += 1
    db.commit()
    return {"message": f"Mensalidades geradas para {criados} atletas", "total_atletas": len(atletas), "cobrancas_criadas": criados}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.models import Atleta, Racha, Posicao, User
from app.schemas.atleta import AtletaCreate, AtletaUpdate, AtletaResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/atletas", tags=["Atletas"])


def verificar_acesso_racha(db: Session, user: User, racha_id: int):
    """Verifica se o usuário tem acesso ao racha (é atleta dele)"""
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


@router.post("/", response_model=AtletaResponse, status_code=status.HTTP_201_CREATED)
def criar_atleta(atleta: AtletaCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_admin_racha(db, current_user, atleta.racha_id)
    racha = db.query(Racha).filter(Racha.id == atleta.racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    total_atletas = db.query(func.count(Atleta.id)).filter(Atleta.racha_id == atleta.racha_id, Atleta.ativo == True).scalar()
    if total_atletas >= racha.max_atletas:
        raise HTTPException(status_code=400, detail=f"Limite de {racha.max_atletas} atletas atingido")
    if atleta.is_admin:
        total_admins = db.query(func.count(Atleta.id)).filter(
            Atleta.racha_id == atleta.racha_id, Atleta.is_admin == True, Atleta.ativo == True).scalar()
        if total_admins >= 5:
            raise HTTPException(status_code=400, detail="Limite de 5 administradores atingido")
    db_atleta = Atleta(**atleta.model_dump())
    db.add(db_atleta)
    db.commit()
    db.refresh(db_atleta)
    return db_atleta


@router.get("/", response_model=List[AtletaResponse])
def listar_atletas(
    racha_id: int,
    posicao: Optional[Posicao] = None,
    ativo: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verifica se o usuário tem acesso ao racha
    verificar_acesso_racha(db, current_user, racha_id)

    query = db.query(Atleta).filter(Atleta.racha_id == racha_id, Atleta.ativo == ativo)
    if posicao:
        query = query.filter(Atleta.posicao == posicao)
    return query.order_by(Atleta.nome).offset(skip).limit(limit).all()


@router.get("/{atleta_id}", response_model=AtletaResponse)
def obter_atleta(atleta_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    verificar_acesso_racha(db, current_user, atleta.racha_id)
    return atleta


@router.patch("/{atleta_id}", response_model=AtletaResponse)
def atualizar_atleta(atleta_id: int, atleta_update: AtletaUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    verificar_admin_racha(db, current_user, atleta.racha_id)
    update_data = atleta_update.model_dump(exclude_unset=True)
    if update_data.get("is_admin") and not atleta.is_admin:
        total_admins = db.query(func.count(Atleta.id)).filter(
            Atleta.racha_id == atleta.racha_id, Atleta.is_admin == True, Atleta.ativo == True).scalar()
        if total_admins >= 5:
            raise HTTPException(status_code=400, detail="Limite de 5 administradores atingido")
    for field, value in update_data.items():
        setattr(atleta, field, value)
    db.commit()
    db.refresh(atleta)
    return atleta


@router.delete("/{atleta_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_atleta(atleta_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    verificar_admin_racha(db, current_user, atleta.racha_id)
    atleta.ativo = False
    db.commit()


@router.get("/{atleta_id}/historico")
def obter_historico(atleta_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models import Presenca, Pagamento, Cartao, StatusPresenca, StatusPagamento
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    verificar_acesso_racha(db, current_user, atleta.racha_id)
    total_jogos = db.query(func.count(Presenca.id)).filter(Presenca.atleta_id == atleta_id).scalar()
    confirmados = db.query(func.count(Presenca.id)).filter(
        Presenca.atleta_id == atleta_id, Presenca.status == StatusPresenca.CONFIRMADO).scalar()
    total_pago = db.query(func.sum(Pagamento.valor)).filter(
        Pagamento.atleta_id == atleta_id, Pagamento.status == StatusPagamento.APROVADO).scalar() or 0
    total_pendente = db.query(func.sum(Pagamento.valor)).filter(
        Pagamento.atleta_id == atleta_id,
        Pagamento.status.in_([StatusPagamento.PENDENTE, StatusPagamento.AGUARDANDO_APROVACAO])).scalar() or 0
    amarelos = db.query(func.count(Cartao.id)).filter(Cartao.atleta_id == atleta_id, Cartao.tipo == "amarelo").scalar()
    vermelhos = db.query(func.count(Cartao.id)).filter(Cartao.atleta_id == atleta_id, Cartao.tipo == "vermelho").scalar()
    return {
        "atleta_id": atleta_id,
        "presencas": {"total_jogos": total_jogos, "confirmados": confirmados,
                      "taxa_presenca": f"{(confirmados / total_jogos * 100):.1f}%" if total_jogos > 0 else "0%"},
        "financeiro": {"total_pago": total_pago, "total_pendente": total_pendente,
                       "pago_formatado": f"R$ {total_pago / 100:.2f}", "pendente_formatado": f"R$ {total_pendente / 100:.2f}"},
        "cartoes": {"amarelos": amarelos, "vermelhos": vermelhos}
    }

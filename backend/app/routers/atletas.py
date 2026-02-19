from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import os
import uuid
import shutil
from pydantic import BaseModel

from app.database import get_db
from app.models import (
    Atleta,
    Racha,
    Posicao,
    User,
    Jogo,
    Cartao,
    TipoCartao,
    Pagamento,
    TipoPagamento,
    StatusPagamento,
)
from app.schemas.atleta import AtletaCreate, AtletaUpdate, AtletaResponse
from app.services.auth import get_current_user
from app.deps import verificar_acesso_racha, verificar_admin_racha
from app.config import get_settings

router = APIRouter(prefix="/atletas", tags=["Atletas"])
settings = get_settings()

# Extensões de imagem permitidas
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}


class CartaoCreatePayload(BaseModel):
    tipo: TipoCartao
    jogo_id: Optional[int] = None
    motivo: Optional[str] = None


class ConfirmarPagamentoPayload(BaseModel):
    confirmado: bool
    referencia: Optional[str] = None
    valor: Optional[int] = None


class CartaoRemovePayload(BaseModel):
    tipo: TipoCartao


def get_upload_dir():
    """Cria e retorna o diretório de uploads"""
    upload_path = settings.get_upload_path()
    os.makedirs(upload_path, exist_ok=True)
    return upload_path


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
    from app.models import Presenca, StatusPresenca
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
    referencia_mes_atual = datetime.now().strftime("%m/%Y")
    pagamento_mes_atual = db.query(Pagamento.id).filter(
        Pagamento.atleta_id == atleta_id,
        Pagamento.tipo == TipoPagamento.MENSALIDADE,
        Pagamento.referencia == referencia_mes_atual,
        Pagamento.status == StatusPagamento.APROVADO
    ).first()
    return {
        "atleta_id": atleta_id,
        "presencas": {"total_jogos": total_jogos, "confirmados": confirmados,
                      "taxa_presenca": f"{(confirmados / total_jogos * 100):.1f}%" if total_jogos > 0 else "0%"},
        "financeiro": {"total_pago": total_pago, "total_pendente": total_pendente,
                       "pago_formatado": f"R$ {total_pago / 100:.2f}", "pendente_formatado": f"R$ {total_pendente / 100:.2f}",
                       "referencia_mes_atual": referencia_mes_atual,
                       "pagamento_confirmado_mes_atual": bool(pagamento_mes_atual)},
        "cartoes": {"amarelos": amarelos, "vermelhos": vermelhos}
    }


@router.post("/{atleta_id}/cartoes")
def adicionar_cartao(
    atleta_id: int,
    payload: CartaoCreatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta nao encontrado")

    admin = verificar_admin_racha(db, current_user, atleta.racha_id)

    if payload.jogo_id:
        jogo = db.query(Jogo).filter(Jogo.id == payload.jogo_id, Jogo.racha_id == atleta.racha_id).first()
        if not jogo:
            raise HTTPException(status_code=404, detail="Jogo nao encontrado para este racha")
    else:
        jogo = db.query(Jogo).filter(Jogo.racha_id == atleta.racha_id).order_by(Jogo.data_hora.desc()).first()
        if not jogo:
            raise HTTPException(status_code=400, detail="Nao ha jogo cadastrado para lancar cartao")

    cartao = Cartao(
        atleta_id=atleta.id,
        jogo_id=jogo.id,
        tipo=payload.tipo,
        motivo=payload.motivo
    )
    db.add(cartao)

    valor_multa = admin.racha.valor_cartao_amarelo if payload.tipo == TipoCartao.AMARELO else admin.racha.valor_cartao_vermelho
    if valor_multa and valor_multa > 0:
        pagamento = Pagamento(
            atleta_id=atleta.id,
            tipo=TipoPagamento.MULTA_AMARELO if payload.tipo == TipoCartao.AMARELO else TipoPagamento.MULTA_VERMELHO,
            valor=valor_multa,
            descricao=f"Multa por cartao {payload.tipo.value}",
            referencia=datetime.now().strftime("%m/%Y"),
            status=StatusPagamento.PENDENTE
        )
        db.add(pagamento)
        cartao.multa_gerada = True

    db.commit()
    return {"message": f"Cartao {payload.tipo.value} adicionado", "jogo_id": jogo.id}


@router.post("/{atleta_id}/cartoes/remover")
def remover_cartao(
    atleta_id: int,
    payload: CartaoRemovePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta nao encontrado")

    verificar_admin_racha(db, current_user, atleta.racha_id)

    cartao = db.query(Cartao).filter(
        Cartao.atleta_id == atleta.id,
        Cartao.tipo == payload.tipo
    ).order_by(Cartao.created_at.desc()).first()

    if not cartao:
        raise HTTPException(status_code=404, detail=f"Nenhum cartao {payload.tipo.value} para remover")

    # Remove uma multa pendente correspondente, quando existir.
    tipo_multa = TipoPagamento.MULTA_AMARELO if payload.tipo == TipoCartao.AMARELO else TipoPagamento.MULTA_VERMELHO
    multa = db.query(Pagamento).filter(
        Pagamento.atleta_id == atleta.id,
        Pagamento.tipo == tipo_multa,
        Pagamento.status == StatusPagamento.PENDENTE
    ).order_by(Pagamento.created_at.desc()).first()
    if multa:
        db.delete(multa)

    db.delete(cartao)
    db.commit()
    return {"message": f"Cartao {payload.tipo.value} removido"}


@router.post("/{atleta_id}/confirmar-pagamento")
def confirmar_pagamento_atleta(
    atleta_id: int,
    payload: ConfirmarPagamentoPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta nao encontrado")

    admin = verificar_admin_racha(db, current_user, atleta.racha_id)
    referencia = payload.referencia or datetime.now().strftime("%m/%Y")

    pagamento = db.query(Pagamento).filter(
        Pagamento.atleta_id == atleta.id,
        Pagamento.tipo == TipoPagamento.MENSALIDADE,
        Pagamento.referencia == referencia
    ).order_by(Pagamento.created_at.desc()).first()

    if payload.confirmado:
        if not pagamento:
            valor = payload.valor if payload.valor is not None else admin.racha.valor_mensalidade
            if not valor or valor <= 0:
                raise HTTPException(status_code=400, detail="Informe um valor maior que zero para confirmar o pagamento")
            pagamento = Pagamento(
                atleta_id=atleta.id,
                tipo=TipoPagamento.MENSALIDADE,
                valor=valor,
                referencia=referencia,
                descricao=f"Mensalidade {referencia} (confirmada manualmente)"
            )
            db.add(pagamento)

        pagamento.status = StatusPagamento.APROVADO
        pagamento.aprovado_por = admin.id
        pagamento.data_aprovacao = datetime.now()
        pagamento.motivo_rejeicao = None
    else:
        if pagamento:
            pagamento.status = StatusPagamento.PENDENTE
            pagamento.aprovado_por = None
            pagamento.data_aprovacao = None

    db.commit()
    return {"atleta_id": atleta.id, "referencia": referencia, "confirmado": payload.confirmado}


@router.post("/{atleta_id}/foto", response_model=AtletaResponse)
def upload_foto(
    atleta_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload de foto do atleta"""
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    # Verifica se o usuário pode editar (é o próprio atleta ou admin do racha)
    is_own_profile = atleta.user_id == current_user.id
    try:
        is_admin = verificar_admin_racha(db, current_user, atleta.racha_id)
    except HTTPException:
        is_admin = False

    if not is_own_profile and not is_admin:
        raise HTTPException(status_code=403, detail="Sem permissão para editar este atleta")

    # Valida extensão do arquivo
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extensão não permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Valida tamanho do arquivo
    file.file.seek(0, 2)  # Vai para o final
    file_size = file.file.tell()
    file.file.seek(0)  # Volta para o início
    if file_size > settings.max_upload_size:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Máximo: {settings.max_upload_size // (1024 * 1024)}MB"
        )

    # Cria diretório se não existe
    upload_dir = os.path.join(get_upload_dir(), "atletas")
    os.makedirs(upload_dir, exist_ok=True)

    # Remove foto antiga se existir
    if atleta.foto_url:
        old_path = os.path.join(settings.get_upload_path(), atleta.foto_url.lstrip('/'))
        if os.path.exists(old_path):
            os.remove(old_path)

    # Gera nome único e salva arquivo
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Atualiza URL no banco
    atleta.foto_url = f"/uploads/atletas/{filename}"
    db.commit()
    db.refresh(atleta)

    return atleta


@router.delete("/{atleta_id}/foto", response_model=AtletaResponse)
def remover_foto(
    atleta_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove foto do atleta"""
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    # Verifica permissão
    is_own_profile = atleta.user_id == current_user.id
    try:
        is_admin = verificar_admin_racha(db, current_user, atleta.racha_id)
    except HTTPException:
        is_admin = False

    if not is_own_profile and not is_admin:
        raise HTTPException(status_code=403, detail="Sem permissão para editar este atleta")

    # Remove arquivo se existir
    if atleta.foto_url:
        filepath = os.path.join(settings.get_upload_path(), atleta.foto_url.lstrip('/'))
        if os.path.exists(filepath):
            os.remove(filepath)
        atleta.foto_url = None
        db.commit()
        db.refresh(atleta)

    return atleta

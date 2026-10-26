from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.esportes import Esporte, esporte_da_modalidade
from app.models import User, Atleta, Posicao, Racha, RachaAdmin


def assinatura_ativa(user: User) -> bool:
    """Retorna True se o admin pode gerenciar: assinatura ativa OU dentro do trial.

    Quando ``payments_enabled`` está desligado, o acesso é sempre liberado
    (modo de teste gratuito).
    """
    settings = get_settings()
    if not settings.payments_enabled:
        return True
    if user.subscription_status == "active":
        return True
    created = user.created_at
    if created is not None:
        trial_dias = settings.assinatura_trial_dias
        agora = datetime.now(created.tzinfo or timezone.utc)
        if agora < created + timedelta(days=trial_dias):
            return True
    return False


def exigir_assinatura(user: User) -> None:
    """Bloqueia ações de gestão quando o admin não tem assinatura ativa nem trial válido."""
    if not assinatura_ativa(user):
        raise HTTPException(
            status_code=402,
            detail="Assinatura necessária para gerenciar o racha",
        )


def esporte_do_racha(db: Session, racha_id: int) -> Esporte:
    racha = db.query(Racha).filter(Racha.id == racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    return esporte_da_modalidade(racha.tipo)


def exigir_recurso(db: Session, racha_id: int, recurso: str) -> None:
    esporte = esporte_do_racha(db, racha_id)
    if not esporte.tem(recurso):
        raise HTTPException(status_code=400, detail=f"Recurso indisponível para {esporte.nome}")


def posicao_do_esporte(esporte: Esporte, posicao) -> Posicao:
    """Valida a posição contra o esporte; sem posição, usa a padrão do esporte."""
    if posicao is None:
        return Posicao(esporte.posicao_padrao)
    if Posicao(posicao).value not in esporte.posicoes:
        raise HTTPException(status_code=422, detail=f"Posição inválida para {esporte.nome}")
    return Posicao(posicao)


def verificar_acesso_racha(db: Session, user: User, racha_id: int):
    """Verifica se o usuário tem acesso ao racha (admin ou atleta)."""
    admin = db.query(RachaAdmin).filter(
        RachaAdmin.user_id == user.id,
        RachaAdmin.racha_id == racha_id,
        RachaAdmin.ativo.is_(True)
    ).first()
    if admin:
        return {"tipo": "admin", "obj": admin}

    atleta = db.query(Atleta).filter(
        Atleta.user_id == user.id,
        Atleta.racha_id == racha_id,
        Atleta.ativo.is_(True)
    ).first()
    if atleta:
        return {"tipo": "atleta", "obj": atleta}

    raise HTTPException(status_code=403, detail="Sem acesso a este racha")


def verificar_admin_racha(db: Session, user: User, racha_id: int):
    """Verifica se o usuário é admin do racha."""
    admin = db.query(RachaAdmin).filter(
        RachaAdmin.user_id == user.id,
        RachaAdmin.racha_id == racha_id,
        RachaAdmin.ativo.is_(True)
    ).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem realizar esta ação")
    exigir_assinatura(user)
    return admin

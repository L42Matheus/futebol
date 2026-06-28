from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import User, Atleta, RachaAdmin


def assinatura_ativa(user: User) -> bool:
    """Retorna True se o admin pode gerenciar: assinatura ativa OU dentro do trial."""
    if user.subscription_status == "active":
        return True
    created = user.created_at
    if created is not None:
        trial_dias = get_settings().assinatura_trial_dias
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

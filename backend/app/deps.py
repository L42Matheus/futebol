from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import User, Atleta, RachaAdmin, UserRole


def verificar_assinatura_admin(user: User):
    if user.role == UserRole.ADMIN and not user.admin_billing_active:
        raise HTTPException(
            status_code=402,
            detail="Assinatura mensal obrigatória para acessar a área administrativa",
        )


def verificar_acesso_racha(db: Session, user: User, racha_id: int):
    """Verifica se o usuário tem acesso ao racha (admin ou atleta)."""
    admin = db.query(RachaAdmin).filter(
        RachaAdmin.user_id == user.id,
        RachaAdmin.racha_id == racha_id,
        RachaAdmin.ativo.is_(True)
    ).first()
    if admin:
        verificar_assinatura_admin(user)
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
    verificar_assinatura_admin(user)
    admin = db.query(RachaAdmin).filter(
        RachaAdmin.user_id == user.id,
        RachaAdmin.racha_id == racha_id,
        RachaAdmin.ativo.is_(True)
    ).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem realizar esta ação")
    return admin

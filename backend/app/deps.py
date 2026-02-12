from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Atleta, RachaAdmin
from app.services.auth import get_current_user


def verificar_acesso_racha(db: Session, user: User, racha_id: int):
    """Verifica se o usuário tem acesso ao racha (admin ou atleta)"""
    # Verifica se é admin do racha
    admin = db.query(RachaAdmin).filter(
        RachaAdmin.user_id == user.id,
        RachaAdmin.racha_id == racha_id,
        RachaAdmin.ativo == True
    ).first()
    if admin:
        return {"tipo": "admin", "obj": admin}

    # Verifica se é atleta do racha
    atleta = db.query(Atleta).filter(
        Atleta.user_id == user.id,
        Atleta.racha_id == racha_id,
        Atleta.ativo == True
    ).first()
    if atleta:
        return {"tipo": "atleta", "obj": atleta}

    raise HTTPException(status_code=403, detail="Sem acesso a este racha")


def verificar_admin_racha(db: Session, user: User, racha_id: int):
    """Verifica se o usuário é admin do racha"""
    admin = db.query(RachaAdmin).filter(
        RachaAdmin.user_id == user.id,
        RachaAdmin.racha_id == racha_id,
        RachaAdmin.ativo == True
    ).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem realizar esta ação")
    return admin

"""Exclusão de conta pedida pelo próprio usuário (exigência das lojas e da LGPD)."""

import logging
import os

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AthleteProfile, Atleta, Invite, PushToken, Racha, RachaAdmin, User

logger = logging.getLogger(__name__)


def _apagar_foto(foto_url: str | None) -> None:
    if not foto_url or not foto_url.startswith("/uploads/"):
        return
    caminho = os.path.join(get_settings().get_upload_path(), foto_url.removeprefix("/uploads/"))
    try:
        if os.path.exists(caminho):
            os.remove(caminho)
    except OSError:
        logger.warning("Não foi possível apagar a foto %s", caminho)


def excluir_conta(db: Session, user: User) -> None:
    """Apaga login, perfil, foto e acesso de admin do usuário.

    O nome do atleta continua nos rachas (lista de jogos, presença, caixa), porque esses
    registros pertencem ao racha; ele só deixa de estar ligado a uma conta. Racha que fica
    sem nenhum admin é desativado.
    """
    perfil = db.query(AthleteProfile).filter(AthleteProfile.user_id == user.id).first()
    if perfil:
        _apagar_foto(perfil.foto_url)
        db.delete(perfil)

    for atleta in db.query(Atleta).filter(Atleta.user_id == user.id).all():
        atleta.user_id = None
        atleta.telefone = None
        atleta.foto_url = None

    rachas_do_usuario = [
        admin.racha_id for admin in db.query(RachaAdmin).filter(RachaAdmin.user_id == user.id).all()
    ]
    db.query(RachaAdmin).filter(RachaAdmin.user_id == user.id).delete(synchronize_session=False)
    db.flush()
    for racha_id in rachas_do_usuario:
        outros_admins = db.query(RachaAdmin).filter(
            RachaAdmin.racha_id == racha_id, RachaAdmin.ativo.is_(True)
        ).count()
        if not outros_admins:
            racha = db.query(Racha).filter(Racha.id == racha_id).first()
            if racha:
                racha.ativo = False

    db.query(PushToken).filter(PushToken.user_id == user.id).delete(synchronize_session=False)
    db.query(Invite).filter(Invite.criado_por_user_id == user.id).update(
        {Invite.criado_por_user_id: None}, synchronize_session=False
    )

    db.delete(user)
    db.commit()

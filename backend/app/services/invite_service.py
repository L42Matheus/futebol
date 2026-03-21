"""Serviço para processamento de convites (invite tokens)."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models import (
    Atleta,
    AthleteProfile,
    Invite,
    InviteRole,
    InviteStatus,
    RachaAdmin,
    TeamMember,
    User,
)


def processar_invite(db: Session, user: User, invite: Invite) -> None:
    """
    Processa um convite pendente associando o usuário ao racha como admin ou atleta.
    Marca o convite como aceito e faz flush/commit dos objetos necessários.
    Deve ser chamado dentro de uma transação ativa — o commit final fica por conta do chamador.
    """
    if invite.status != InviteStatus.PENDENTE:
        return

    if invite.role == InviteRole.ADMIN:
        existing = db.query(RachaAdmin).filter(
            RachaAdmin.user_id == user.id,
            RachaAdmin.racha_id == invite.racha_id,
        ).first()
        if not existing:
            db.add(RachaAdmin(
                user_id=user.id,
                racha_id=invite.racha_id,
                is_owner=False,
                ativo=True,
            ))
    else:
        existing_atleta = db.query(Atleta).filter(
            Atleta.user_id == user.id,
            Atleta.racha_id == invite.racha_id,
        ).first()
        if not existing_atleta:
            profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == user.id).first()
            atleta = Atleta(
                user_id=user.id,
                racha_id=invite.racha_id,
                nome=invite.nome or user.nome or "Atleta",
                telefone=invite.telefone or user.telefone,
                ativo=True,
                foto_url=profile.foto_url if profile else None,
            )
            db.add(atleta)
            db.flush()
            if invite.team_id:
                db.add(TeamMember(team_id=invite.team_id, atleta_id=atleta.id, ativo=True))

    invite.status = InviteStatus.ACEITO
    invite.aceito_em = datetime.now(timezone.utc).replace(tzinfo=None)

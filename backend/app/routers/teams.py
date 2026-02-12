from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Team, TeamMember, Atleta, Racha, User
from app.schemas.team import (
    TeamCreate, TeamUpdate, TeamResponse,
    TeamMemberCreate, TeamMemberUpdate, TeamMemberResponse,
    TeamWithMembers, TeamWithMembersDetailed, TeamMemberWithAtleta, AtletaResumo
)
from app.services.auth import get_current_user
from app.deps import verificar_admin_racha

router = APIRouter(prefix="/teams", tags=["Times"])


@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def criar_time(payload: TeamCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_admin_racha(db, current_user, payload.racha_id)
    racha = db.query(Racha).filter(Racha.id == payload.racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    team = Team(racha_id=payload.racha_id, nome=payload.nome, ativo=True)
    db.add(team)
    db.commit()
    db.refresh(team)
    return TeamResponse.model_validate(team)


def _build_member_with_atleta(member: TeamMember) -> dict:
    """Constrói o response do membro com dados do atleta"""
    atleta = member.atleta
    return {
        "id": member.id,
        "team_id": member.team_id,
        "atleta_id": member.atleta_id,
        "ativo": member.ativo,
        "desde": member.desde,
        "ate": member.ate,
        "is_titular": member.is_titular if member.is_titular is not None else True,
        "posicao_escalacao": member.posicao_escalacao,
        "ordem_banco": member.ordem_banco,
        "atleta": {
            "id": atleta.id,
            "nome": atleta.nome,
            "apelido": atleta.apelido,
            "foto_url": atleta.foto_url,
            "posicao": atleta.posicao.value if atleta.posicao else "meia",
            "numero_camisa": atleta.numero_camisa
        }
    }


@router.get("/", response_model=List[TeamWithMembersDetailed])
def listar_times(racha_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_admin_racha(db, current_user, racha_id)
    teams = db.query(Team).filter(Team.racha_id == racha_id, Team.ativo == True).all()
    result = []
    for team in teams:
        membros = db.query(TeamMember).options(
            joinedload(TeamMember.atleta)
        ).filter(TeamMember.team_id == team.id, TeamMember.ativo == True).all()

        membros_detailed = [_build_member_with_atleta(m) for m in membros]
        result.append({
            **TeamResponse.model_validate(team).model_dump(),
            "membros": membros_detailed
        })
    return result


@router.get("/{team_id}", response_model=TeamWithMembersDetailed)
def obter_time(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id, Team.ativo == True).first()
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    verificar_admin_racha(db, current_user, team.racha_id)
    membros = db.query(TeamMember).options(
        joinedload(TeamMember.atleta)
    ).filter(TeamMember.team_id == team_id, TeamMember.ativo == True).all()

    membros_detailed = [_build_member_with_atleta(m) for m in membros]
    return {
        **TeamResponse.model_validate(team).model_dump(),
        "membros": membros_detailed
    }


@router.patch("/{team_id}", response_model=TeamResponse)
def atualizar_time(team_id: int, payload: TeamUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    verificar_admin_racha(db, current_user, team.racha_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return TeamResponse.model_validate(team)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_time(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    verificar_admin_racha(db, current_user, team.racha_id)
    team.ativo = False
    db.commit()


@router.post("/{team_id}/members", response_model=TeamMemberWithAtleta, status_code=status.HTTP_201_CREATED)
def adicionar_membro(team_id: int, payload: TeamMemberCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id, Team.ativo == True).first()
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    verificar_admin_racha(db, current_user, team.racha_id)
    atleta = db.query(Atleta).filter(Atleta.id == payload.atleta_id, Atleta.racha_id == team.racha_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")

    # Desativa memberships anteriores do atleta neste racha
    active_memberships = db.query(TeamMember).join(Team).filter(
        TeamMember.atleta_id == atleta.id,
        TeamMember.ativo == True,
        Team.racha_id == team.racha_id
    ).all()
    for member in active_memberships:
        member.ativo = False
        member.ate = datetime.utcnow()

    # Cria novo membro com campos de escalação
    new_member = TeamMember(
        team_id=team_id,
        atleta_id=atleta.id,
        ativo=True,
        is_titular=payload.is_titular if payload.is_titular is not None else True,
        posicao_escalacao=payload.posicao_escalacao or atleta.posicao.value
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return _build_member_with_atleta(new_member)


@router.patch("/{team_id}/members/{atleta_id}", response_model=TeamMemberWithAtleta)
def atualizar_membro(
    team_id: int,
    atleta_id: int,
    payload: TeamMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza posição e status de titular/reserva de um membro do time"""
    team = db.query(Team).filter(Team.id == team_id, Team.ativo == True).first()
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    verificar_admin_racha(db, current_user, team.racha_id)

    member = db.query(TeamMember).options(
        joinedload(TeamMember.atleta)
    ).filter(
        TeamMember.team_id == team_id,
        TeamMember.atleta_id == atleta_id,
        TeamMember.ativo == True
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Atleta não está no time")

    # Atualiza campos
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(member, field, value)

    db.commit()
    db.refresh(member)
    return _build_member_with_atleta(member)


@router.delete("/{team_id}/members/{atleta_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_membro(team_id: int, atleta_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id, Team.ativo == True).first()
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    verificar_admin_racha(db, current_user, team.racha_id)
    member = db.query(TeamMember).filter(TeamMember.team_id == team_id, TeamMember.atleta_id == atleta_id, TeamMember.ativo == True).first()
    if not member:
        raise HTTPException(status_code=404, detail="Atleta não está no time")
    member.ativo = False
    member.ate = datetime.utcnow()
    db.commit()

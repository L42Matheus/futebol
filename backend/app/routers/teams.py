from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Team, TeamMember, Atleta, Racha, User
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse, TeamMemberCreate, TeamMemberResponse, TeamWithMembers
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


@router.get("/", response_model=List[TeamWithMembers])
def listar_times(racha_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_admin_racha(db, current_user, racha_id)
    teams = db.query(Team).filter(Team.racha_id == racha_id, Team.ativo == True).all()
    result = []
    for team in teams:
        membros = db.query(TeamMember).filter(TeamMember.team_id == team.id, TeamMember.ativo == True).all()
        result.append(TeamWithMembers(**TeamResponse.model_validate(team).model_dump(), membros=[TeamMemberResponse.model_validate(m) for m in membros]))
    return result


@router.get("/{team_id}", response_model=TeamWithMembers)
def obter_time(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id, Team.ativo == True).first()
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    verificar_admin_racha(db, current_user, team.racha_id)
    membros = db.query(TeamMember).filter(TeamMember.team_id == team_id, TeamMember.ativo == True).all()
    return TeamWithMembers(**TeamResponse.model_validate(team).model_dump(), membros=[TeamMemberResponse.model_validate(m) for m in membros])


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


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
def adicionar_membro(team_id: int, payload: TeamMemberCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id, Team.ativo == True).first()
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    verificar_admin_racha(db, current_user, team.racha_id)
    atleta = db.query(Atleta).filter(Atleta.id == payload.atleta_id, Atleta.racha_id == team.racha_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    active_memberships = db.query(TeamMember).join(Team).filter(
        TeamMember.atleta_id == atleta.id,
        TeamMember.ativo == True,
        Team.racha_id == team.racha_id
    ).all()
    for member in active_memberships:
        member.ativo = False
        member.ate = datetime.utcnow()
    new_member = TeamMember(team_id=team_id, atleta_id=atleta.id, ativo=True)
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return TeamMemberResponse.model_validate(new_member)


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

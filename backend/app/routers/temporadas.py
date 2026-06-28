from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Temporada, StatusTemporada, Team, User
from app.schemas.temporada import TemporadaCreate, TemporadaUpdate, TemporadaResponse
from app.services.auth import get_current_user
from app.deps import verificar_acesso_racha, verificar_admin_racha


router = APIRouter(prefix="/temporadas", tags=["Temporadas"])


@router.get("/", response_model=List[TemporadaResponse])
def listar(
    racha_id: int,
    status_filter: Optional[StatusTemporada] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verificar_acesso_racha(db, current_user, racha_id)
    query = db.query(Temporada).filter(Temporada.racha_id == racha_id)
    if status_filter is not None:
        query = query.filter(Temporada.status == status_filter)
    return query.order_by(Temporada.ano.desc(), Temporada.mes.desc(), Temporada.id.desc()).all()


@router.get("/active", response_model=Optional[TemporadaResponse])
def obter_ativa(
    racha_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verificar_acesso_racha(db, current_user, racha_id)
    return (
        db.query(Temporada)
        .filter(Temporada.racha_id == racha_id, Temporada.status == StatusTemporada.ATIVA)
        .order_by(Temporada.ano.desc(), Temporada.mes.desc(), Temporada.id.desc())
        .first()
    )


@router.post("/", response_model=TemporadaResponse, status_code=status.HTTP_201_CREATED)
def criar(
    payload: TemporadaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verificar_admin_racha(db, current_user, payload.racha_id)

    # Só pode ter uma temporada ATIVA por racha por vez.
    if payload.status == StatusTemporada.ATIVA:
        existing_active = (
            db.query(Temporada)
            .filter(Temporada.racha_id == payload.racha_id, Temporada.status == StatusTemporada.ATIVA)
            .first()
        )
        if existing_active:
            raise HTTPException(
                status_code=400,
                detail="Já existe uma temporada ativa neste racha. Encerre antes de criar outra.",
            )

    temporada = Temporada(
        racha_id=payload.racha_id,
        nome=payload.nome,
        mes=payload.mes,
        ano=payload.ano,
        status=payload.status,
    )
    db.add(temporada)
    db.commit()
    db.refresh(temporada)
    return temporada


@router.patch("/{temporada_id}", response_model=TemporadaResponse)
def atualizar(
    temporada_id: int,
    payload: TemporadaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    temporada = db.query(Temporada).filter(Temporada.id == temporada_id).first()
    if not temporada:
        raise HTTPException(status_code=404, detail="Temporada não encontrada")
    verificar_admin_racha(db, current_user, temporada.racha_id)

    update_data = payload.model_dump(exclude_unset=True)

    # Se está reabrindo / ativando, não pode haver outra ativa.
    if update_data.get("status") == StatusTemporada.ATIVA and temporada.status != StatusTemporada.ATIVA:
        existing_active = (
            db.query(Temporada)
            .filter(
                Temporada.racha_id == temporada.racha_id,
                Temporada.status == StatusTemporada.ATIVA,
                Temporada.id != temporada.id,
            )
            .first()
        )
        if existing_active:
            raise HTTPException(
                status_code=400,
                detail="Outra temporada já está ativa. Encerre-a primeiro.",
            )

    if "campeao_team_id" in update_data and update_data["campeao_team_id"] is not None:
        team = db.query(Team).filter(Team.id == update_data["campeao_team_id"]).first()
        if not team or team.racha_id != temporada.racha_id:
            raise HTTPException(status_code=400, detail="Time campeão não pertence a este racha")

    for field, value in update_data.items():
        setattr(temporada, field, value)

    db.commit()
    db.refresh(temporada)
    return temporada


@router.delete("/{temporada_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(
    temporada_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    temporada = db.query(Temporada).filter(Temporada.id == temporada_id).first()
    if not temporada:
        raise HTTPException(status_code=404, detail="Temporada não encontrada")
    verificar_admin_racha(db, current_user, temporada.racha_id)

    # Desvincula times antes de deletar pra não quebrar FK
    db.query(Team).filter(Team.temporada_id == temporada_id).update({Team.temporada_id: None})
    db.delete(temporada)
    db.commit()

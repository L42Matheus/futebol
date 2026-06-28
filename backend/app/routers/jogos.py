from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models import Jogo, Racha, Presenca, Atleta, StatusPresenca, User, Team
from app.schemas.jogo import JogoCreate, JogoUpdate, JogoResponse
from app.services.auth import get_current_user
from app.deps import verificar_acesso_racha

router = APIRouter(prefix="/jogos", tags=["Jogos"])

BRT = timezone(timedelta(hours=-3)) 


def _resolve_team(db: Session, racha_id: int, team_id: Optional[int]):
    if not team_id:
        return None
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team or team.racha_id != racha_id:
        raise HTTPException(status_code=400, detail="Time selecionado não pertence a este racha")
    return team


@router.post("/", response_model=JogoResponse, status_code=status.HTTP_201_CREATED)
def criar_jogo(jogo: JogoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_acesso_racha(db, current_user, jogo.racha_id)
    racha = db.query(Racha).filter(Racha.id == jogo.racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    data = jogo.model_dump()
    if data.get("valor_campo") is None:
        data["valor_campo"] = 0

    team_a = _resolve_team(db, jogo.racha_id, data.get("time_a_id"))
    team_b = _resolve_team(db, jogo.racha_id, data.get("time_b_id"))
    if team_a and not data.get("time_a_nome"):
        data["time_a_nome"] = team_a.nome
    if team_b and not data.get("time_b_nome"):
        data["time_b_nome"] = team_b.nome

    db_jogo = Jogo(**data)
    db.add(db_jogo)
    db.commit()
    db.refresh(db_jogo)
    atletas = db.query(Atleta).filter(Atleta.racha_id == jogo.racha_id, Atleta.ativo.is_(True)).all()
    for atleta in atletas:
        presenca = Presenca(jogo_id=db_jogo.id, atleta_id=atleta.id, status=StatusPresenca.PENDENTE)
        db.add(presenca)
    db.commit()
    return JogoResponse(**{c.name: getattr(db_jogo, c.name) for c in db_jogo.__table__.columns}, total_confirmados=0)


@router.get("/", response_model=List[JogoResponse])
def listar_jogos(racha_id: int, apenas_futuros: bool = True, skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_acesso_racha(db, current_user, racha_id)
    query = db.query(Jogo).filter(Jogo.racha_id == racha_id, Jogo.cancelado.is_(False))
    if apenas_futuros:
        agora_brt = datetime.now(BRT).replace(tzinfo=None)
        query = query.filter(Jogo.data_hora >= agora_brt)
    jogos = query.order_by(Jogo.data_hora).offset(skip).limit(limit).all()
    jogo_ids = [j.id for j in jogos]

    # Busca todos os contadores de confirmados em uma única query
    confirmados_por_jogo: dict[int, int] = {}
    if jogo_ids:
        rows = (
            db.query(Presenca.jogo_id, func.count(Presenca.id))
            .filter(Presenca.jogo_id.in_(jogo_ids), Presenca.status == StatusPresenca.CONFIRMADO)
            .group_by(Presenca.jogo_id)
            .all()
        )
        confirmados_por_jogo = {jogo_id: count for jogo_id, count in rows}

    return [
        JogoResponse(**{c.name: getattr(jogo, c.name) for c in jogo.__table__.columns}, total_confirmados=confirmados_por_jogo.get(jogo.id, 0))
        for jogo in jogos
    ]


@router.get("/{jogo_id}", response_model=JogoResponse)
def obter_jogo(jogo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jogo = db.query(Jogo).filter(Jogo.id == jogo_id).first()
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    verificar_acesso_racha(db, current_user, jogo.racha_id)
    confirmados = db.query(func.count(Presenca.id)).filter(
        Presenca.jogo_id == jogo.id, Presenca.status == StatusPresenca.CONFIRMADO).scalar()
    return JogoResponse(**{c.name: getattr(jogo, c.name) for c in jogo.__table__.columns}, total_confirmados=confirmados)


@router.patch("/{jogo_id}", response_model=JogoResponse)
def atualizar_jogo(jogo_id: int, jogo_update: JogoUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jogo = db.query(Jogo).filter(Jogo.id == jogo_id).first()
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    verificar_acesso_racha(db, current_user, jogo.racha_id)
    update_data = jogo_update.model_dump(exclude_unset=True)
    if "placar_time_a" in update_data and "placar_time_b" in update_data:
        update_data["finalizado"] = True

    if "time_a_id" in update_data:
        team_a = _resolve_team(db, jogo.racha_id, update_data["time_a_id"])
        if team_a and "time_a_nome" not in update_data:
            update_data["time_a_nome"] = team_a.nome
    if "time_b_id" in update_data:
        team_b = _resolve_team(db, jogo.racha_id, update_data["time_b_id"])
        if team_b and "time_b_nome" not in update_data:
            update_data["time_b_nome"] = team_b.nome

    for field, value in update_data.items():
        setattr(jogo, field, value)
    db.commit()
    db.refresh(jogo)
    confirmados = db.query(func.count(Presenca.id)).filter(
        Presenca.jogo_id == jogo.id, Presenca.status == StatusPresenca.CONFIRMADO).scalar()
    return JogoResponse(**{c.name: getattr(jogo, c.name) for c in jogo.__table__.columns}, total_confirmados=confirmados)


@router.delete("/{jogo_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_jogo(jogo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jogo = db.query(Jogo).filter(Jogo.id == jogo_id).first()
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    verificar_acesso_racha(db, current_user, jogo.racha_id)
    jogo.cancelado = True
    db.commit()


@router.get("/{jogo_id}/lista")
def obter_lista_presenca(jogo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jogo = db.query(Jogo).filter(Jogo.id == jogo_id).first()
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    verificar_acesso_racha(db, current_user, jogo.racha_id)
    presencas = db.query(Presenca, Atleta).join(Atleta).filter(Presenca.jogo_id == jogo_id).all()
    confirmados, pendentes, recusados = [], [], []
    for presenca, atleta in presencas:
        item = {"atleta_id": atleta.id, "user_id": atleta.user_id, "nome": atleta.nome, "apelido": atleta.apelido,
                "posicao": atleta.posicao.value, "status": presenca.status.value}
        if presenca.status == StatusPresenca.CONFIRMADO:
            confirmados.append(item)
        elif presenca.status == StatusPresenca.RECUSADO:
            recusados.append(item)
        else:
            pendentes.append(item)
    return {"jogo_id": jogo_id, "data_hora": jogo.data_hora, "local": jogo.local,
            "confirmados": confirmados, "pendentes": pendentes, "recusados": recusados,
            "total_confirmados": len(confirmados), "total_pendentes": len(pendentes), "total_recusados": len(recusados)}

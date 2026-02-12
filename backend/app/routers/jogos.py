from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Jogo, Racha, Presenca, Atleta, StatusPresenca, User
from app.schemas.jogo import JogoCreate, JogoUpdate, JogoResponse
from app.services.auth import get_current_user
from app.deps import verificar_acesso_racha, verificar_admin_racha

router = APIRouter(prefix="/jogos", tags=["Jogos"])


@router.post("/", response_model=JogoResponse, status_code=status.HTTP_201_CREATED)
def criar_jogo(jogo: JogoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_acesso_racha(db, current_user, jogo.racha_id)
    racha = db.query(Racha).filter(Racha.id == jogo.racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    data = jogo.model_dump()
    if data.get("valor_campo") is None:
        data["valor_campo"] = 0
    db_jogo = Jogo(**data)
    db.add(db_jogo)
    db.commit()
    db.refresh(db_jogo)
    atletas = db.query(Atleta).filter(Atleta.racha_id == jogo.racha_id, Atleta.ativo == True).all()
    for atleta in atletas:
        presenca = Presenca(jogo_id=db_jogo.id, atleta_id=atleta.id, status=StatusPresenca.PENDENTE)
        db.add(presenca)
    db.commit()
    return JogoResponse(**{c.name: getattr(db_jogo, c.name) for c in db_jogo.__table__.columns}, total_confirmados=0)


@router.get("/", response_model=List[JogoResponse])
def listar_jogos(racha_id: int, apenas_futuros: bool = True, skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_acesso_racha(db, current_user, racha_id)
    query = db.query(Jogo).filter(Jogo.racha_id == racha_id, Jogo.cancelado == False)
    if apenas_futuros:
        query = query.filter(Jogo.data_hora >= datetime.now())
    jogos = query.order_by(Jogo.data_hora).offset(skip).limit(limit).all()
    result = []
    for jogo in jogos:
        confirmados = db.query(func.count(Presenca.id)).filter(
            Presenca.jogo_id == jogo.id, Presenca.status == StatusPresenca.CONFIRMADO).scalar()
        result.append(JogoResponse(**{c.name: getattr(jogo, c.name) for c in jogo.__table__.columns}, total_confirmados=confirmados))
    return result


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
    for field, value in jogo_update.model_dump(exclude_unset=True).items():
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
        item = {"atleta_id": atleta.id, "nome": atleta.nome, "apelido": atleta.apelido,
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

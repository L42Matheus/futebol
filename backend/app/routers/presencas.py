from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Presenca, Jogo, Atleta, StatusPresenca
from app.schemas.presenca import PresencaCreate, PresencaUpdate, PresencaResponse

router = APIRouter(prefix="/presencas", tags=["Presenças"])


@router.post("/", response_model=PresencaResponse, status_code=status.HTTP_201_CREATED)
def criar_presenca(presenca: PresencaCreate, db: Session = Depends(get_db)):
    existing = db.query(Presenca).filter(
        Presenca.jogo_id == presenca.jogo_id, Presenca.atleta_id == presenca.atleta_id).first()
    if existing:
        existing.status = presenca.status
        db.commit()
        db.refresh(existing)
        atleta = db.query(Atleta).filter(Atleta.id == existing.atleta_id).first()
        return PresencaResponse(**{c.name: getattr(existing, c.name) for c in existing.__table__.columns},
                                atleta_nome=atleta.nome if atleta else None,
                                atleta_posicao=atleta.posicao.value if atleta else None)
    jogo = db.query(Jogo).filter(Jogo.id == presenca.jogo_id).first()
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    atleta = db.query(Atleta).filter(Atleta.id == presenca.atleta_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    if atleta.racha_id != jogo.racha_id:
        raise HTTPException(status_code=400, detail="Atleta não pertence a este racha")
    db_presenca = Presenca(**presenca.model_dump())
    db.add(db_presenca)
    db.commit()
    db.refresh(db_presenca)
    return PresencaResponse(**{c.name: getattr(db_presenca, c.name) for c in db_presenca.__table__.columns},
                            atleta_nome=atleta.nome, atleta_posicao=atleta.posicao.value)


@router.patch("/{presenca_id}", response_model=PresencaResponse)
def atualizar_presenca(presenca_id: int, presenca_update: PresencaUpdate, db: Session = Depends(get_db)):
    presenca = db.query(Presenca).filter(Presenca.id == presenca_id).first()
    if not presenca:
        raise HTTPException(status_code=404, detail="Presença não encontrada")
    presenca.status = presenca_update.status
    db.commit()
    db.refresh(presenca)
    atleta = db.query(Atleta).filter(Atleta.id == presenca.atleta_id).first()
    return PresencaResponse(**{c.name: getattr(presenca, c.name) for c in presenca.__table__.columns},
                            atleta_nome=atleta.nome if atleta else None,
                            atleta_posicao=atleta.posicao.value if atleta else None)


@router.post("/confirmar/{jogo_id}/{atleta_id}")
def confirmar_presenca(jogo_id: int, atleta_id: int, db: Session = Depends(get_db)):
    presenca = db.query(Presenca).filter(Presenca.jogo_id == jogo_id, Presenca.atleta_id == atleta_id).first()
    if not presenca:
        raise HTTPException(status_code=404, detail="Presença não encontrada")
    presenca.status = StatusPresenca.CONFIRMADO
    db.commit()
    return {"message": "Presença confirmada", "status": "confirmado"}


@router.post("/recusar/{jogo_id}/{atleta_id}")
def recusar_presenca(jogo_id: int, atleta_id: int, db: Session = Depends(get_db)):
    presenca = db.query(Presenca).filter(Presenca.jogo_id == jogo_id, Presenca.atleta_id == atleta_id).first()
    if not presenca:
        raise HTTPException(status_code=404, detail="Presença não encontrada")
    presenca.status = StatusPresenca.RECUSADO
    db.commit()
    return {"message": "Presença recusada", "status": "recusado"}

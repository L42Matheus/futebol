from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models import Racha, TipoRacha, Atleta
from app.schemas.racha import RachaCreate, RachaUpdate, RachaResponse
from app.services.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/rachas", tags=["Rachas"])


def get_max_atletas(tipo: TipoRacha) -> int:
    limites = {TipoRacha.CAMPO: 40, TipoRacha.SOCIETY: 30, TipoRacha.FUTSAL: 20}
    return limites.get(tipo, 30)


@router.post("/", response_model=RachaResponse, status_code=status.HTTP_201_CREATED)
def criar_racha(racha: RachaCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_racha = Racha(**racha.model_dump(), max_atletas=get_max_atletas(racha.tipo))
    db.add(db_racha)
    db.commit()
    db.refresh(db_racha)
    admin = Atleta(
        user_id=current_user.id,
        racha_id=db_racha.id,
        nome=current_user.nome or "Administrador",
        telefone=current_user.telefone,
        is_admin=True,
        ativo=True,
    )
    db.add(admin)
    db.commit()
    return RachaResponse(**{c.name: getattr(db_racha, c.name) for c in db_racha.__table__.columns}, total_atletas=1)


@router.get("/", response_model=List[RachaResponse])
def listar_rachas(
    skip: int = 0,
    limit: int = 100,
    ativo: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Busca apenas rachas onde o usuário é atleta
    user_racha_ids = db.query(Atleta.racha_id).filter(
        Atleta.user_id == current_user.id,
        Atleta.ativo == True
    ).subquery()

    query = db.query(Racha).filter(
        Racha.ativo == ativo,
        Racha.id.in_(user_racha_ids)
    )
    rachas = query.offset(skip).limit(limit).all()
    result = []
    for racha in rachas:
        total = db.query(func.count(Atleta.id)).filter(Atleta.racha_id == racha.id, Atleta.ativo == True).scalar()
        result.append(RachaResponse(**{c.name: getattr(racha, c.name) for c in racha.__table__.columns}, total_atletas=total))
    return result


@router.get("/{racha_id}", response_model=RachaResponse)
def obter_racha(racha_id: int, db: Session = Depends(get_db)):
    racha = db.query(Racha).filter(Racha.id == racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    total = db.query(func.count(Atleta.id)).filter(Atleta.racha_id == racha.id, Atleta.ativo == True).scalar()
    return RachaResponse(**{c.name: getattr(racha, c.name) for c in racha.__table__.columns}, total_atletas=total)


@router.patch("/{racha_id}", response_model=RachaResponse)
def atualizar_racha(racha_id: int, racha_update: RachaUpdate, db: Session = Depends(get_db)):
    racha = db.query(Racha).filter(Racha.id == racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    update_data = racha_update.model_dump(exclude_unset=True)
    if "tipo" in update_data:
        update_data["max_atletas"] = get_max_atletas(update_data["tipo"])
    for field, value in update_data.items():
        setattr(racha, field, value)
    db.commit()
    db.refresh(racha)
    total = db.query(func.count(Atleta.id)).filter(Atleta.racha_id == racha.id, Atleta.ativo == True).scalar()
    return RachaResponse(**{c.name: getattr(racha, c.name) for c in racha.__table__.columns}, total_atletas=total)


@router.delete("/{racha_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_racha(racha_id: int, db: Session = Depends(get_db)):
    racha = db.query(Racha).filter(Racha.id == racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    racha.ativo = False
    db.commit()


@router.get("/{racha_id}/saldo")
def obter_saldo(racha_id: int, db: Session = Depends(get_db)):
    from app.models import Pagamento, StatusPagamento
    racha = db.query(Racha).filter(Racha.id == racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    total_recebido = db.query(func.sum(Pagamento.valor)).join(Atleta).filter(
        Atleta.racha_id == racha_id, Pagamento.status == StatusPagamento.APROVADO).scalar() or 0
    total_pendente = db.query(func.sum(Pagamento.valor)).join(Atleta).filter(
        Atleta.racha_id == racha_id,
        Pagamento.status.in_([StatusPagamento.PENDENTE, StatusPagamento.AGUARDANDO_APROVACAO])).scalar() or 0
    return {
        "racha_id": racha_id, "saldo": total_recebido, "pendente": total_pendente,
        "saldo_formatado": f"R$ {total_recebido / 100:.2f}", "pendente_formatado": f"R$ {total_pendente / 100:.2f}"
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Atleta, AtletaStat, User
from app.schemas.artilharia import ArtilhariaItem, ArtilhariaUpdate, ArtilhariaResponse
from app.services.auth import get_current_user
from app.deps import verificar_acesso_racha, verificar_admin_racha

router = APIRouter(prefix="/artilharia", tags=["Artilharia"])


def get_or_create_stat(db: Session, atleta: Atleta) -> AtletaStat:
    stat = db.query(AtletaStat).filter(
        AtletaStat.atleta_id == atleta.id,
        AtletaStat.racha_id == atleta.racha_id,
    ).first()
    if stat:
        return stat
    stat = AtletaStat(atleta_id=atleta.id, racha_id=atleta.racha_id, gols=0, assistencias=0)
    db.add(stat)
    db.commit()
    db.refresh(stat)
    return stat


@router.get("/", response_model=List[ArtilhariaItem])
def listar_artilharia(racha_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_acesso_racha(db, current_user, racha_id)
    atletas = db.query(Atleta).filter(Atleta.racha_id == racha_id, Atleta.ativo == True).all()
    items = []
    for atleta in atletas:
        stat = get_or_create_stat(db, atleta)
        items.append(ArtilhariaItem(
            atleta_id=atleta.id,
            racha_id=racha_id,
            nome=atleta.nome,
            apelido=atleta.apelido,
            posicao=atleta.posicao.value if atleta.posicao else None,
            foto_url=atleta.foto_url,
            gols=stat.gols,
            assistencias=stat.assistencias,
        ))
    items.sort(key=lambda i: (-i.gols, -i.assistencias, i.nome))
    return items


@router.patch("/{atleta_id}", response_model=ArtilhariaResponse)
def atualizar_artilharia(
    atleta_id: int,
    payload: ArtilhariaUpdate,
    racha_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verificar_admin_racha(db, current_user, racha_id)
    atleta = db.query(Atleta).filter(Atleta.id == atleta_id, Atleta.racha_id == racha_id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta nao encontrado")
    stat = get_or_create_stat(db, atleta)
    update = payload.model_dump(exclude_unset=True)
    for key, value in update.items():
        setattr(stat, key, value)
    db.commit()
    db.refresh(stat)
    return ArtilhariaResponse(
        atleta_id=stat.atleta_id,
        racha_id=stat.racha_id,
        gols=stat.gols,
        assistencias=stat.assistencias,
        updated_at=stat.updated_at,
    )

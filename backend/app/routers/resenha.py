"""Resenha do racha: linha do tempo com resultados, destaques, marcas, novidades e avisos do admin."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import verificar_acesso_racha, verificar_admin_racha
from app.models import Atleta, Noticia, User
from app.services.auth import get_current_user
from app.services.resenha import publicar

router = APIRouter(prefix="/rachas", tags=["Resenha"])


class NoticiaResponse(BaseModel):
    id: int
    tipo: str
    titulo: str
    texto: Optional[str] = None
    jogo_id: Optional[int] = None
    atleta_id: Optional[int] = None
    foto_url: Optional[str] = None
    autor: Optional[str] = None
    created_at: datetime


class NovoAviso(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=120)
    texto: Optional[str] = Field(None, max_length=1000)


def _resposta(n: Noticia, atletas: dict[int, Atleta], autores: dict[int, User]) -> NoticiaResponse:
    atleta = atletas.get(n.atleta_id) if n.atleta_id else None
    autor = autores.get(n.autor_user_id) if n.autor_user_id else None
    return NoticiaResponse(
        id=n.id,
        tipo=n.tipo,
        titulo=n.titulo,
        texto=n.texto,
        jogo_id=n.jogo_id,
        atleta_id=n.atleta_id,
        foto_url=atleta.foto_url if atleta else None,
        autor=(autor.nome or "Admin") if autor else None,
        created_at=n.created_at,
    )


@router.get("/{racha_id}/resenha", response_model=list[NoticiaResponse])
def listar(
    racha_id: int,
    limite: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verificar_acesso_racha(db, current_user, racha_id)
    noticias = (
        db.query(Noticia)
        .filter(Noticia.racha_id == racha_id)
        .order_by(Noticia.created_at.desc(), Noticia.id.desc())
        .limit(min(max(limite, 1), 100))
        .all()
    )
    ids_atletas = {n.atleta_id for n in noticias if n.atleta_id}
    ids_autores = {n.autor_user_id for n in noticias if n.autor_user_id}
    atletas = {a.id: a for a in db.query(Atleta).filter(Atleta.id.in_(ids_atletas))} if ids_atletas else {}
    autores = {u.id: u for u in db.query(User).filter(User.id.in_(ids_autores))} if ids_autores else {}
    return [_resposta(n, atletas, autores) for n in noticias]


@router.post("/{racha_id}/resenha", response_model=NoticiaResponse, status_code=status.HTTP_201_CREATED)
def publicar_aviso(
    racha_id: int,
    payload: NovoAviso,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verificar_admin_racha(db, current_user, racha_id)
    noticia = publicar(
        db, racha_id, "aviso", payload.titulo.strip(),
        (payload.texto or "").strip() or None, autor_user_id=current_user.id,
    )
    db.commit()
    db.refresh(noticia)
    return _resposta(noticia, {}, {current_user.id: current_user})


@router.delete("/{racha_id}/resenha/{noticia_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar(
    racha_id: int,
    noticia_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verificar_admin_racha(db, current_user, racha_id)
    noticia = db.query(Noticia).filter(Noticia.id == noticia_id, Noticia.racha_id == racha_id).first()
    if not noticia:
        raise HTTPException(status_code=404, detail="Notícia não encontrada")
    db.delete(noticia)
    db.commit()

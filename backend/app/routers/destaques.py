"""Destaques da partida: votação de quem jogou e escolha do admin."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import esporte_do_racha, verificar_acesso_racha, verificar_admin_racha
from app.models import Atleta, DestaquePartida, Jogo, User, VotoDestaque
from app.services.auth import get_current_user
from app.services.destaques import (
    agora,
    fechar,
    fechar_se_venceu,
    numeros_por_atleta,
    participantes,
    pontuacao_lances,
    resumo,
    situacao,
)

router = APIRouter(prefix="/jogos", tags=["Destaques"])


class AtletaDestaque(BaseModel):
    atleta_id: int
    nome: str
    apelido: Optional[str] = None
    foto_url: Optional[str] = None
    posicao: Optional[str] = None
    nota: Optional[int] = None
    lado: Optional[str] = None
    resumo: str = ""


class Destaque(AtletaDestaque):
    colocacao: int
    origem: str
    pontos: Optional[int] = None


class DestaquesResponse(BaseModel):
    jogo_id: int
    racha_id: int
    situacao: str
    votacao_ate: Optional[datetime] = None
    agora: datetime
    is_admin: bool
    pode_votar: bool
    meu_atleta_id: Optional[int] = None
    meu_voto: list[int]
    votantes: int
    total_participantes: int
    time_a_nome: str
    time_b_nome: str
    placar_a: int
    placar_b: int
    candidatos: list[AtletaDestaque]
    destaques: list[Destaque]


class Escolha(BaseModel):
    # Do 1º ao 3º lugar.
    atletas: list[int] = Field(..., min_length=1, max_length=3)


def _jogo(db: Session, jogo_id: int) -> Jogo:
    jogo = db.query(Jogo).filter(Jogo.id == jogo_id, Jogo.cancelado.is_(False)).first()
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    return jogo


def _meu_atleta(db: Session, jogo: Jogo, user: User) -> Atleta | None:
    return db.query(Atleta).filter(
        Atleta.racha_id == jogo.racha_id, Atleta.user_id == user.id, Atleta.ativo.is_(True)
    ).first()


def _validar_escolha(atletas: list[int], candidatos: set[int]) -> None:
    if len(atletas) != len(set(atletas)):
        raise HTTPException(status_code=400, detail="Escolha atletas diferentes para cada lugar")
    if any(a not in candidatos for a in atletas):
        raise HTTPException(status_code=400, detail="Só quem jogou a partida pode ser destaque")


def _resposta(db: Session, jogo: Jogo, user: User) -> DestaquesResponse:
    acesso = verificar_acesso_racha(db, user, jogo.racha_id)
    fechar_se_venceu(db, jogo)
    esporte = esporte_do_racha(db, jogo.racha_id)
    lados = participantes(db, jogo)
    numeros = numeros_por_atleta(jogo)
    sugestao = pontuacao_lances(db, jogo)
    atletas = {a.id: a for a in db.query(Atleta).filter(Atleta.id.in_(list(lados)))} if lados else {}

    def montar(atleta_id: int) -> dict:
        a = atletas[atleta_id]
        return dict(
            atleta_id=a.id,
            nome=a.nome,
            apelido=a.apelido,
            foto_url=a.foto_url,
            posicao=a.posicao.value if a.posicao else None,
            nota=a.nota,
            lado=lados.get(a.id),
            resumo=resumo(numeros.get(a.id, {"gols": 0, "pontos": 0, "assist": 0, "amarelos": 0, "vermelhos": 0}), esporte.id),
        )

    estado = situacao(db, jogo)
    eu = _meu_atleta(db, jogo, user)
    meu_voto = []
    if eu:
        votos = db.query(VotoDestaque).filter(VotoDestaque.jogo_id == jogo.id, VotoDestaque.eleitor_atleta_id == eu.id)
        meu_voto = [v.atleta_id for v in sorted(votos, key=lambda v: v.posicao)]
    votantes = db.query(VotoDestaque.eleitor_atleta_id).filter(VotoDestaque.jogo_id == jogo.id).distinct().count()
    destaques = db.query(DestaquePartida).filter(DestaquePartida.jogo_id == jogo.id).order_by(DestaquePartida.posicao)

    return DestaquesResponse(
        jogo_id=jogo.id,
        racha_id=jogo.racha_id,
        situacao=estado,
        votacao_ate=jogo.votacao_ate,
        agora=agora(),
        is_admin=acesso["tipo"] == "admin",
        pode_votar=estado == "votacao" and eu is not None and eu.id in lados,
        meu_atleta_id=eu.id if eu else None,
        meu_voto=meu_voto,
        votantes=votantes,
        total_participantes=len(lados),
        time_a_nome=jogo.time_a_nome or "Time A",
        time_b_nome=jogo.time_b_nome or "Time B",
        placar_a=jogo.placar_time_a or 0,
        placar_b=jogo.placar_time_b or 0,
        # Ordem da sugestão pelos lances: quem foi melhor aparece primeiro na hora de votar.
        candidatos=[AtletaDestaque(**montar(i)) for i in sorted(atletas, key=lambda i: -sugestao.get(i, 0))],
        destaques=[
            Destaque(**montar(d.atleta_id), colocacao=d.posicao, origem=d.origem, pontos=d.pontos)
            for d in destaques if d.atleta_id in atletas
        ],
    )


@router.get("/{jogo_id}/destaques", response_model=DestaquesResponse)
def ver_destaques(jogo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _resposta(db, _jogo(db, jogo_id), current_user)


@router.post("/{jogo_id}/destaques/votar", response_model=DestaquesResponse)
def votar(jogo_id: int, payload: Escolha, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jogo = _jogo(db, jogo_id)
    verificar_acesso_racha(db, current_user, jogo.racha_id)
    if situacao(db, jogo) != "votacao":
        raise HTTPException(status_code=400, detail="A votação desta partida não está aberta")
    eu = _meu_atleta(db, jogo, current_user)
    lados = participantes(db, jogo)
    if not eu or eu.id not in lados:
        raise HTTPException(status_code=403, detail="Só quem jogou a partida pode votar")
    if eu.id in payload.atletas:
        raise HTTPException(status_code=400, detail="Não vale votar em você mesmo")
    _validar_escolha(payload.atletas, set(lados))
    # Votar de novo troca o voto anterior.
    db.query(VotoDestaque).filter(VotoDestaque.jogo_id == jogo.id, VotoDestaque.eleitor_atleta_id == eu.id).delete()
    for posicao, atleta_id in enumerate(payload.atletas, start=1):
        db.add(VotoDestaque(jogo_id=jogo.id, eleitor_atleta_id=eu.id, atleta_id=atleta_id, posicao=posicao))
    db.commit()
    return _resposta(db, jogo, current_user)


@router.post("/{jogo_id}/destaques/definir", response_model=DestaquesResponse)
def definir(jogo_id: int, payload: Escolha, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """O admin escolhe os destaques; vale no lugar da votação."""
    jogo = _jogo(db, jogo_id)
    verificar_admin_racha(db, current_user, jogo.racha_id)
    if situacao(db, jogo) == "aguardando":
        raise HTTPException(status_code=400, detail="Encerre a partida antes de escolher os destaques")
    _validar_escolha(payload.atletas, set(participantes(db, jogo)))
    fechar(db, jogo, "admin", payload.atletas)
    db.commit()
    return _resposta(db, jogo, current_user)


@router.post("/{jogo_id}/destaques/encerrar-votacao", response_model=DestaquesResponse)
def encerrar_votacao(jogo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """O admin fecha a votação antes do prazo; conta os votos que já chegaram."""
    jogo = _jogo(db, jogo_id)
    verificar_admin_racha(db, current_user, jogo.racha_id)
    if situacao(db, jogo) != "votacao":
        raise HTTPException(status_code=400, detail="A votação desta partida não está aberta")
    fechar(db, jogo, "votacao")
    db.commit()
    return _resposta(db, jogo, current_user)

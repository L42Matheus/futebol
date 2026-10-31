"""Confirma o sorteio de times de um jogo: monta os times do racha e deixa o jogo pronto para começar.

O sorteio em si acontece no app (o admin pode sortear de novo e trocar atletas antes de
confirmar); aqui só gravamos o resultado.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import verificar_admin_racha
from app.models import Atleta, Jogo, Team, TeamMember, User
from app.services.auth import get_current_user

router = APIRouter(prefix="/jogos", tags=["Sorteio"])


class TimeSorteado(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)
    # Na ordem em que entram: os primeiros viram titulares, o resto vai para o banco.
    atletas: list[int] = Field(..., min_length=1)


class ConfirmarSorteio(BaseModel):
    times: list[TimeSorteado] = Field(..., min_length=2, max_length=6)
    jogadores_por_time: int = Field(..., ge=1, le=15)


class TimeConfirmado(BaseModel):
    id: int
    nome: str
    titulares: int
    reservas: int


class SorteioResponse(BaseModel):
    jogo_id: int
    times: list[TimeConfirmado]


@router.post("/{jogo_id}/sorteio", response_model=SorteioResponse)
def confirmar_sorteio(
    jogo_id: int,
    payload: ConfirmarSorteio,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jogo = db.query(Jogo).filter(Jogo.id == jogo_id, Jogo.cancelado.is_(False)).first()
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    verificar_admin_racha(db, current_user, jogo.racha_id)
    if jogo.iniciado_em:
        raise HTTPException(status_code=400, detail="A partida já começou: o sorteio só vale antes do jogo")

    nomes = [t.nome.strip() for t in payload.times]
    if len({n.lower() for n in nomes}) != len(nomes):
        raise HTTPException(status_code=400, detail="Cada time precisa de um nome diferente")
    ids = [a for t in payload.times for a in t.atletas]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=400, detail="Um atleta apareceu em dois times")
    atletas = {
        a.id: a
        for a in db.query(Atleta).filter(
            Atleta.id.in_(ids), Atleta.racha_id == jogo.racha_id, Atleta.ativo.is_(True)
        ).all()
    }
    if len(atletas) != len(ids):
        raise HTTPException(status_code=400, detail="Algum atleta não faz parte deste racha")

    agora = datetime.utcnow()
    # Cada atleta fica em um time só no racha (mesma regra de adicionar membro).
    for membro in (
        db.query(TeamMember).join(Team)
        .filter(TeamMember.atleta_id.in_(ids), TeamMember.ativo.is_(True), Team.racha_id == jogo.racha_id)
        .all()
    ):
        membro.ativo, membro.ate = False, agora

    confirmados = []
    for sorteado, nome in zip(payload.times, nomes):
        # Time com o mesmo nome no racha é reaproveitado e recebe só os atletas sorteados.
        time = db.query(Team).filter(
            Team.racha_id == jogo.racha_id, Team.ativo.is_(True), func.lower(Team.nome) == nome.lower()
        ).first()
        if time:
            for membro in db.query(TeamMember).filter(TeamMember.team_id == time.id, TeamMember.ativo.is_(True)).all():
                membro.ativo, membro.ate = False, agora
        else:
            time = Team(racha_id=jogo.racha_id, nome=nome, ativo=True)
            db.add(time)
            db.flush()

        for ordem, atleta_id in enumerate(sorteado.atletas):
            titular = ordem < payload.jogadores_por_time
            db.add(TeamMember(
                team_id=time.id,
                atleta_id=atleta_id,
                ativo=True,
                is_titular=titular,
                posicao_escalacao=atletas[atleta_id].posicao.value if titular and atletas[atleta_id].posicao else None,
                ordem_banco=None if titular else ordem - payload.jogadores_por_time + 1,
            ))
        confirmados.append(TimeConfirmado(
            id=time.id,
            nome=time.nome,
            titulares=min(len(sorteado.atletas), payload.jogadores_por_time),
            reservas=max(0, len(sorteado.atletas) - payload.jogadores_por_time),
        ))

    # Os dois primeiros times jogam a partida; os outros ficam na fila.
    jogo.time_a_id, jogo.time_a_nome = confirmados[0].id, confirmados[0].nome
    jogo.time_b_id, jogo.time_b_nome = confirmados[1].id, confirmados[1].nome
    db.commit()
    return SorteioResponse(jogo_id=jogo.id, times=confirmados)

"""Ranking do racha: estatísticas por atleta tiradas das partidas ao vivo.

Cada esporte tem as suas categorias. No futebol, gols e assistências vêm da artilharia
(que o admin pode ajustar à mão); o resto sai dos lances e de quem jogou cada partida.
"""

from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import esporte_do_racha, verificar_acesso_racha
from app.esportes import ASSISTENCIA, GOL
from app.models import Atleta, AtletaStat, EventoPartida, Jogo, ParticipantePartida, User
from app.services.auth import get_current_user

router = APIRouter(prefix="/rachas", tags=["Ranking"])


class Categoria(BaseModel):
    id: str
    nome: str
    # Texto depois do número: "%", "pts"...
    sufixo: Optional[str] = None


class AtletaRanking(BaseModel):
    atleta_id: int
    nome: str
    apelido: Optional[str] = None
    foto_url: Optional[str] = None
    posicao: Optional[str] = None
    jogos: int
    valores: dict[str, Optional[float]]


class RankingResponse(BaseModel):
    esporte: str
    jogos_encerrados: int
    categorias: list[Categoria]
    atletas: list[AtletaRanking]


CATEGORIAS = {
    "futebol": [
        Categoria(id="gols", nome="Gols"),
        Categoria(id="assistencias", nome="Assistências"),
        Categoria(id="vitorias", nome="Vitórias"),
        Categoria(id="aproveitamento", nome="Aproveitamento", sufixo="%"),
    ],
    "basquete": [
        Categoria(id="pontos", nome="Pontos", sufixo="pts"),
        Categoria(id="media", nome="Média", sufixo="pts/jogo"),
        Categoria(id="bolas_de_3", nome="Bolas de 3"),
        Categoria(id="assistencias", nome="Assistências"),
        Categoria(id="vitorias", nome="Vitórias"),
    ],
    "volei": [
        Categoria(id="pontos", nome="Pontos", sufixo="pts"),
        Categoria(id="vitorias", nome="Vitórias"),
        Categoria(id="sets", nome="Sets vencidos"),
        Categoria(id="aproveitamento", nome="Aproveitamento", sufixo="%"),
    ],
}


@router.get("/{racha_id}/ranking", response_model=RankingResponse)
def ranking(racha_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_acesso_racha(db, current_user, racha_id)
    esporte = esporte_do_racha(db, racha_id)

    atletas = db.query(Atleta).filter(Atleta.racha_id == racha_id, Atleta.ativo.is_(True)).all()
    jogos = db.query(Jogo).filter(
        Jogo.racha_id == racha_id, Jogo.cancelado.is_(False), Jogo.iniciado_em.isnot(None)
    ).all()
    ids_jogos = [j.id for j in jogos]
    encerrados = {j.id: j for j in jogos if j.finalizado}

    eventos = []
    if ids_jogos:
        eventos = db.query(EventoPartida).filter(
            EventoPartida.jogo_id.in_(ids_jogos), EventoPartida.atleta_id.isnot(None)
        ).all()

    # Quem jogou cada partida encerrada: a foto tirada no início, mais quem aparece nos lances
    # (cobre as partidas de antes dessa foto existir).
    participacao: dict[tuple[int, int], str] = {}
    if encerrados:
        for p in db.query(ParticipantePartida).filter(ParticipantePartida.jogo_id.in_(list(encerrados))).all():
            participacao[(p.jogo_id, p.atleta_id)] = p.lado
        for e in eventos:
            if e.jogo_id in encerrados:
                participacao.setdefault((e.jogo_id, e.atleta_id), e.lado)

    jogos_por_atleta: dict[int, int] = defaultdict(int)
    vitorias: dict[int, int] = defaultdict(int)
    sets: dict[int, int] = defaultdict(int)
    for (jogo_id, atleta_id), lado in participacao.items():
        jogo = encerrados[jogo_id]
        meu = (jogo.placar_time_a if lado == "a" else jogo.placar_time_b) or 0
        deles = (jogo.placar_time_b if lado == "a" else jogo.placar_time_a) or 0
        jogos_por_atleta[atleta_id] += 1
        if meu > deles:
            vitorias[atleta_id] += 1
        sets[atleta_id] += meu

    # Totais contam todas as partidas iniciadas (inclusive a que está ao vivo);
    # a média usa só as encerradas, para bater com o número de jogos.
    pontos: dict[int, int] = defaultdict(int)
    pontos_encerrados: dict[int, int] = defaultdict(int)
    bolas_de_3: dict[int, int] = defaultdict(int)
    assistencias: dict[int, int] = defaultdict(int)
    for e in eventos:
        if e.tipo == GOL:
            pontos[e.atleta_id] += e.valor
            if e.jogo_id in encerrados:
                pontos_encerrados[e.atleta_id] += e.valor
            if e.valor == 3:
                bolas_de_3[e.atleta_id] += 1
        elif e.tipo == ASSISTENCIA:
            assistencias[e.atleta_id] += 1

    # Futebol: gols e assistências da artilharia, que soma os lances e os ajustes do admin.
    artilharia = {}
    if esporte.id == "futebol":
        artilharia = {
            s.atleta_id: s for s in db.query(AtletaStat).filter(AtletaStat.racha_id == racha_id).all()
        }

    resultado = []
    for atleta in atletas:
        jogou = jogos_por_atleta[atleta.id]
        aproveitamento = round(100 * vitorias[atleta.id] / jogou) if jogou else None
        if esporte.id == "futebol":
            stat = artilharia.get(atleta.id)
            valores = {
                "gols": stat.gols if stat else 0,
                "assistencias": stat.assistencias if stat else 0,
                "vitorias": vitorias[atleta.id],
                "aproveitamento": aproveitamento,
            }
        elif esporte.id == "basquete":
            valores = {
                "pontos": pontos[atleta.id],
                "media": round(pontos_encerrados[atleta.id] / jogou, 1) if jogou else None,
                "bolas_de_3": bolas_de_3[atleta.id],
                "assistencias": assistencias[atleta.id],
                "vitorias": vitorias[atleta.id],
            }
        else:
            valores = {
                "pontos": pontos[atleta.id],
                "vitorias": vitorias[atleta.id],
                "sets": sets[atleta.id],
                "aproveitamento": aproveitamento,
            }
        resultado.append(AtletaRanking(
            atleta_id=atleta.id,
            nome=atleta.nome,
            apelido=atleta.apelido,
            foto_url=atleta.foto_url,
            posicao=atleta.posicao.value if atleta.posicao else None,
            jogos=jogou,
            valores=valores,
        ))

    return RankingResponse(
        esporte=esporte.id,
        jogos_encerrados=len(encerrados),
        categorias=CATEGORIAS.get(esporte.id, CATEGORIAS["futebol"]),
        atletas=resultado,
    )

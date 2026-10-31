"""Destaques da partida: os três melhores, por votação de quem jogou ou escolha do admin."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.deps import esporte_do_racha
from app.esportes import AMARELO, ASSISTENCIA, GOL, VERMELHO
from app.models import Atleta, DestaquePartida, EventoPartida, Jogo, ParticipantePartida, VotoDestaque
from app.services.resenha import nome_curto, publicar

DURACAO_VOTACAO = timedelta(hours=24)
PESO_VOTO = {1: 3, 2: 2, 3: 1}


def agora() -> datetime:
    return datetime.now(timezone.utc)


def participantes(db: Session, jogo: Jogo) -> dict[int, str]:
    """Quem jogou a partida e por qual lado: a foto do início mais quem apareceu nos lances."""
    lados = {p.atleta_id: p.lado for p in db.query(ParticipantePartida).filter(ParticipantePartida.jogo_id == jogo.id)}
    for evento in jogo.eventos:
        if evento.atleta_id:
            lados.setdefault(evento.atleta_id, evento.lado)
    return lados


def numeros_por_atleta(jogo: Jogo) -> dict[int, dict[str, int]]:
    numeros: dict[int, dict[str, int]] = defaultdict(lambda: {"gols": 0, "pontos": 0, "assist": 0, "amarelos": 0, "vermelhos": 0})
    for e in jogo.eventos:
        if not e.atleta_id:
            continue
        n = numeros[e.atleta_id]
        if e.tipo == GOL:
            n["gols"] += 1
            n["pontos"] += e.valor
        elif e.tipo == ASSISTENCIA:
            n["assist"] += 1
        elif e.tipo == AMARELO:
            n["amarelos"] += 1
        elif e.tipo == VERMELHO:
            n["vermelhos"] += 1
    return numeros


def resumo(numeros: dict[str, int], esporte_id: str) -> str:
    partes = []
    if esporte_id == "basquete" and numeros["pontos"]:
        partes.append(f"{numeros['pontos']} pts")
    elif numeros["gols"]:
        palavra = {"volei": "ponto"}.get(esporte_id, "gol")
        partes.append(f"{numeros['gols']} {palavra}{'s' if numeros['gols'] > 1 else ''}")
    if numeros["assist"]:
        partes.append(f"{numeros['assist']} assist.")
    if numeros["vermelhos"]:
        partes.append("vermelho")
    elif numeros["amarelos"]:
        partes.append("amarelo")
    return " · ".join(partes)


def pontuacao_lances(db: Session, jogo: Jogo) -> dict[int, int]:
    """Sugestão pelos lances: gol 3, assistência 2, vitória 2, amarelo -1, vermelho -3."""
    lados = participantes(db, jogo)
    numeros = numeros_por_atleta(jogo)
    a, b = jogo.placar_time_a or 0, jogo.placar_time_b or 0
    vencedor = "a" if a > b else "b" if b > a else None
    pontos = {}
    for atleta_id, lado in lados.items():
        n = numeros.get(atleta_id, {"gols": 0, "assist": 0, "amarelos": 0, "vermelhos": 0})
        pontos[atleta_id] = (
            3 * n["gols"] + 2 * n["assist"] + (2 if lado == vencedor else 0) - n["amarelos"] - 3 * n["vermelhos"]
        )
    return pontos


def situacao(db: Session, jogo: Jogo) -> str:
    """aguardando (partida não encerrada), votacao ou encerrada."""
    if not jogo.finalizado or not jogo.iniciado_em:
        return "aguardando"
    if db.query(DestaquePartida).filter(DestaquePartida.jogo_id == jogo.id).count():
        return "encerrada"
    if jogo.votacao_ate and agora() < jogo.votacao_ate:
        return "votacao"
    return "encerrada"


def abrir_votacao(db: Session, jogo: Jogo) -> None:
    """Chamado ao encerrar a partida: abre a votação e publica o resultado na Resenha."""
    if jogo.votacao_ate:
        return
    jogo.votacao_ate = agora() + DURACAO_VOTACAO
    esporte = esporte_do_racha(db, jogo.racha_id)
    atletas = {a.id: a for a in db.query(Atleta).filter(Atleta.racha_id == jogo.racha_id)}
    numeros = numeros_por_atleta(jogo)
    marcadores = sorted(
        ((nome_curto(atletas[i]), n["gols"]) for i, n in numeros.items() if n["gols"] and i in atletas),
        key=lambda x: -x[1],
    )
    nomes = ", ".join(f"{nome} ({gols})" if gols > 1 else nome for nome, gols in marcadores[:5])
    rotulo = {"basquete": "Cestas de", "volei": "Pontos de"}.get(esporte.id, "Gols de")
    sufixo = " sets" if esporte.placar_por_periodo else ""
    publicar(
        db,
        jogo.racha_id,
        "resultado",
        f"Fim de jogo: {jogo.time_a_nome or 'Time A'} {jogo.placar_time_a or 0} x {jogo.placar_time_b or 0}{sufixo} {jogo.time_b_nome or 'Time B'}",
        f"{rotulo} {nomes}" if nomes else None,
        jogo_id=jogo.id,
    )


def fechar(db: Session, jogo: Jogo, origem: str, escolhidos: list[int] | None = None) -> None:
    """Grava os três destaques e publica na Resenha.

    Com `escolhidos` vale a escolha do admin; sem, conta os votos e desempata pelos lances.
    Sem nenhum voto, os três saem dos lances.
    """
    db.query(DestaquePartida).filter(DestaquePartida.jogo_id == jogo.id).delete()
    sugestao = pontuacao_lances(db, jogo)
    pontos_voto: dict[int, int] = defaultdict(int)
    if escolhidos is None:
        for voto in db.query(VotoDestaque).filter(VotoDestaque.jogo_id == jogo.id):
            pontos_voto[voto.atleta_id] += PESO_VOTO.get(voto.posicao, 0)
        if pontos_voto:
            origem = "votacao"
            ordem = sorted(pontos_voto, key=lambda i: (-pontos_voto[i], -sugestao.get(i, 0)))
        else:
            origem = "lances"
            ordem = []
        # Com poucos votos, o pódio se completa com os melhores pelos lances.
        ordem += [i for i in sorted(sugestao, key=lambda i: -sugestao[i]) if i not in ordem]
        escolhidos = ordem[:3]
    for posicao, atleta_id in enumerate(escolhidos[:3], start=1):
        db.add(DestaquePartida(
            jogo_id=jogo.id,
            atleta_id=atleta_id,
            posicao=posicao,
            origem=origem,
            pontos=pontos_voto.get(atleta_id) if origem == "votacao" else None,
        ))
    if jogo.votacao_ate is None or jogo.votacao_ate > agora():
        jogo.votacao_ate = agora()
    atletas = {a.id: a for a in db.query(Atleta).filter(Atleta.id.in_(escolhidos))}
    if escolhidos and escolhidos[0] in atletas:
        demais = " · ".join(
            f"{i}º {nome_curto(atletas[a])}" for i, a in enumerate(escolhidos[1:3], start=2) if a in atletas
        )
        como = {"votacao": "na votação da galera", "admin": "escolhido pelo admin", "lances": "pelos lances da partida"}[origem]
        publicar(
            db,
            jogo.racha_id,
            "destaques",
            f"{nome_curto(atletas[escolhidos[0]])} foi o melhor jogador",
            f"{jogo.time_a_nome or 'Time A'} {jogo.placar_time_a or 0} x {jogo.placar_time_b or 0} {jogo.time_b_nome or 'Time B'} · {como}"
            + (f" · {demais}" if demais else ""),
            jogo_id=jogo.id,
            atleta_id=escolhidos[0],
        )


def fechar_se_venceu(db: Session, jogo: Jogo) -> None:
    """Fecha a votação que passou do prazo (sem tarefa agendada: acontece na próxima leitura)."""
    if jogo.finalizado and jogo.votacao_ate and agora() >= jogo.votacao_ate:
        if not db.query(DestaquePartida).filter(DestaquePartida.jogo_id == jogo.id).count():
            fechar(db, jogo, "votacao")
            db.commit()

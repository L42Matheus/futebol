"""Partida ao vivo: o admin inicia o jogo e registra gols, assistências, cartões e substituições."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import esporte_do_racha, verificar_acesso_racha, verificar_admin_racha
from app.esportes import AMARELO, ASSISTENCIA, GOL, SUBSTITUICAO, VERMELHO
from app.models import (
    Atleta,
    AtletaStat,
    Cartao,
    EventoPartida,
    Jogo,
    Pagamento,
    Racha,
    StatusPagamento,
    Team,
    TeamMember,
    TipoCartao,
    TipoPagamento,
    User,
)
from app.schemas.partida import (
    EventoCreate,
    EventoResponse,
    IniciarPartida,
    MembroPartida,
    PartidaResponse,
    TimePartida,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/jogos", tags=["Partida"])

CARTAO_POR_EVENTO = {AMARELO: TipoCartao.AMARELO, VERMELHO: TipoCartao.VERMELHO}
MULTA_POR_CARTAO = {TipoCartao.AMARELO: TipoPagamento.MULTA_AMARELO, TipoCartao.VERMELHO: TipoPagamento.MULTA_VERMELHO}


def _agora() -> datetime:
    return datetime.now(timezone.utc)


def _carregar_jogo(db: Session, jogo_id: int) -> Jogo:
    jogo = db.query(Jogo).filter(Jogo.id == jogo_id, Jogo.cancelado.is_(False)).first()
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    return jogo


def _membros(db: Session, team_id: int | None) -> list[tuple[TeamMember, Atleta]]:
    if not team_id:
        return []
    return (
        db.query(TeamMember, Atleta)
        .join(Atleta, Atleta.id == TeamMember.atleta_id)
        .filter(TeamMember.team_id == team_id, TeamMember.ativo.is_(True), Atleta.ativo.is_(True))
        .order_by(TeamMember.is_titular.desc(), TeamMember.ordem_banco, Atleta.nome)
        .all()
    )


def _membro(db: Session, team_id: int | None, atleta_id: int | None) -> TeamMember | None:
    if not team_id or not atleta_id:
        return None
    return db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.atleta_id == atleta_id,
        TeamMember.ativo.is_(True),
    ).first()


def _lado_do_atleta(db: Session, jogo: Jogo, atleta_id: int) -> tuple[str, TeamMember]:
    for lado, team_id in (("a", jogo.time_a_id), ("b", jogo.time_b_id)):
        membro = _membro(db, team_id, atleta_id)
        if membro:
            return lado, membro
    raise HTTPException(status_code=400, detail="O atleta não está em nenhum dos dois times da partida")


def _stat(db: Session, atleta_id: int, racha_id: int) -> AtletaStat:
    stat = db.query(AtletaStat).filter(AtletaStat.atleta_id == atleta_id, AtletaStat.racha_id == racha_id).first()
    if not stat:
        stat = AtletaStat(atleta_id=atleta_id, racha_id=racha_id, gols=0, assistencias=0)
        db.add(stat)
        db.flush()
    return stat


def _somar_placar(jogo: Jogo, lado: str, delta: int) -> None:
    campo = "placar_time_a" if lado == "a" else "placar_time_b"
    setattr(jogo, campo, max(0, (getattr(jogo, campo) or 0) + delta))


def _montar_resposta(db: Session, jogo: Jogo, user: User) -> PartidaResponse:
    acesso = verificar_acesso_racha(db, user, jogo.racha_id)
    esporte = esporte_do_racha(db, jogo.racha_id)
    times = []
    for lado, team_id, nome, placar in (
        ("a", jogo.time_a_id, jogo.time_a_nome or "Time A", jogo.placar_time_a),
        ("b", jogo.time_b_id, jogo.time_b_nome or "Time B", jogo.placar_time_b),
    ):
        times.append(TimePartida(
            lado=lado,
            team_id=team_id,
            nome=nome,
            placar=placar or 0,
            membros=[
                MembroPartida(
                    atleta_id=atleta.id,
                    nome=atleta.nome,
                    apelido=atleta.apelido,
                    foto_url=atleta.foto_url,
                    posicao=atleta.posicao.value if atleta.posicao else None,
                    numero_camisa=atleta.numero_camisa,
                    is_titular=bool(membro.is_titular),
                    posicao_escalacao=membro.posicao_escalacao,
                )
                for membro, atleta in _membros(db, team_id)
            ],
        ))
    return PartidaResponse(
        jogo_id=jogo.id,
        racha_id=jogo.racha_id,
        data_hora=jogo.data_hora,
        local=jogo.local,
        iniciado_em=jogo.iniciado_em,
        finalizado=bool(jogo.finalizado),
        agora=_agora(),
        is_admin=acesso["tipo"] == "admin",
        esporte=esporte.id,
        eventos_permitidos=list(esporte.eventos_partida),
        valores_pontuacao=list(esporte.valores_pontuacao),
        times=times,
        eventos=[EventoResponse.model_validate(e) for e in jogo.eventos],
    )


@router.get("/{jogo_id}/partida", response_model=PartidaResponse)
def obter_partida(jogo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _montar_resposta(db, _carregar_jogo(db, jogo_id), current_user)


@router.post("/{jogo_id}/partida/iniciar", response_model=PartidaResponse)
def iniciar_partida(
    jogo_id: int,
    payload: IniciarPartida,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jogo = _carregar_jogo(db, jogo_id)
    verificar_admin_racha(db, current_user, jogo.racha_id)

    for campo_id, campo_nome, novo_id in (
        ("time_a_id", "time_a_nome", payload.time_a_id),
        ("time_b_id", "time_b_nome", payload.time_b_id),
    ):
        if novo_id is None or jogo.iniciado_em:
            continue
        team = db.query(Team).filter(Team.id == novo_id, Team.racha_id == jogo.racha_id).first()
        if not team:
            raise HTTPException(status_code=400, detail="Time selecionado não pertence a este racha")
        setattr(jogo, campo_id, team.id)
        setattr(jogo, campo_nome, team.nome)

    if not jogo.time_a_id or not jogo.time_b_id:
        raise HTTPException(status_code=400, detail="Escolha os dois times antes de iniciar a partida")
    if jogo.time_a_id == jogo.time_b_id:
        raise HTTPException(status_code=400, detail="Escolha dois times diferentes")

    if not jogo.iniciado_em:
        jogo.iniciado_em = _agora()
        jogo.finalizado = False
        jogo.placar_time_a = jogo.placar_time_a or 0
        jogo.placar_time_b = jogo.placar_time_b or 0
    db.commit()
    db.refresh(jogo)
    return _montar_resposta(db, jogo, current_user)


@router.post("/{jogo_id}/partida/encerrar", response_model=PartidaResponse)
def encerrar_partida(jogo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jogo = _carregar_jogo(db, jogo_id)
    verificar_admin_racha(db, current_user, jogo.racha_id)
    if not jogo.iniciado_em:
        raise HTTPException(status_code=400, detail="A partida ainda não começou")
    jogo.finalizado = True
    db.commit()
    db.refresh(jogo)
    return _montar_resposta(db, jogo, current_user)


@router.post("/{jogo_id}/partida/eventos", response_model=PartidaResponse)
def registrar_evento(
    jogo_id: int,
    payload: EventoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jogo = _carregar_jogo(db, jogo_id)
    verificar_admin_racha(db, current_user, jogo.racha_id)
    if not jogo.iniciado_em:
        raise HTTPException(status_code=400, detail="Inicie a partida antes de registrar lances")
    if jogo.finalizado:
        raise HTTPException(status_code=400, detail="A partida já foi encerrada")

    esporte = esporte_do_racha(db, jogo.racha_id)
    if payload.tipo not in esporte.eventos_partida:
        raise HTTPException(status_code=400, detail=f"Lance não disponível no {esporte.nome.lower()}")

    lado, membro = _lado_do_atleta(db, jogo, payload.atleta_id)
    if payload.tipo in (GOL, ASSISTENCIA) and not membro.is_titular:
        raise HTTPException(status_code=400, detail="Quem está no banco não marca nem dá assistência. Coloque o atleta em jogo primeiro.")
    valor = 1
    evento = EventoPartida(
        jogo_id=jogo.id,
        lado=lado,
        tipo=payload.tipo,
        atleta_id=payload.atleta_id,
        segundos=int((_agora() - jogo.iniciado_em).total_seconds()),
    )

    if payload.tipo == GOL:
        if payload.valor not in esporte.valores_pontuacao:
            raise HTTPException(status_code=400, detail="Valor de pontuação inválido para este esporte")
        valor = payload.valor
        _somar_placar(jogo, lado, valor)
        _stat(db, payload.atleta_id, jogo.racha_id).gols += 1
    elif payload.tipo == ASSISTENCIA:
        _stat(db, payload.atleta_id, jogo.racha_id).assistencias += 1
    elif payload.tipo in CARTAO_POR_EVENTO:
        tipo_cartao = CARTAO_POR_EVENTO[payload.tipo]
        cartao = Cartao(atleta_id=payload.atleta_id, jogo_id=jogo.id, tipo=tipo_cartao)
        db.add(cartao)
        racha = db.query(Racha).filter(Racha.id == jogo.racha_id).first()
        multa = racha.valor_cartao_amarelo if tipo_cartao == TipoCartao.AMARELO else racha.valor_cartao_vermelho
        if multa and multa > 0:
            db.add(Pagamento(
                atleta_id=payload.atleta_id,
                tipo=MULTA_POR_CARTAO[tipo_cartao],
                valor=multa,
                descricao=f"Multa por cartao {tipo_cartao.value}",
                referencia=datetime.utcnow().strftime("%m/%Y"),
                status=StatusPagamento.PENDENTE,
            ))
            cartao.multa_gerada = True
        db.flush()
        evento.cartao_id = cartao.id
    elif payload.tipo == SUBSTITUICAO:
        if membro.is_titular:
            raise HTTPException(status_code=400, detail="Na substituição entra alguém do banco")
        # Sem atleta_sai_id o reserva só entra em jogo (time com gente a menos, por exemplo).
        if payload.atleta_sai_id:
            team_id = jogo.time_a_id if lado == "a" else jogo.time_b_id
            sai = _membro(db, team_id, payload.atleta_sai_id)
            if not sai or not sai.is_titular:
                raise HTTPException(status_code=400, detail="Escolha quem sai entre os titulares do mesmo time")
            membro.posicao_escalacao = sai.posicao_escalacao
            sai.is_titular, sai.posicao_escalacao = False, None
            evento.atleta_sai_id = sai.atleta_id
        membro.is_titular = True

    evento.valor = valor
    db.add(evento)
    db.commit()
    db.refresh(jogo)
    return _montar_resposta(db, jogo, current_user)


@router.delete("/{jogo_id}/partida/eventos/{evento_id}", response_model=PartidaResponse)
def desfazer_evento(
    jogo_id: int,
    evento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jogo = _carregar_jogo(db, jogo_id)
    verificar_admin_racha(db, current_user, jogo.racha_id)
    evento = db.query(EventoPartida).filter(EventoPartida.id == evento_id, EventoPartida.jogo_id == jogo.id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Lance não encontrado")

    if evento.tipo == GOL:
        _somar_placar(jogo, evento.lado, -evento.valor)
        stat = _stat(db, evento.atleta_id, jogo.racha_id)
        stat.gols = max(0, (stat.gols or 0) - 1)
    elif evento.tipo == ASSISTENCIA:
        stat = _stat(db, evento.atleta_id, jogo.racha_id)
        stat.assistencias = max(0, (stat.assistencias or 0) - 1)
    elif evento.tipo in CARTAO_POR_EVENTO:
        cartao = db.query(Cartao).filter(Cartao.id == evento.cartao_id).first() if evento.cartao_id else None
        if cartao:
            if cartao.multa_gerada:
                multa = db.query(Pagamento).filter(
                    Pagamento.atleta_id == evento.atleta_id,
                    Pagamento.tipo == MULTA_POR_CARTAO[cartao.tipo],
                    Pagamento.status == StatusPagamento.PENDENTE,
                ).order_by(Pagamento.created_at.desc()).first()
                if multa:
                    db.delete(multa)
            evento.cartao_id = None
            db.flush()
            db.delete(cartao)
    elif evento.tipo == SUBSTITUICAO:
        team_id = jogo.time_a_id if evento.lado == "a" else jogo.time_b_id
        entrou = _membro(db, team_id, evento.atleta_id)
        saiu = _membro(db, team_id, evento.atleta_sai_id)
        if saiu:
            saiu.is_titular, saiu.posicao_escalacao = True, entrou.posicao_escalacao if entrou else None
        if entrou:
            entrou.is_titular, entrou.posicao_escalacao = False, None

    db.delete(evento)
    db.commit()
    db.refresh(jogo)
    return _montar_resposta(db, jogo, current_user)

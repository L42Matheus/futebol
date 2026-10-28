from app.esportes.base import (
    AMARELO, ARTILHARIA, ASSISTENCIA, CARTOES, ESCALACAO, GOL, SUBSTITUICAO, VERMELHO, Esporte, Modalidade,
)

FUTEBOL = Esporte(
    id="futebol",
    nome="Futebol",
    modalidades=(
        Modalidade("campo", "Campo", jogadores_por_time=11, max_atletas=40),
        Modalidade("society", "Society", jogadores_por_time=7, max_atletas=30),
        Modalidade("futsal", "Futsal", jogadores_por_time=5, max_atletas=20),
    ),
    posicoes=("goleiro", "zagueiro", "lateral", "volante", "meia", "atacante", "ponta"),
    posicao_padrao="meia",
    recursos=frozenset({ESCALACAO, ARTILHARIA, CARTOES}),
    eventos_partida=(GOL, ASSISTENCIA, AMARELO, VERMELHO, SUBSTITUICAO),
)

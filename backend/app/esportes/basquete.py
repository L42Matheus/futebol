from app.esportes.base import ASSISTENCIA, ESCALACAO, FALTA, GOL, SUBSTITUICAO, Esporte, Modalidade

BASQUETE = Esporte(
    id="basquete",
    nome="Basquete",
    modalidades=(
        Modalidade("basquete_5x5", "Quadra 5x5", jogadores_por_time=5, max_atletas=20),
        Modalidade("basquete_3x3", "3x3", jogadores_por_time=3, max_atletas=12),
    ),
    posicoes=("armador", "ala_armador", "ala", "ala_pivo", "pivo"),
    posicao_padrao="ala",
    recursos=frozenset({ESCALACAO}),
    eventos_partida=(GOL, ASSISTENCIA, FALTA, SUBSTITUICAO),
    valores_pontuacao=(1, 2, 3),
    periodo_nome="quarto",
    periodos=4,
)

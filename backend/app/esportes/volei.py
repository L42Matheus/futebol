from app.esportes.base import Esporte, Modalidade

VOLEI = Esporte(
    id="volei",
    nome="Vôlei",
    modalidades=(
        Modalidade("volei_quadra", "Quadra 6x6", jogadores_por_time=6, max_atletas=24),
        Modalidade("volei_areia", "Areia 4x4", jogadores_por_time=4, max_atletas=16),
    ),
    posicoes=("levantador", "oposto", "ponteiro", "central", "libero"),
    posicao_padrao="ponteiro",
    recursos=frozenset(),
)

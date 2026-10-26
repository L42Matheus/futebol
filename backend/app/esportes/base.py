from dataclasses import dataclass

ESCALACAO = "escalacao"
ARTILHARIA = "artilharia"
CARTOES = "cartoes"


@dataclass(frozen=True)
class Modalidade:
    # O id é gravado em rachas.tipo e precisa ser único entre todos os esportes.
    id: str
    nome: str
    jogadores_por_time: int
    max_atletas: int


@dataclass(frozen=True)
class Esporte:
    id: str
    nome: str
    modalidades: tuple[Modalidade, ...]
    posicoes: tuple[str, ...]
    posicao_padrao: str
    recursos: frozenset[str]

    def tem(self, recurso: str) -> bool:
        return recurso in self.recursos

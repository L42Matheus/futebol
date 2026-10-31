from dataclasses import dataclass

ESCALACAO = "escalacao"
ARTILHARIA = "artilharia"
CARTOES = "cartoes"

# O que o admin registra durante a partida ao vivo.
GOL = "gol"  # gol, cesta ou ponto, conforme o esporte
ASSISTENCIA = "assistencia"
AMARELO = "amarelo"
VERMELHO = "vermelho"
SUBSTITUICAO = "substituicao"
FALTA = "falta"


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
    eventos_partida: tuple[str, ...]
    # Quanto um GOL pode valer no placar (a cesta do basquete vale 1, 2 ou 3).
    valores_pontuacao: tuple[int, ...] = (1,)
    # Atributos da carta do atleta, na ordem em que aparecem: (sigla, nome).
    atributos: tuple[tuple[str, str], ...] = ()
    # Partes da partida ao vivo (quartos no basquete, sets no vôlei). None = jogo corrido.
    periodo_nome: str | None = None
    periodos: int = 1
    # Vôlei: o placar do jogo é de sets; os pontos valem dentro de cada set.
    placar_por_periodo: bool = False
    # Vôlei: ponto do time sem atleta (erro do adversário).
    ponto_do_time: bool = False

    def tem(self, recurso: str) -> bool:
        return recurso in self.recursos

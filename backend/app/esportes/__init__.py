"""Registro dos esportes suportados.

Para adicionar um esporte: crie um módulo nesta pasta e inclua-o em ESPORTES.
Os enums do banco (modalidades e posições) são gerados a partir daqui.
"""

from app.esportes.base import (
    AMARELO, ARTILHARIA, ASSISTENCIA, CARTOES, ESCALACAO, FALTA, GOL, SUBSTITUICAO, VERMELHO, Esporte, Modalidade,
)
from app.esportes.basquete import BASQUETE
from app.esportes.futebol import FUTEBOL
from app.esportes.volei import VOLEI

ESPORTES: tuple[Esporte, ...] = (FUTEBOL, BASQUETE, VOLEI)

_MODALIDADES: dict[str, tuple[Esporte, Modalidade]] = {}
for _esporte in ESPORTES:
    for _modalidade in _esporte.modalidades:
        assert _modalidade.id not in _MODALIDADES, f"Modalidade duplicada: {_modalidade.id}"
        _MODALIDADES[_modalidade.id] = (_esporte, _modalidade)

TODAS_MODALIDADES: tuple[str, ...] = tuple(_MODALIDADES)
TODAS_POSICOES: tuple[str, ...] = tuple(dict.fromkeys(p for e in ESPORTES for p in e.posicoes))
MODALIDADE_PADRAO = "society"


def _id(valor) -> str:
    return str(getattr(valor, "value", valor)).lower()


def esporte_da_modalidade(tipo) -> Esporte:
    return _MODALIDADES.get(_id(tipo), _MODALIDADES[MODALIDADE_PADRAO])[0]


def modalidade(tipo) -> Modalidade:
    return _MODALIDADES.get(_id(tipo), _MODALIDADES[MODALIDADE_PADRAO])[1]


def modalidade_existe(tipo) -> bool:
    return _id(tipo) in _MODALIDADES


__all__ = [
    "AMARELO",
    "ARTILHARIA",
    "ASSISTENCIA",
    "CARTOES",
    "ESCALACAO",
    "ESPORTES",
    "FALTA",
    "GOL",
    "SUBSTITUICAO",
    "VERMELHO",
    "Esporte",
    "MODALIDADE_PADRAO",
    "Modalidade",
    "TODAS_MODALIDADES",
    "TODAS_POSICOES",
    "esporte_da_modalidade",
    "modalidade",
    "modalidade_existe",
]

// Registro dos esportes. Para adicionar um: crie a pasta, exporte a config e inclua em ESPORTES
// (e o mesmo no backend, em app/esportes).
import basquete from './basquete'
import futebol from './futebol'
import volei from './volei'
import type { Esporte, EsporteId, Modalidade, Recurso } from './types'

export type { Esporte, EsporteId, Modalidade, Recurso } from './types'

export const ESPORTES: Esporte[] = [futebol, basquete, volei]

const MODALIDADE_PADRAO = 'society'

const porModalidade = new Map<string, { esporte: Esporte; modalidade: Modalidade }>(
  ESPORTES.flatMap((esporte) => esporte.modalidades.map((modalidade) => [modalidade.id, { esporte, modalidade }])),
)

function buscar(tipo?: string | null) {
  return porModalidade.get((tipo ?? '').toLowerCase()) ?? porModalidade.get(MODALIDADE_PADRAO)!
}

export function getEsporte(id: EsporteId): Esporte {
  return ESPORTES.find((esporte) => esporte.id === id) ?? futebol
}

export function esporteDaModalidade(tipo?: string | null): Esporte {
  return buscar(tipo).esporte
}

export function getModalidade(tipo?: string | null): Modalidade {
  return buscar(tipo).modalidade
}

export function temRecurso(tipo: string | null | undefined, recurso: Recurso): boolean {
  return esporteDaModalidade(tipo).recursos.includes(recurso)
}

const todasPosicoes: Record<string, string> = Object.assign({}, ...ESPORTES.map((esporte) => esporte.posicoes))

export function labelPosicao(posicao?: string | null): string {
  return posicao ? todasPosicoes[posicao] ?? posicao : ''
}

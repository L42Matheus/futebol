import type { EsporteId } from './types'

// Mascotes do QuemJoga. O apito é o mascote geral; o admin tem o dele (crachá ADM e notebook)
// e o atleta tem um por esporte. Esporte sem atleta próprio ainda usa o apito.
export interface Mascote {
  src: string
  largura: number
  altura: number
  // Busto cortado embaixo: a imagem esmaece no pé para o corte não aparecer.
  busto?: boolean
}

export const MASCOTE: Mascote = { src: '/mascote/mascote.webp', largura: 649, altura: 719 }
export const MASCOTE_ADMIN: Mascote = { src: '/mascote/mascote-admin.webp', largura: 719, altura: 720 }

const ATLETA_POR_ESPORTE: Partial<Record<EsporteId, Mascote>> = {
  futebol: { src: '/mascote/atleta-futebol.webp', largura: 648, altura: 720, busto: true },
}

export function mascoteDoAtleta(esporte: EsporteId | null | undefined): Mascote {
  return (esporte && ATLETA_POR_ESPORTE[esporte]) || MASCOTE
}

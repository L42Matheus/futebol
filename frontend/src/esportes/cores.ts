import type { EsporteId } from './types'

// Fundo de cada esporte: a mesma cor do topo da cena animada, para a cena emendar no cartão.
// Usada na página /esporte e no cartão do esporte da tela "Sou atleta / Sou administrador".
export const COR_DO_ESPORTE: Record<EsporteId, string> = {
  futebol: '#0a1f1a',
  basquete: '#1e1033',
  volei: '#0c1a33',
}

import type { EsporteId } from '../esportes/types'

// Esporte em que a pessoa está no app (escolhido na página /esporte). Com ele definido,
// a lista de rachas mostra só os desse esporte e o Novo Racha já abre nele.
// Sem escolha (contas antigas), nada é filtrado.
const CHAVE = 'quemjoga:esporte'
const IDS: EsporteId[] = ['futebol', 'basquete', 'volei']
export const ESPORTE_MUDOU = 'quemjoga:esporte_mudou'

export function ehEsporte(valor: string | null | undefined): valor is EsporteId {
  return IDS.includes(valor as EsporteId)
}

export function lerEsporteAtual(): EsporteId | null {
  try {
    const valor = localStorage.getItem(CHAVE)
    return ehEsporte(valor) ? valor : null
  } catch {
    return null
  }
}

export function definirEsporteAtual(id: EsporteId) {
  try {
    localStorage.setItem(CHAVE, id)
  } catch {
    // navegação privada sem armazenamento: o app mostra todos os esportes
  }
  window.dispatchEvent(new Event(ESPORTE_MUDOU))
}

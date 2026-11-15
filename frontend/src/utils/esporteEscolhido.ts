import { ESPORTES, type EsporteId } from '../esportes'

// Esporte escolhido na landing antes do cadastro. Fica guardado durante login/cadastro
// e é usado uma vez para abrir o Novo Racha já com o esporte marcado.
const CHAVE = 'quemjoga:esporte_escolhido'

export function ehEsporte(valor: string | null | undefined): valor is EsporteId {
  return ESPORTES.some((esporte) => esporte.id === valor)
}

export function salvarEsporteEscolhido(id: EsporteId) {
  try {
    localStorage.setItem(CHAVE, id)
  } catch {
    // navegação privada sem armazenamento: o Novo Racha abre em futebol
  }
}

export function lerEsporteEscolhido(): EsporteId | null {
  try {
    const valor = localStorage.getItem(CHAVE)
    return ehEsporte(valor) ? valor : null
  } catch {
    return null
  }
}

export function limparEsporteEscolhido() {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // nada a limpar
  }
}

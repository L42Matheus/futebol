import { flushSync } from 'react-dom'

// Transição de tela nativa do navegador (View Transitions). Elementos com o mesmo
// view-transition-name nas duas telas se transformam um no outro; o resto faz um esmaecer.
// Sem suporte (navegadores antigos) ou com "reduzir movimento", a troca é imediata.
type DocumentoComTransicao = Document & {
  startViewTransition?: (atualizar: () => void) => { finished: Promise<void> }
}

export function suportaTransicao() {
  const doc = document as DocumentoComTransicao
  return typeof doc.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function comTransicao(trocarTela: () => void) {
  const doc = document as DocumentoComTransicao
  if (!suportaTransicao() || !doc.startViewTransition) {
    trocarTela()
    return
  }
  // flushSync faz o React desenhar a nova tela dentro da transição, para o navegador capturá-la.
  doc.startViewTransition(() => flushSync(trocarTela))
}

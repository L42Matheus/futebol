// Copiar e compartilhar links de convite. No celular abre a folha de compartilhamento do sistema
// (WhatsApp, Telegram...); onde ela não existe, copia o link.

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

export type ResultadoCompartilhar = 'compartilhado' | 'copiado' | 'cancelado' | 'falhou'

export async function compartilharLink(url: string, texto: string): Promise<ResultadoCompartilhar> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: texto, url })
      return 'compartilhado'
    } catch (erro) {
      // Fechar a folha sem escolher nada não é erro.
      if (erro instanceof DOMException && erro.name === 'AbortError') return 'cancelado'
    }
  }
  return (await copiarTexto(url)) ? 'copiado' : 'falhou'
}

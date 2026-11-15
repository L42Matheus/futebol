import type { ComponentType } from 'react'

// Posições do Time A em porcentagem do quadro (top/left); o Time B é desenhado espelhado.
export interface PositionSlot {
  id: string
  label: string
  top: string
  left: string
}

export interface Formation {
  id: string
  name: string
  positions: PositionSlot[]
}

// O que cada esporte entrega para a tela de escalação, que é compartilhada.
export interface EscalacaoEsporte {
  formacoes: (tipo: string, tamanho?: number | null) => Formation[]
  jogadoresPorTime: (tipo: string, tamanho?: number | null) => number
  // Desenho do campo/quadra; ocupa o quadro inteiro (viewBox 0 0 100 130, sem manter proporção).
  Fundo: ComponentType<{ tipo: string }>
  // Quadra com rede no meio (vôlei): os dois times aparecem no mesmo desenho, um de cada lado.
  quadraDividida?: boolean
  // "campo" ou "quadra", usado nos textos ("5 em quadra").
  local: string
  descricao: (tipo: string) => string
}

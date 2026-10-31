// Regras da carta do atleta: estrelas e cor da moldura a partir da nota geral (40 a 99).

export type Nivel = 'bronze' | 'prata' | 'ouro'

export function estrelas(nota: number | null | undefined): number {
  if (!nota) return 0
  if (nota >= 90) return 5
  if (nota >= 80) return 4
  if (nota >= 70) return 3
  if (nota >= 60) return 2
  return 1
}

export function nivel(nota: number | null | undefined): Nivel {
  if (!nota || nota < 65) return 'bronze'
  return nota < 75 ? 'prata' : 'ouro'
}

export const CORES_NIVEL: Record<Nivel, { moldura: string; destaque: string }> = {
  bronze: { moldura: '#c2773c', destaque: '#f0b48a' },
  prata: { moldura: '#b8c2cc', destaque: '#e6ebf0' },
  ouro: { moldura: '#e0a526', destaque: '#fbd77a' },
}

// Média dos atributos preenchidos, igual ao backend.
export function mediaAtributos(atributos: Record<string, number>): number | null {
  const valores = Object.values(atributos)
  return valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : null
}

// Geometria para desenhar corpos com volume: cada membro é uma cadeia de nós (x, y, largura)
// e vira um contorno suave, com pontas arredondadas, em vez de uma linha grossa.

export type No = readonly [x: number, y: number, largura: number]

type Vetor = [number, number]

function normalizar([x, y]: Vetor): Vetor {
  const tamanho = Math.hypot(x, y) || 1
  return [x / tamanho, y / tamanho]
}

function tangentes(nos: readonly No[]): Vetor[] {
  return nos.map((_, i) => {
    const anterior = nos[Math.max(i - 1, 0)]
    const proximo = nos[Math.min(i + 1, nos.length - 1)]
    return normalizar([proximo[0] - anterior[0], proximo[1] - anterior[1]])
  })
}

const f = (n: number) => n.toFixed(1)

// Curva suave passando por todos os pontos (Catmull-Rom convertida para Bézier).
function curvaPor(pontos: Vetor[]): string {
  let d = ''
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[Math.max(i - 1, 0)]
    const p1 = pontos[i]
    const p2 = pontos[i + 1]
    const p3 = pontos[Math.min(i + 2, pontos.length - 1)]
    const c1: Vetor = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Vetor = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}

/**
 * Contorno fechado de um membro. `deslocamento` empurra o contorno para um dos lados
 * (fração da largura) e `escala` afina: usado para as faixas de sombra e de brilho.
 */
export function membro(nos: readonly No[], { deslocamento = 0, escala = 1 } = {}): string {
  const ts = tangentes(nos)
  const esquerda: Vetor[] = []
  const direita: Vetor[] = []
  nos.forEach(([x, y, largura], i) => {
    const [tx, ty] = ts[i]
    const nx = -ty
    const ny = tx
    const meia = (largura * escala) / 2
    const cx = x + nx * largura * deslocamento
    const cy = y + ny * largura * deslocamento
    esquerda.push([cx + nx * meia, cy + ny * meia])
    direita.push([cx - nx * meia, cy - ny * meia])
  })

  const k = 0.55
  const ultimo = nos.length - 1
  const [tfx, tfy] = ts[ultimo]
  const [tix, tiy] = ts[0]
  const capFim = (nos[ultimo][2] * escala) / 2 * k * 2
  const capInicio = (nos[0][2] * escala) / 2 * k * 2
  const eFim = esquerda[ultimo]
  const dFim = direita[ultimo]
  const eIni = esquerda[0]
  const dIni = direita[0]

  return [
    `M${f(eIni[0])} ${f(eIni[1])}`,
    curvaPor(esquerda),
    ` C${f(eFim[0] + tfx * capFim)} ${f(eFim[1] + tfy * capFim)} ${f(dFim[0] + tfx * capFim)} ${f(dFim[1] + tfy * capFim)} ${f(dFim[0])} ${f(dFim[1])}`,
    curvaPor([...direita].reverse()),
    ` C${f(dIni[0] - tix * capInicio)} ${f(dIni[1] - tiy * capInicio)} ${f(eIni[0] - tix * capInicio)} ${f(eIni[1] - tiy * capInicio)} ${f(eIni[0])} ${f(eIni[1])}`,
    'Z',
  ].join('')
}

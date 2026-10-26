// Quadra inteira de basquete vista de cima, com uma cesta em cada ponta.
// 15 m de largura em 88 unidades e 28 m de comprimento em 122 (escala vertical comprimida).
const X = (m: number) => 6 + m * 5.87
const Y = (m: number) => 4 + m * 4.36
const ESPELHO = 130

// Tábuas com tons variados, fixos entre renderizações.
const sorteio = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
const TONS = ['#c98a4f', '#d39a5e', '#be7f45', '#d8a46b', '#c4864c']
const TABUAS = Array.from({ length: 25 }, (_, coluna) =>
  Array.from({ length: 4 }, (_, i) => ({
    x: coluna * 4,
    y: i * 34 - sorteio(coluna + 7) * 30,
    altura: 30 + sorteio(coluna * 4 + i) * 20,
    cor: TONS[Math.floor(sorteio(coluna * 9 + i * 3) * TONS.length)],
  })),
).flat()

function MeiaQuadra({ espelhar }: { espelhar?: boolean }) {
  const linha = '#fff'
  const garrafao = { x: X(5.05), y: Y(0), w: X(9.95) - X(5.05), h: Y(5.8) - Y(0) }
  const lanceLivre = Y(5.8)
  const cesta = Y(1.575)
  const cantoY = Y(2.99)
  return (
    <g transform={espelhar ? `matrix(1 0 0 -1 0 ${ESPELHO})` : undefined}>
      <rect x={garrafao.x} y={garrafao.y} width={garrafao.w} height={garrafao.h} fill="#9a5424" opacity="0.6" />
      <g fill="none" stroke={linha} strokeWidth="0.6">
        <rect x={garrafao.x} y={garrafao.y} width={garrafao.w} height={garrafao.h} />
        <path d={`M${X(5.7)} ${lanceLivre} A10.6 7.8 0 0 0 ${X(9.3)} ${lanceLivre}`} />
        <path d={`M${X(5.7)} ${lanceLivre} A10.6 7.8 0 0 1 ${X(9.3)} ${lanceLivre}`} strokeDasharray="1.4 1.4" />
        <path d={`M${X(0.9)} ${Y(0)} V${cantoY} A39.6 29.4 0 0 0 ${X(14.1)} ${cantoY} V${Y(0)}`} />
        <path d={`M${X(6.75)} ${cesta} A3 2.2 0 0 0 ${X(8.25)} ${cesta}`} strokeWidth="0.45" />
      </g>
      {/* marcações laterais do garrafão */}
      <g stroke={linha} strokeWidth="0.6">
        {[1.75, 2.6, 3.45, 4.3].map((m) => (
          <g key={m}>
            <line x1={garrafao.x - 2} y1={Y(m)} x2={garrafao.x} y2={Y(m)} />
            <line x1={garrafao.x + garrafao.w} y1={Y(m)} x2={garrafao.x + garrafao.w + 2} y2={Y(m)} />
          </g>
        ))}
      </g>
      <line x1={X(6.6)} y1={Y(1.2)} x2={X(8.4)} y2={Y(1.2)} stroke="#f8fafc" strokeWidth="1" />
      <circle cx="50" cy={cesta} r="2" fill="none" stroke="#f97316" strokeWidth="0.8" />
    </g>
  )
}

export default function QuadraBasquete() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
      <rect width="100" height="130" fill="#9a6431" />
      <g>
        {TABUAS.map((t, i) => (
          <rect key={i} x={t.x} y={t.y} width="4" height={t.altura} fill={t.cor} opacity="0.85" />
        ))}
        <rect width="100" height="130" fill="none" stroke="#7a4a20" strokeWidth="8" />
      </g>
      <g fill="none" stroke="#fff" strokeWidth="0.7">
        <rect x={X(0)} y={Y(0)} width={X(15) - X(0)} height={Y(28) - Y(0)} />
        <line x1={X(0)} y1={Y(14)} x2={X(15)} y2={Y(14)} />
        <ellipse cx="50" cy={Y(14)} rx="10.6" ry="7.8" />
      </g>
      <MeiaQuadra />
      <MeiaQuadra espelhar />
    </svg>
  )
}

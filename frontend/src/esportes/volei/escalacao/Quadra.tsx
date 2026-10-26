// Quadra inteira de vôlei vista de cima, com a rede no meio.
// Quadra: 9 m x 18 m (escala vertical comprimida). Areia: 8 m x 16 m, sem linha de ataque.

// Grãos espalhados de forma pseudoaleatória (fixa entre renderizações), sem formar linhas.
const sorteio = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
const GRAOS = Array.from({ length: 90 }, (_, i) => [sorteio(i + 1) * 100, sorteio(i + 101) * 130] as const)

const REDE = 65

export default function QuadraVolei({ tipo }: { tipo: string }) {
  const areia = tipo === 'volei_areia'
  const quadra = areia ? { x: 12, y: 10, w: 76, h: 110 } : { x: 10, y: 5, w: 80, h: 120 }
  const ataque = 20
  const linha = areia ? '#1d4ed8' : '#fff'

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
      {/* zona livre */}
      <rect width="100" height="130" fill={areia ? '#d9b874' : '#1366d6'} />
      {areia && GRAOS.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="0.35" fill="#7c5a24" opacity="0.5" />)}

      {/* quadra */}
      <rect x={quadra.x} y={quadra.y} width={quadra.w} height={quadra.h} fill={areia ? '#e6c88a' : '#ffb98a'} opacity={areia ? 0.6 : 1} />
      <g fill="none" stroke={linha} strokeWidth={areia ? 1 : 0.9}>
        <rect x={quadra.x} y={quadra.y} width={quadra.w} height={quadra.h} />
        {!areia && (
          <>
            <line x1={quadra.x} y1={REDE - ataque} x2={quadra.x + quadra.w} y2={REDE - ataque} />
            <line x1={quadra.x} y1={REDE + ataque} x2={quadra.x + quadra.w} y2={REDE + ataque} />
            <line x1={quadra.x} y1={REDE} x2={quadra.x + quadra.w} y2={REDE} strokeWidth="0.6" />
          </>
        )}
      </g>

      {/* sombra da rede no piso */}
      <path d={`M${quadra.x - 6} ${REDE + 3} H${quadra.x + quadra.w + 6} V${REDE + 7} H${quadra.x - 6} Z`} fill="#000" opacity="0.12" />

      {/* rede: faixa, malha, antenas listradas e postes */}
      <rect x={quadra.x - 6} y={REDE - 1.4} width={quadra.w + 12} height="2.8" fill="#0f172a" opacity="0.35" />
      {Array.from({ length: Math.floor((quadra.w + 12) / 2.2) }, (_, i) => (
        <line key={i} x1={quadra.x - 6 + i * 2.2} y1={REDE - 1.4} x2={quadra.x - 6 + i * 2.2} y2={REDE + 1.4} stroke="#f8fafc" strokeOpacity="0.7" strokeWidth="0.25" />
      ))}
      <line x1={quadra.x - 6} y1={REDE - 1.4} x2={quadra.x + quadra.w + 6} y2={REDE - 1.4} stroke="#f8fafc" strokeWidth="0.8" />
      {[quadra.x, quadra.x + quadra.w].map((x) => (
        <g key={x}>
          <line x1={x} y1={REDE - 5} x2={x} y2={REDE + 5} stroke="#f8fafc" strokeWidth="1.1" />
          <line x1={x} y1={REDE - 5} x2={x} y2={REDE + 5} stroke="#dc2626" strokeWidth="1.1" strokeDasharray="1.2 1.2" />
        </g>
      ))}
      <circle cx={quadra.x - 6} cy={REDE} r="1.6" fill="#1e293b" />
      <circle cx={quadra.x + quadra.w + 6} cy={REDE} r="1.6" fill="#1e293b" />
    </svg>
  )
}

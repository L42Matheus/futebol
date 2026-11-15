import { useId } from 'react'
import { Parte, type Tons } from '../esportes/cena'
import { membro, type No } from '../esportes/corpo'

// Jogador de corpo inteiro da carta: de frente, com volume, a foto do atleta no rosto e o número no peito.
// É o mesmo traço das cenas dos esportes (src/esportes), parado em pose de apresentação.

const PELE: Tons = { base: '#c48a5c', sombra: '#8a5a37', brilho: '#ecb88b' }
const CAMISA: Tons = { base: '#10b981', sombra: '#04694a', brilho: '#6ee7b7' }
const MEIAO: Tons = { base: '#f8fafc', sombra: '#94a3b8', brilho: '#ffffff' }
const CALCAO: Tons = { base: '#0f172a', sombra: '#020617', brilho: '#334155' }

const PERNA_E: No[] = [[89, 150, 25], [87, 172, 22], [86, 192, 16], [85, 212, 15], [85, 232, 10]]
const PERNA_D: No[] = [[111, 150, 25], [113, 172, 22], [114, 192, 16], [115, 212, 15], [115, 232, 10]]
const MEIAO_E: No[] = [[86, 200, 16.5], [85, 214, 15.5], [85, 232, 10.5]]
const MEIAO_D: No[] = [[114, 200, 16.5], [115, 214, 15.5], [115, 232, 10.5]]
const BRACO_E: No[] = [[67, 80, 17], [61, 102, 14], [58, 124, 12], [59, 144, 10]]
const BRACO_D: No[] = [[133, 80, 17], [139, 102, 14], [142, 124, 12], [141, 144, 10]]
const MANGA_E: No[] = [[68, 77, 20], [63, 96, 18]]
const MANGA_D: No[] = [[132, 77, 20], [137, 96, 18]]

function Chuteira({ x, lado }: { x: number; lado: 1 | -1 }) {
  return (
    <g transform={`translate(${x} 238) scale(${lado} 1)`}>
      <path d="M-8 -6 Q-8 -10 0 -10 Q8 -10 9 -4 Q13 4 9 7 H-9 Q-12 2 -8 -6 Z" fill="#111827" />
      <path d="M-5 -3 Q1 -6 7 -2" fill="none" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M-9 7 H9" stroke="#e5e7eb" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

interface JogadorCartaProps {
  fotoUrl?: string | null
  iniciais: string
  numero?: number | null
  // Cor do nível da carta (bronze, prata, ouro): aro do rosto e brilho do chão.
  cor: string
}

export default function JogadorCarta({ fotoUrl, iniciais, numero, cor }: JogadorCartaProps) {
  const id = useId().replace(/:/g, '')
  const temNumero = typeof numero === 'number'

  return (
    <svg viewBox="20 1 160 253" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-camisa`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={CAMISA.brilho} />
          <stop offset="42%" stopColor={CAMISA.base} />
          <stop offset="100%" stopColor={CAMISA.sombra} />
        </linearGradient>
        <linearGradient id={`${id}-calcao`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={CALCAO.brilho} />
          <stop offset="55%" stopColor={CALCAO.base} />
          <stop offset="100%" stopColor={CALCAO.sombra} />
        </linearGradient>
        <radialGradient id={`${id}-chao`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={cor} stopOpacity="0.55" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-cabeca`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={PELE.brilho} />
          <stop offset="60%" stopColor={PELE.base} />
          <stop offset="100%" stopColor={PELE.sombra} />
        </radialGradient>
        <clipPath id={`${id}-rosto`}>
          <circle cx="100" cy="36" r="31" />
        </clipPath>
      </defs>

      {/* chão iluminado na cor do nível e a sombra do jogador */}
      <ellipse cx="100" cy="242" rx="72" ry="11" fill={`url(#${id}-chao)`} />
      <ellipse cx="100" cy="244" rx="34" ry="4.5" fill="#000" opacity="0.45" />

      {/* braços atrás do tronco */}
      <Parte nos={BRACO_E} tons={PELE} lado={-1} />
      <Parte nos={BRACO_D} tons={PELE} />

      {/* pernas, meiões e chuteiras */}
      <Parte nos={PERNA_E} tons={PELE} lado={-1} />
      <Parte nos={PERNA_D} tons={PELE} />
      <Parte nos={MEIAO_E} tons={MEIAO} lado={-1} />
      <Parte nos={MEIAO_D} tons={MEIAO} />
      <Chuteira x={84} lado={-1} />
      <Chuteira x={116} lado={1} />

      {/* calção */}
      <path d="M74 134 H126 L129 170 Q116 174 103 169 L100 156 L97 169 Q84 174 71 170 Z" fill={`url(#${id}-calcao)`} />
      <path d="M72 164 L73 153 M128 164 L127 153" stroke={CAMISA.base} strokeWidth="2.4" strokeLinecap="round" />

      {/* pescoço */}
      <path d="M92 52 H108 V70 Q100 76 92 70 Z" fill={PELE.sombra} />

      {/* camisa: mangas, tronco, gola e faixa lateral */}
      <path d={membro(MANGA_E)} fill={CAMISA.sombra} />
      <path d={membro(MANGA_D)} fill={CAMISA.base} />
      <path d="M72 68 Q86 62 92 64 Q100 74 108 64 Q114 62 128 68 Q136 74 134 88 Q128 112 127 139 Q100 146 73 139 Q72 112 66 88 Q64 74 72 68 Z" fill={`url(#${id}-camisa)`} />
      <path d="M92 64 Q100 76 108 64" fill="none" stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M124 76 Q131 104 126 138" fill="none" stroke="#022c22" strokeOpacity="0.35" strokeWidth="7" strokeLinecap="round" />
      <path d="M77 74 Q72 100 76 132" fill="none" stroke="#ecfdf5" strokeOpacity="0.28" strokeWidth="4" strokeLinecap="round" />
      {temNumero && (
        <text x="100" y="118" textAnchor="middle" fontSize="34" fontWeight="900" fill="#f8fafc" stroke="#022c22" strokeOpacity="0.35" strokeWidth="1" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {numero}
        </text>
      )}

      {/* rosto: a foto do atleta; sem foto, as iniciais */}
      <circle cx="100" cy="36" r="31" fill={`url(#${id}-cabeca)`} />
      {fotoUrl ? (
        <image href={fotoUrl} x="69" y="5" width="62" height="62" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-rosto)`} />
      ) : (
        <text x="100" y="45" textAnchor="middle" fontSize="25" fontWeight="900" fill="#3b2412">
          {iniciais}
        </text>
      )}
      <circle cx="100" cy="36" r="31" fill="none" stroke={cor} strokeWidth="3" />
      <path d="M76 19 A30 30 0 0 1 110 8" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

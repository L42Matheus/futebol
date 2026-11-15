import { useId } from 'react'
import type { EsporteId } from './types'

// Cenário atrás do atleta no cartão do esporte (tela Sou atleta / Sou administrador).
// Só traços brancos translúcidos e luz sobre o verde do cartão, para combinar com o app:
// campo e trave no futebol, quadra e tabela no basquete, quadra e rede no vôlei.
// O desenho fica à direita, atrás do mascote; o lado do texto continua liso.

function Refletores({ id }: { id: string }) {
  return (
    <g>
      <circle cx="372" cy="16" r="52" fill={`url(#${id}-luz)`} />
      <circle cx="196" cy="12" r="34" fill={`url(#${id}-luz)`} opacity="0.7" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={356 + i * 10} cy={12 + (i % 2) * 6} r="3.2" fill="#fff" opacity="0.9" />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={`e${i}`} cx={186 + i * 9} cy={10 + (i % 2) * 5} r="2.6" fill="#fff" opacity="0.8" />
      ))}
    </g>
  )
}

function Futebol() {
  return (
    <g>
      {/* arquibancada desfocada */}
      <rect x="150" y="54" width="250" height="44" fill="#052a15" opacity="0.28" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <circle key={i} cx={160 + i * 21} cy={70 + (i % 3) * 8} r="2" fill="#fff" opacity="0.18" />
      ))}
      {/* gramado com faixas */}
      <rect x="0" y="98" width="400" height="62" fill="#0d4a27" opacity="0.4" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${160 + i * 44} 98 L${136 + i * 54} 160 L${163 + i * 54} 160 L${182 + i * 44} 98 Z`} fill="#fff" opacity="0.07" />
      ))}
      <path d="M120 152 Q270 116 400 128" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1.5" />
      {/* trave larga: os postes e a rede aparecem dos lados do atleta */}
      <g stroke="#fff" fill="none">
        <path d="M214 104 V34 H398 V104" strokeWidth="4" strokeOpacity="0.9" />
        <path d="M214 34 L232 48 H398" strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M232 48 V104" strokeWidth="1" strokeOpacity="0.35" />
        {Array.from({ length: 15 }).map((_, i) => (
          <path key={`v${i}`} d={`M${244 + i * 11} 48 V104`} strokeWidth="0.8" strokeOpacity="0.28" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={`h${i}`} d={`M220 ${58 + i * 10} H398`} strokeWidth="0.8" strokeOpacity="0.28" />
        ))}
      </g>
    </g>
  )
}

function Basquete() {
  return (
    <g>
      <rect x="0" y="104" width="400" height="56" fill="#0d4a27" opacity="0.4" />
      {/* tábuas do piso */}
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M0 ${114 + i * 12} H400`} stroke="#fff" strokeOpacity="0.08" strokeWidth="1" />
      ))}
      {/* garrafão e linha de três */}
      <g stroke="#fff" fill="none" strokeOpacity="0.4" strokeWidth="1.5">
        <path d="M200 160 Q210 108 320 108 Q400 108 400 124" />
        <path d="M290 160 V124 H400" />
      </g>
      {/* tabela e aro no alto, atrás do ombro do atleta */}
      <g>
        <path d="M398 10 V100" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" />
        <rect x="300" y="8" width="84" height="52" rx="3" fill="#fff" fillOpacity="0.14" stroke="#fff" strokeOpacity="0.85" strokeWidth="2.5" />
        <rect x="328" y="28" width="28" height="20" fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="1.5" />
        <path d="M342 60 V66" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
        <ellipse cx="342" cy="68" rx="16" ry="4" fill="none" stroke="#f97316" strokeWidth="3" />
        <path d="M327 69 L332 88 M337 70 L338 90 M347 70 L346 90 M357 69 L352 88" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.9" />
      </g>
    </g>
  )
}

function Volei() {
  return (
    <g>
      <rect x="0" y="108" width="400" height="52" fill="#0d4a27" opacity="0.35" />
      <path d="M150 160 L230 108 M400 140 L330 108" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
      {/* postes e rede */}
      <g stroke="#fff">
        <path d="M232 112 V54 M396 112 V54" strokeOpacity="0.8" strokeWidth="3" />
        <path d="M232 58 H396" strokeOpacity="0.9" strokeWidth="2.5" />
        <path d="M232 84 H396" strokeOpacity="0.6" strokeWidth="1.5" />
        {Array.from({ length: 16 }).map((_, i) => (
          <path key={`v${i}`} d={`M${242 + i * 10} 58 V84`} strokeOpacity="0.25" strokeWidth="0.8" />
        ))}
        {[0, 1].map((i) => (
          <path key={`h${i}`} d={`M232 ${67 + i * 9} H396`} strokeOpacity="0.25" strokeWidth="0.8" />
        ))}
      </g>
    </g>
  )
}

export default function CenarioCartao({ esporte }: { esporte: EsporteId }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="0 0 400 160"
      preserveAspectRatio="xMaxYMax meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-luz`}>
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {/* o lado do texto fica liso: o cenário some da direita para a esquerda */}
        <linearGradient id={`${id}-fade`} x1="0" x2="1">
          <stop offset="28%" stopColor="#fff" stopOpacity="0" />
          <stop offset="52%" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${id}-mask`}>
          <rect width="400" height="160" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}-mask)`}>
        <Refletores id={id} />
        {esporte === 'futebol' && <Futebol />}
        {esporte === 'basquete' && <Basquete />}
        {esporte === 'volei' && <Volei />}
      </g>
    </svg>
  )
}

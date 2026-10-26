import { Animar, AnimarAtributo, Parte, PontoNoCaminho, type Tons } from '../cena'
import { membro, type No } from '../corpo'

// Manchete: base baixa, braços unidos e a bola voltando para cima depois do toque.
const DUR = '2.6s'
const NEON = '#22d3ee'
const OURO = '#fbbf24'

const PELE: Tons = { base: '#dca27a', sombra: '#a8704d', brilho: '#f6cfac' }
const CAMISA: Tons = { base: '#dc2626', sombra: '#8f1414', brilho: '#f87171' }
const BRANCO: Tons = { base: '#eef2f7', sombra: '#a9b4c4', brilho: '#ffffff' }

const PERNA_TRAS: No[] = [[146, 168, 21], [131, 186, 19], [118, 205, 14], [103, 224, 12], [88, 243, 8]]
const PERNA_FRENTE: No[] = [[170, 166, 22], [183, 181, 20], [193, 198, 14], [191, 221, 13], [187, 243, 8]]
// Os dois braços estendidos para a direita, quase paralelos, encontrando-se nas mãos.
const BRACO_TRAS: No[] = [[173, 99, 14], [185, 109, 12], [196, 119, 9], [207, 131, 9], [217, 142, 7]]
const BRACO_FRENTE: No[] = [[132, 104, 15], [152, 113, 13], [172, 124, 9], [194, 135, 10], [214, 146, 7]]

const ORBITA = 'M40 258 A110 150 0 0 1 260 258'

type Ponto = readonly [number, number]
const JUNTAS: Record<string, Ponto> = {
  pescoco: [151, 92],
  ombroE: [132, 104],
  ombroD: [173, 99],
  pelve: [158, 160],
  quadrilE: [146, 168],
  quadrilD: [170, 166],
  joelhoE: [118, 205],
  tornozeloE: [88, 243],
  joelhoD: [193, 198],
  tornozeloD: [187, 243],
}
const OSSOS: [string, string][] = [
  ['pescoco', 'ombroE'], ['pescoco', 'ombroD'], ['pescoco', 'pelve'],
  ['pelve', 'quadrilE'], ['pelve', 'quadrilD'],
  ['quadrilE', 'joelhoE'], ['joelhoE', 'tornozeloE'],
  ['quadrilD', 'joelhoD'], ['joelhoD', 'tornozeloD'],
]
const BRACO_E: Ponto[] = [[132, 104], [172, 124], [214, 146]]
const BRACO_D: Ponto[] = [[173, 99], [196, 119], [217, 142]]

function Junta({ p }: { p: Ponto }) {
  return <circle cx={p[0]} cy={p[1]} r="2.6" fill="#ecfeff" stroke={NEON} strokeWidth="1.3" />
}

function Tenis({ x, y, lado }: { x: number; y: number; lado: 1 | -1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${lado} 1)`}>
      <path d="M-8 -6 Q-6 -12 2 -11 L8 -8 Q19 -6 23 2 Q24 7 18 8 H-8 Q-12 4 -8 -6 Z" fill="#f1f5f9" />
      <path d="M-8 3 Q6 1 23 4 L22 8 H-9 Z" fill="#cbd5e1" />
      <path d="M0 -6 L10 -2 M4 -9 L12 -4" stroke="#1e293b" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  )
}

export default function CenaVolei() {
  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" role="img" aria-label="Jogadora de vôlei fazendo uma manchete, com o movimento rastreado por linhas e articulações">
      <defs>
        <linearGradient id="vl-fundo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0c1a33" />
          <stop offset="60%" stopColor="#0d1424" />
          <stop offset="100%" stopColor="#0b0f1a" />
        </linearGradient>
        <radialGradient id="vl-holofote" cx="55%" cy="10%" r="70%">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vl-piso" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="vl-camisa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={CAMISA.brilho} />
          <stop offset="45%" stopColor={CAMISA.base} />
          <stop offset="100%" stopColor={CAMISA.sombra} />
        </linearGradient>
        <pattern id="vl-rede" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 0 H8 M0 0 V8" stroke="#e2e8f0" strokeWidth="0.6" />
        </pattern>
        <filter id="vl-brilho" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="borrado" />
          <feMerge>
            <feMergeNode in="borrado" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="vl-desfoque">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <rect width="300" height="300" fill="url(#vl-fundo)" />

      {/* rede ao fundo, em perspectiva e levemente desfocada */}
      <g filter="url(#vl-desfoque)" opacity="0.45">
        <path d="M-10 92 L310 70 L310 112 L-10 136 Z" fill="url(#vl-rede)" />
        <path d="M-10 92 L310 70" stroke="#f8fafc" strokeWidth="4" />
        <path d="M-10 136 L310 112" stroke="#f8fafc" strokeWidth="1.5" />
        <path d="M18 90 V230 M282 72 V230" stroke="#94a3b8" strokeWidth="4" />
      </g>

      {/* quadra */}
      <path d="M0 222 H300 V300 H0 Z" fill="url(#vl-piso)" />
      <g stroke="#f8fafc" strokeOpacity="0.5" strokeWidth="1.5" fill="none">
        <path d="M0 222 H300" />
        <path d="M30 222 L-40 300 M270 222 L340 300" />
        <path d="M-10 262 H310" strokeOpacity="0.3" />
      </g>
      <rect width="300" height="300" fill="url(#vl-holofote)" />

      {/* órbita e pontos */}
      <path d={ORBITA} fill="none" stroke={OURO} strokeOpacity="0.6" strokeWidth="1.2" />
      <PontoNoCaminho caminho={ORBITA} dur="7s" r={3} cor={OURO} />
      <PontoNoCaminho caminho={ORBITA} dur="7s" inicio="-3.5s" r={2.4} cor={NEON} />

      <ellipse cx="140" cy="252" rx="66" ry="6" fill="#000" opacity="0.35" />

      <g>
        {/* ao tocar na bola, o corpo sobe um pouco para empurrá-la */}
        <Animar tipo="translate" values="0 0;0 0;0 -4;0 0;0 0" keyTimes="0;0.38;0.48;0.62;1" dur={DUR} />

        {/* rabo de cavalo atrás da cabeça */}
        <path d={membro([[138, 62, 9], [131, 72, 8], [128, 84, 6], [130, 94, 3]])} fill="#5b3a1e" />

        {/* perna de trás */}
        <Parte nos={PERNA_TRAS} tons={PELE} lado={-1} />
        <Parte nos={[[106, 220, 13], [96, 232, 11], [89, 241, 9]]} tons={BRANCO} lado={-1} />
        <Parte nos={[[124, 199, 18], [115, 210, 17]]} tons={BRANCO} lado={-1} />
        <Tenis x={84} y={250} lado={-1} />

        {/* perna da frente */}
        <Parte nos={PERNA_FRENTE} tons={PELE} />
        <Parte nos={[[191, 218, 14], [189, 232, 12], [187, 241, 9]]} tons={BRANCO} />
        <Parte nos={[[192, 192, 18], [192, 206, 17]]} tons={BRANCO} />
        <Tenis x={190} y={250} lado={1} />

        {/* short */}
        <path d={membro([[148, 160, 30], [139, 174, 27]])} fill="#111827" />
        <path d={membro([[168, 158, 30], [178, 172, 27]])} fill="#111827" />
        <path d="M138 150 H178 L180 168 L158 176 L136 168 Z" fill="#111827" />

        {/* camisa */}
        <path
          d="M133 100 Q151 92 174 96 Q182 112 180 130 Q178 146 179 156 L137 160 Q136 146 135 132 Q132 116 133 100 Z"
          fill="url(#vl-camisa)"
        />
        <path d="M144 98 Q151 106 160 96" stroke={CAMISA.sombra} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M150 124 Q160 140 158 156" stroke={CAMISA.sombra} strokeWidth="5" fill="none" opacity="0.35" strokeLinecap="round" />
        <text x="157" y="146" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fef2f2" opacity="0.9">14</text>

        {/* pescoço e cabeça olhando para a bola */}
        <Parte nos={[[149, 80, 10], [151, 93, 12]]} tons={PELE} />
        <ellipse cx="149" cy="66" rx="11" ry="13" fill={PELE.base} transform="rotate(12 149 66)" />
        <path d="M155 57 Q162 64 158 77 Q153 80 150 79 Q157 69 155 57 Z" fill={PELE.sombra} opacity="0.45" />
        <path d="M137 64 Q136 50 149 50 Q160 50 161 59 Q154 54 148 56 Q141 58 137 64 Z" fill="#5b3a1e" />
        <path d="M152 60 Q155 58 158 60" stroke="#3f2614" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="155.5" cy="62.5" r="1.1" fill="#1c1209" />
        <path d="M153 71 Q156 72 158 70" stroke="#9a4f3c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <ellipse cx="140.5" cy="67" rx="2.4" ry="3.4" fill={PELE.sombra} />

        {/* braços: sobem juntos no toque */}
        <g>
          <Animar tipo="rotate" values="0 152 101;0 152 101;-7 152 101;0 152 101;0 152 101" keyTimes="0;0.38;0.48;0.62;1" dur={DUR} />
          <Parte nos={BRACO_TRAS} tons={PELE} />
          <path d={membro([[173, 99, 16], [182, 106, 14]])} fill={CAMISA.base} />
          <Parte nos={BRACO_FRENTE} tons={PELE} />
          <path d={membro([[132, 104, 17], [145, 110, 15]])} fill={CAMISA.base} />
          <path d={membro([[212, 143, 10], [221, 146, 9], [226, 147, 6]])} fill={PELE.base} />
          <path d="M214 149 L220 150" stroke={PELE.sombra} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M209 142 L213 146" stroke="#f472b6" strokeWidth="2.4" strokeLinecap="round" />
          <g stroke={NEON} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" filter="url(#vl-brilho)" fill="none">
            <polyline points={BRACO_E.map((p) => p.join(',')).join(' ')} />
            <polyline points={BRACO_D.map((p) => p.join(',')).join(' ')} />
          </g>
          <g filter="url(#vl-brilho)">
            {[...BRACO_E.slice(1), ...BRACO_D.slice(1)].map((p) => (
              <Junta key={`${p}`} p={p} />
            ))}
          </g>
        </g>

        {/* esqueleto rastreado do corpo */}
        <g stroke={NEON} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" filter="url(#vl-brilho)">
          {OSSOS.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={JUNTAS[a][0]} y1={JUNTAS[a][1]} x2={JUNTAS[b][0]} y2={JUNTAS[b][1]} />
          ))}
        </g>
        <g filter="url(#vl-brilho)">
          {Object.entries(JUNTAS).map(([nome, p]) => (
            <Junta key={nome} p={p} />
          ))}
        </g>
      </g>

      {/* bola: desce acelerando, toca os antebraços e volta subindo */}
      <g transform="translate(212 126)">
        <g>
          <Animar
            tipo="translate"
            values="34 -170;0 0;-50 -150;-50 -150"
            keyTimes="0;0.44;0.84;1"
            curvas="0.5 0 1 0.6;0 0.4 0.5 1;0 0 1 1"
            dur={DUR}
          />
          <AnimarAtributo atributo="opacity" values="1;1;0;0" keyTimes="0;0.8;0.84;1" dur={DUR} />
          <g>
            <Animar tipo="rotate" values="0;200;380;380" keyTimes="0;0.44;0.84;1" dur={DUR} linear />
            <circle r="13" fill="#f8fafc" />
            <path d="M-13 0 A13 13 0 0 1 4 -12.4 Q-2 -4 -13 0 Z" fill="#dc2626" />
            <path d="M13 1 A13 13 0 0 1 -6 11.5 Q4 4 13 1 Z" fill="#2563eb" />
            <path d="M-12 5 Q0 2 6 -12 M-4 12 Q4 2 12 -6" stroke="#cbd5e1" strokeWidth="0.8" fill="none" />
            <circle r="13" fill="none" stroke="#94a3b8" strokeWidth="0.6" />
          </g>
        </g>
      </g>

      {/* brilho do impacto nos antebraços */}
      <circle cx="210" cy="136" r="4" fill="none" stroke={NEON} strokeWidth="1.5" opacity="0">
        <AnimarAtributo atributo="r" values="4;4;20;20" keyTimes="0;0.44;0.6;1" dur={DUR} />
        <AnimarAtributo atributo="opacity" values="0;0;0.9;0;0" keyTimes="0;0.43;0.45;0.6;1" dur={DUR} />
      </circle>
    </svg>
  )
}

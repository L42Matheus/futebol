import { Animar, AnimarAtributo, Girar, Parte, PontoNoCaminho, type Tons } from '../cena'
import { membro, type No } from '../corpo'

// Infiltração com drible baixo, com o movimento "rastreado" por cima.
const DRIBLE = '1.1s'
const NEON = '#e879f9'
const OURO = '#fbbf24'

const PELE: Tons = { base: '#a86f48', sombra: '#6e4329', brilho: '#e0a77c' }
const REGATA: Tons = { base: '#1d4ed8', sombra: '#172f7a', brilho: '#5b8cff' }
const MANGUITO: Tons = { base: '#eef2f7', sombra: '#a9b4c4', brilho: '#ffffff' }
const TENIS: Tons = { base: '#2dd4bf', sombra: '#0f766e', brilho: '#99f6e4' }

// Pernas: a de trás (esquerda na tela) estica para trás, a da frente avança.
const PERNA_TRAS: No[] = [[146, 174, 24], [137, 193, 21], [127, 211, 15], [121, 229, 15], [115, 246, 9]]
const PERNA_FRENTE: No[] = [[172, 174, 24], [185, 189, 21], [197, 205, 15], [204, 225, 15], [209, 244, 9]]
const BRACO_LIVRE: No[] = [[129, 100, 17], [116, 112, 15], [104, 124, 10], [93, 131, 11], [82, 137, 7]]
const BRACO_DRIBLE: No[] = [[184, 101, 17], [193, 116, 15], [198, 132, 10], [197, 146, 11], [193, 160, 7]]

const ORBITA = 'M38 256 A112 150 0 0 1 262 256'
const ORBITA_FORA = 'M18 262 A132 176 0 0 1 282 262'

type Ponto = readonly [number, number]
const JUNTAS: Record<string, Ponto> = {
  pescoco: [157, 88],
  ombroE: [129, 100],
  ombroD: [184, 101],
  cotoveloE: [104, 124],
  punhoE: [82, 137],
  pelve: [159, 168],
  quadrilE: [146, 174],
  quadrilD: [172, 174],
  joelhoE: [127, 211],
  tornozeloE: [115, 246],
  joelhoD: [197, 205],
  tornozeloD: [209, 244],
}
const OSSOS: [string, string][] = [
  ['pescoco', 'ombroE'], ['pescoco', 'ombroD'], ['pescoco', 'pelve'],
  ['ombroE', 'cotoveloE'], ['cotoveloE', 'punhoE'], ['ombroD', 'quadrilD'],
  ['pelve', 'quadrilE'], ['pelve', 'quadrilD'],
  ['quadrilE', 'joelhoE'], ['joelhoE', 'tornozeloE'],
  ['quadrilD', 'joelhoD'], ['joelhoD', 'tornozeloD'],
]
// Braço do drible tem esqueleto próprio, que gira junto com ele.
const COTOVELO_D: Ponto = [198, 132]
const PUNHO_D: Ponto = [193, 160]

function Junta({ p }: { p: Ponto }) {
  return (
    <circle cx={p[0]} cy={p[1]} r="2.6" fill="#fdf4ff" stroke={NEON} strokeWidth="1.3">
      <AnimarAtributo atributo="r" values="2.6;3.3;2.6" keyTimes="0;0.5;1" dur={DRIBLE} />
    </circle>
  )
}

function Tenis({ x, y, lado }: { x: number; y: number; lado: 1 | -1 }) {
  // Tênis desenhado apontando para a direita e espelhado quando o pé aponta para a esquerda.
  return (
    <g transform={`translate(${x} ${y}) scale(${lado} 1)`}>
      <path d="M-8 -6 Q-6 -12 2 -11 L8 -8 Q20 -6 25 2 Q26 7 20 8 H-8 Q-12 4 -8 -6 Z" fill={TENIS.base} />
      <path d="M-8 2 Q6 0 25 3 L24 8 H-9 Z" fill="#f8fafc" />
      <path d="M-2 -9 Q6 -6 10 -3" stroke={TENIS.sombra} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M2 -4 L14 -2" stroke={TENIS.brilho} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
    </g>
  )
}

export default function CenaBasquete() {
  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" role="img" aria-label="Jogador de basquete infiltrando com drible baixo, com o movimento rastreado por linhas e articulações">
      <defs>
        <linearGradient id="bq-fundo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1033" />
          <stop offset="60%" stopColor="#0f1424" />
          <stop offset="100%" stopColor="#0b0f1a" />
        </linearGradient>
        <linearGradient id="bq-piso" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c2410c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="bq-luz-roxa" cx="0%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#c026d3" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#c026d3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bq-holofote" cx="55%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bq-bola" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="55%" stopColor="#d9550f" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <linearGradient id="bq-regata" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={REGATA.brilho} />
          <stop offset="45%" stopColor={REGATA.base} />
          <stop offset="100%" stopColor={REGATA.sombra} />
        </linearGradient>
        <radialGradient id="bq-fade-pontos" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="bq-mascara-pontos">
          <rect width="160" height="170" fill="url(#bq-fade-pontos)" />
        </mask>
        <pattern id="bq-pontos" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#e879f9" />
        </pattern>
        <filter id="bq-brilho" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="borrado" />
          <feMerge>
            <feMergeNode in="borrado" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bq-desfoque" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* ginásio */}
      <rect width="300" height="300" fill="url(#bq-fundo)" />
      <rect width="300" height="300" fill="url(#bq-luz-roxa)" />
      <rect width="160" height="170" fill="url(#bq-pontos)" mask="url(#bq-mascara-pontos)" opacity="0.5" />
      <g stroke="#f5f3ff" strokeOpacity="0.28" fill="none" strokeWidth="1.5">
        <rect x="236" y="34" width="50" height="34" rx="2" />
        <rect x="252" y="46" width="18" height="14" />
      </g>
      <path d="M254 70 h14" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

      {/* marcador desfocado ao fundo, para dar profundidade */}
      <g filter="url(#bq-desfoque)" opacity="0.5" fill="#3b1f5c">
        <ellipse cx="62" cy="92" rx="13" ry="15" />
        <path d="M38 108 Q62 98 86 108 L92 170 L82 222 H44 L32 170 Z" />
      </g>

      {/* piso em perspectiva */}
      <path d="M0 222 H300 V300 H0 Z" fill="url(#bq-piso)" />
      <g stroke="#a855f7" strokeOpacity="0.45" strokeWidth="1.2" fill="none">
        <path d="M0 222 H300" />
        <path d="M150 222 L150 300" strokeDasharray="3 5" />
        <path d="M60 222 L-20 300 M240 222 L320 300" />
      </g>
      <ellipse cx="150" cy="258" rx="122" ry="24" fill="none" stroke="#a855f7" strokeOpacity="0.7" strokeWidth="1.6" strokeDasharray="3 4" />
      <ellipse cx="150" cy="256" rx="48" ry="9" fill="none" stroke={OURO} strokeOpacity="0.8" strokeWidth="1.3" />
      <rect width="300" height="300" fill="url(#bq-holofote)" />

      {/* órbitas douradas */}
      <path d={ORBITA_FORA} fill="none" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1" />
      <path d={ORBITA} fill="none" stroke={OURO} strokeOpacity="0.85" strokeWidth="1.3">
        <AnimarAtributo atributo="stroke-opacity" values="0.55;0.95;0.55" keyTimes="0;0.5;1" dur="3s" />
      </path>
      {[[62, 163], [150, 106], [238, 163]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="3" fill={OURO} />
      ))}
      <PontoNoCaminho caminho={ORBITA} dur="6s" r={3.2} cor="#fb923c" />
      <PontoNoCaminho caminho={ORBITA} dur="6s" inicio="-3s" r={2.4} cor={OURO} />
      <PontoNoCaminho caminho={ORBITA_FORA} dur="9s" inicio="-4s" r={2.2} cor="#e879f9" />

      {/* sombras no piso */}
      <ellipse cx="160" cy="258" rx="66" ry="6" fill="#000" opacity="0.3" />
      <ellipse cx="190" cy="253" rx="9" ry="2.5" fill="#000" opacity="0.4">
        <AnimarAtributo atributo="rx" values="6;13;6" keyTimes="0;0.5;1" dur={DRIBLE} />
      </ellipse>
      <ellipse cx="190" cy="253" rx="4" ry="2" fill="none" stroke={NEON} strokeWidth="1.4" opacity="0">
        <AnimarAtributo atributo="rx" values="4;4;28;28" keyTimes="0;0.48;0.9;1" dur={DRIBLE} />
        <AnimarAtributo atributo="ry" values="2;2;6;6" keyTimes="0;0.48;0.9;1" dur={DRIBLE} />
        <AnimarAtributo atributo="opacity" values="0;0;0.9;0;0" keyTimes="0;0.47;0.5;0.9;1" dur={DRIBLE} />
      </ellipse>

      <g>
        {/* o corpo afunda um pouco a cada quique */}
        <Animar tipo="translate" values="0 0;0 2.5;0 0" keyTimes="0;0.5;1" dur={DRIBLE} />

        {/* perna de trás */}
        <Parte nos={PERNA_TRAS} tons={PELE} lado={-1} />
        <path d={membro([[118, 238, 13], [115, 247, 11]])} fill="#f8fafc" />
        <Tenis x={110} y={252} lado={-1} />

        {/* perna da frente, com manguito de compressão */}
        <Parte nos={PERNA_FRENTE} tons={PELE} />
        <Parte nos={[[193, 199, 17], [199, 214, 16], [205, 232, 13], [208, 241, 10]]} tons={MANGUITO} />
        <path d={membro([[207, 238, 12], [209, 247, 11]])} fill="#f8fafc" />
        <Tenis x={214} y={252} lado={1} />

        {/* calção comprido */}
        <path d={membro([[146, 170, 34], [137, 189, 31], [129, 204, 28]])} fill={REGATA.base} />
        <path d={membro([[172, 170, 34], [184, 186, 31], [194, 200, 28]])} fill={REGATA.base} />
        <path d="M136 162 H184 L186 184 L160 196 L134 184 Z" fill={REGATA.base} />
        <path d={membro([[142, 178, 14], [133, 196, 10]], { deslocamento: 0.3 })} fill={REGATA.sombra} opacity="0.7" />
        <path d={membro([[178, 178, 14], [190, 194, 10]], { deslocamento: -0.3 })} fill={REGATA.sombra} opacity="0.7" />
        <path d="M118 202 L140 212 M186 206 L206 194" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
        <path d="M118 206 L139 216 M187 210 L207 198" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        <path d="M136 164 H184" stroke="#fbbf24" strokeWidth="4" />

        {/* tronco: pele dos ombros por baixo, regata por cima */}
        <path d="M124 100 Q157 84 190 100 L186 134 L130 134 Z" fill={PELE.base} />
        <path d="M176 92 Q186 96 190 102 L186 120 Z" fill={PELE.sombra} opacity="0.5" />
        <path
          d="M141 88 L131 94 Q139 112 136 131 Q133 150 137 166 L183 166 Q186 150 182 131 Q178 113 186 96 L174 88 Q158 108 141 88 Z"
          fill="url(#bq-regata)"
        />
        <path d="M150 120 Q160 150 158 166" stroke={REGATA.sombra} strokeWidth="5" fill="none" opacity="0.35" strokeLinecap="round" />
        <g stroke="#fbbf24" strokeWidth="2.6" fill="none" strokeLinecap="round">
          <path d="M141 88 Q158 108 174 88" />
          <path d="M131 94 Q139 112 136 131" />
          <path d="M186 96 Q178 113 182 131" />
        </g>
        <text x="160" y="152" textAnchor="middle" fontSize="22" fontWeight="900" fill="#f8fafc" stroke="#991b1b" strokeWidth="1.2" paintOrder="stroke">
          12
        </text>

        {/* braço que afasta o marcador */}
        <Parte nos={BRACO_LIVRE} tons={PELE} lado={-1} />
        <path d={membro([[82, 137, 8], [72, 141, 10], [63, 142, 7]])} fill={PELE.base} />
        <path d={membro([[78, 135, 4], [73, 129, 3.5]])} fill={PELE.base} />
        <path d="M66 137 L59 137 M66 141 L58 142 M66 145 L59 147" stroke={PELE.base} strokeWidth="3.4" strokeLinecap="round" />

        {/* pescoço e cabeça */}
        <Parte nos={[[156, 76, 11], [157, 90, 13]]} tons={PELE} />
        <ellipse cx="156" cy="62" rx="11.5" ry="14" fill={PELE.base} />
        <path d="M162 52 Q170 60 166 74 Q160 78 156 76 Q164 66 162 52 Z" fill={PELE.sombra} opacity="0.55" />
        <ellipse cx="145.5" cy="64" rx="2.6" ry="3.6" fill={PELE.sombra} />
        <path d="M144 58 Q145 46 157 47 Q168 48 168 58 Q164 53 157 53 Q150 53 144 58 Z" fill="#17120f" />
        <path d="M147 70 Q150 79 157 78 Q164 77 166 70 Q164 73 160 74 L154 74 Q150 73 147 70 Z" fill="#17120f" opacity="0.85" />
        <path d="M157 61 L163 60 M157 65 Q160 64 162 65" stroke="#2b1a10" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <circle cx="161" cy="62.5" r="1.1" fill="#120c08" />
        <path d="M164 64 Q167 67 165 69" stroke={PELE.sombra} strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* esqueleto rastreado */}
        <g stroke={NEON} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" filter="url(#bq-brilho)">
          {OSSOS.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={JUNTAS[a][0]} y1={JUNTAS[a][1]} x2={JUNTAS[b][0]} y2={JUNTAS[b][1]} />
          ))}
        </g>
        <g filter="url(#bq-brilho)">
          {Object.entries(JUNTAS).map(([nome, p]) => (
            <Junta key={nome} p={p} />
          ))}
        </g>

        {/* braço do drible */}
        <g>
          <Animar tipo="rotate" values="3 184 101;-6 184 101;0 184 101;3 184 101" keyTimes="0;0.25;0.55;1" dur={DRIBLE} />
          <Parte nos={BRACO_DRIBLE} tons={PELE} />
          <path d={membro([[193, 160, 8], [191, 168, 11], [187, 174, 8]])} fill={PELE.base} />
          <path d="M184 174 L180 177 M188 175 L185 179 M192 174 L190 179" stroke={PELE.base} strokeWidth="3" strokeLinecap="round" />
          <path d="M191 158 L195 162" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          <g stroke={NEON} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" filter="url(#bq-brilho)">
            <line x1={JUNTAS.ombroD[0]} y1={JUNTAS.ombroD[1]} x2={COTOVELO_D[0]} y2={COTOVELO_D[1]} />
            <line x1={COTOVELO_D[0]} y1={COTOVELO_D[1]} x2={PUNHO_D[0]} y2={PUNHO_D[1]} />
          </g>
          <g filter="url(#bq-brilho)">
            <Junta p={COTOVELO_D} />
            <Junta p={PUNHO_D} />
          </g>
        </g>
      </g>

      {/* bola: acelera na descida, freia na subida */}
      <g transform="translate(189 191)">
        <g>
          <Animar tipo="translate" values="0 0;1 47;0 0" keyTimes="0;0.5;1" curvas="0.55 0 1 0.45;0 0.55 0.45 1" dur={DRIBLE} />
          <g>
            <Girar dur="3s" />
            <circle r="22" fill="none" stroke={NEON} strokeOpacity="0.75" strokeWidth="1.1" strokeDasharray="6 5" />
          </g>
          <circle r="15" fill="url(#bq-bola)" />
          <path d="M-15 0 H15 M0 -15 V15 M-11 -10 Q-4 0 -11 10 M11 -10 Q4 0 11 10" fill="none" stroke="#3b1206" strokeWidth="1.2" />
          <ellipse cx="-5" cy="-7" rx="5" ry="3" fill="#fff" opacity="0.18" transform="rotate(-30 -5 -7)" />
        </g>
      </g>
    </svg>
  )
}

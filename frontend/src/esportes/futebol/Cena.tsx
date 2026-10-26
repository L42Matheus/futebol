import { Animar, AnimarAtributo, Girar, Parte, PontoNoCaminho, type Tons } from '../cena'
import { membro, type No } from '../corpo'

// Chute a gol: arma a perna, bate na bola, ela entra no ângulo e a rede estufa.
const DUR = '2.8s'
const NEON = '#34d399'
const OURO = '#fbbf24'

const PELE: Tons = { base: '#c48a5c', sombra: '#8a5a37', brilho: '#ecb88b' }
const CAMISA: Tons = { base: '#10b981', sombra: '#04694a', brilho: '#6ee7b7' }
const MEIAO: Tons = { base: '#059669', sombra: '#064e3b', brilho: '#34d399' }

// Linha do tempo (fração do ciclo): arma até 0.34, contato em 0.42, gol em 0.6.
const TEMPOS = '0;0.34;0.42;0.5;0.8;1'

// Valores de rotação em torno de um ponto, um por marco da linha do tempo.
function giro(angulos: number[], [x, y]: readonly [number, number]) {
  return angulos.map((a) => `${a} ${x} ${y}`).join(';')
}

const QUADRIL: [number, number] = [118, 168]
const JOELHO: [number, number] = [115, 208]
// Perna do chute desenhada reta para baixo; gira no quadril e a canela gira no joelho.
const COXA: No[] = [[118, 168, 22], [116, 188, 19], [115, 208, 14]]
const CANELA: No[] = [[115, 208, 14], [114, 226, 13], [113, 246, 8]]
const PERNA_APOIO: No[] = [[122, 170, 22], [128, 190, 19], [131, 210, 14], [129, 230, 13], [126, 248, 8]]
const BRACO_FRENTE: No[] = [[130, 100, 15], [140, 108, 13], [150, 114, 9], [160, 112, 9], [170, 108, 6]]
const BRACO_TRAS: No[] = [[106, 100, 15], [96, 108, 13], [86, 115, 9], [78, 110, 9], [70, 104, 6]]

const ORBITA = 'M30 258 A110 150 0 0 1 250 258'

type Ponto = readonly [number, number]
const JUNTAS: Record<string, Ponto> = {
  pescoco: [119, 90],
  ombroF: [130, 100],
  ombroT: [106, 100],
  pelve: [119, 162],
  joelhoApoio: [131, 210],
  tornozeloApoio: [126, 248],
}
const OSSOS: [string, string][] = [
  ['pescoco', 'ombroF'], ['pescoco', 'ombroT'], ['pescoco', 'pelve'],
  ['pelve', 'joelhoApoio'], ['joelhoApoio', 'tornozeloApoio'],
]

const LUZES: [number, number, number, string][] = [
  [30, 40, 16, '#fef3c7'], [86, 22, 10, '#fde68a'], [214, 26, 12, '#e0f2fe'],
  [270, 46, 18, '#fef9c3'], [160, 60, 8, '#bbf7d0'], [56, 104, 9, '#fde68a'],
]

function Junta({ p }: { p: Ponto }) {
  return <circle cx={p[0]} cy={p[1]} r="2.6" fill="#ecfdf5" stroke={NEON} strokeWidth="1.3" />
}

function Chuteira({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-7 -6 Q-5 -11 2 -10 L8 -7 Q19 -5 22 2 Q22 6 17 6 H-7 Q-10 2 -7 -6 Z" fill="#111827" />
      <path d="M-1 -4 L12 -1" stroke={NEON} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M-4 7 V9 M4 7 V9 M12 7 V9" stroke="#e5e7eb" strokeWidth="1.4" />
    </g>
  )
}

export default function CenaFutebol() {
  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" role="img" aria-label="Jogador de futebol chutando a bola no ângulo, com o movimento rastreado por linhas e articulações">
      <defs>
        <linearGradient id="fb-fundo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1f1a" />
          <stop offset="55%" stopColor="#0c1622" />
          <stop offset="100%" stopColor="#0b0f1a" />
        </linearGradient>
        <linearGradient id="fb-gramado" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15803d" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#14532d" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="fb-camisa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={CAMISA.brilho} />
          <stop offset="45%" stopColor={CAMISA.base} />
          <stop offset="100%" stopColor={CAMISA.sombra} />
        </linearGradient>
        <radialGradient id="fb-holofote" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ecfccb" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ecfccb" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fb-clarao" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fb-bola" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>
        <pattern id="fb-rede" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 0 H7 M0 0 V7" stroke="#e2e8f0" strokeWidth="0.7" />
        </pattern>
        <filter id="fb-desfoque" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="fb-desfoque-leve">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id="fb-brilho" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="borrado" />
          <feMerge>
            <feMergeNode in="borrado" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* estádio à noite: luzes e torcida desfocadas */}
      <rect width="300" height="300" fill="url(#fb-fundo)" />
      <g filter="url(#fb-desfoque)">
        {LUZES.map(([cx, cy, r, cor]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={cor} opacity="0.55">
            <AnimarAtributo atributo="opacity" values="0.35;0.7;0.35" keyTimes="0;0.5;1" dur={`${2 + (cx % 3)}s`} />
          </circle>
        ))}
      </g>
      <g filter="url(#fb-desfoque-leve)" opacity="0.4">
        {Array.from({ length: 34 }, (_, i) => (
          <circle key={i} cx={6 + i * 8.8} cy={122 + ((i * 7) % 5) * 3} r="3.4" fill={['#facc15', '#22c55e', '#f8fafc', '#38bdf8'][i % 4]} />
        ))}
        <rect x="0" y="132" width="300" height="20" fill="#0f172a" />
      </g>

      {/* gramado */}
      <path d="M0 214 H300 V300 H0 Z" fill="url(#fb-gramado)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${i * 70 - 20} 300 L${i * 60 + 10} 214 H${i * 60 + 40} L${i * 70 + 15} 300 Z`} fill="#22c55e" opacity="0.07" />
      ))}
      <path d="M0 214 H300" stroke="#bbf7d0" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M196 300 L214 236" stroke="#f8fafc" strokeOpacity="0.4" strokeWidth="1.5" />

      {/* gol: a rede do fundo estufa quando a bola entra */}
      <g>
        <g>
          <Animar tipo="translate" values="0 0;0 0;0 0;0 0;7 -2;0 0" keyTimes={TEMPOS} dur={DUR} />
          <path d="M228 162 H300 V226 H228 Z" fill="url(#fb-rede)" opacity="0.8" />
        </g>
        <path d="M212 150 L228 162 M212 236 L228 226" stroke="#e2e8f0" strokeOpacity="0.6" strokeWidth="1.5" />
        <path d="M212 150 L228 162 V226 L212 236 Z" fill="url(#fb-rede)" opacity="0.5" />
        {/* goleiro desfocado, saltando tarde demais */}
        <g filter="url(#fb-desfoque-leve)" opacity="0.65">
          <g>
            <Animar tipo="rotate" values="0 252 214;0 252 214;0 252 214;-30 252 214;-55 252 214;0 252 214" keyTimes={TEMPOS} dur={DUR} />
            <ellipse cx="252" cy="182" rx="7" ry="8" fill="#a16207" />
            <path d="M241 192 Q252 186 263 192 L262 218 H242 Z" fill="#f59e0b" />
            <path d="M242 196 L230 178 M262 196 L272 180" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
            <path d="M246 218 L244 238 M258 218 L262 238" stroke="#1f2937" strokeWidth="7" strokeLinecap="round" />
          </g>
        </g>
        <path d="M212 238 V150 H300" fill="none" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
      </g>

      <rect width="300" height="300" fill="url(#fb-holofote)" />
      <path d={ORBITA} fill="none" stroke={OURO} strokeOpacity="0.55" strokeWidth="1.2" />
      <PontoNoCaminho caminho={ORBITA} dur="7s" r={3} cor={OURO} />
      <PontoNoCaminho caminho={ORBITA} dur="7s" inicio="-3.5s" r={2.4} cor={NEON} />

      <ellipse cx="124" cy="254" rx="40" ry="5" fill="#000" opacity="0.4" />

      <g>
        {/* corpo inclina para trás na hora do chute */}
        <Animar tipo="rotate" values="0 122 248;3 122 248;-4 122 248;-2 122 248;0 122 248;0 122 248" keyTimes={TEMPOS} dur={DUR} />

        {/* braço de trás e perna de apoio */}
        <g>
          <Animar tipo="rotate" values="0 106 100;10 106 100;-14 106 100;-8 106 100;0 106 100;0 106 100" keyTimes={TEMPOS} dur={DUR} />
          <Parte nos={BRACO_TRAS} tons={PELE} lado={-1} />
          <path d={membro([[106, 100, 17], [97, 107, 15]])} fill={CAMISA.sombra} />
        </g>
        <Parte nos={PERNA_APOIO} tons={PELE} lado={-1} />
        <Parte nos={[[130, 222, 14], [128, 236, 13], [126, 246, 10]]} tons={MEIAO} lado={-1} />
        <Chuteira x={128} y={252} />

        {/* calção, camisa, pescoço e cabeça */}
        <path d={membro([[120, 160, 30], [124, 178, 26]])} fill="#f8fafc" />
        <path d={membro([[124, 170, 12], [127, 182, 10]], { deslocamento: -0.3 })} fill="#cbd5e1" opacity="0.8" />
        <path d="M106 102 Q120 94 134 102 L136 130 Q134 150 132 166 L106 166 Q104 150 104 128 Z" fill="url(#fb-camisa)" />
        <path d="M113 96 Q120 103 127 96" stroke="#f8fafc" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M120 120 Q125 145 122 164" stroke={CAMISA.sombra} strokeWidth="5" fill="none" opacity="0.3" strokeLinecap="round" />
        <text x="121" y="146" textAnchor="middle" fontSize="18" fontWeight="900" fill="#f8fafc" stroke="#065f46" strokeWidth="1.1" paintOrder="stroke">
          9
        </text>
        <Parte nos={[[119, 80, 10], [119, 93, 12]]} tons={PELE} />
        <ellipse cx="121" cy="68" rx="11" ry="13" fill={PELE.base} transform="rotate(8 121 68)" />
        <path d="M127 58 Q134 66 129 79 Q124 82 120 81 Q128 71 127 58 Z" fill={PELE.sombra} opacity="0.45" />
        <ellipse cx="112" cy="69" rx="2.4" ry="3.4" fill={PELE.sombra} />
        <path d="M110 64 Q110 51 122 51 Q133 52 133 61 Q127 56 121 57 Q114 58 110 64 Z" fill="#1c1410" />
        <path d="M124 63 L130 62" stroke="#1c1410" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="127.5" cy="65.5" r="1.1" fill="#120c08" />
        <path d="M125 73 L130 73" stroke="#5c2c1f" strokeWidth="1.3" strokeLinecap="round" />

        {/* perna do chute: coxa gira no quadril e a canela no joelho */}
        <g>
          <Animar
            tipo="rotate"
            values={giro([30, 38, -40, -62, 20, 30], QUADRIL)}
            keyTimes={TEMPOS}
            dur={DUR}
          />
          <Parte nos={COXA} tons={PELE} />
          <path d={membro([[118, 166, 26], [117, 182, 23]])} fill="#f8fafc" />
          <g>
            <Animar
              tipo="rotate"
              values={giro([70, 90, 5, -8, 60, 70], JOELHO)}
              keyTimes={TEMPOS}
              dur={DUR}
            />
            <Parte nos={CANELA} tons={PELE} />
            <Parte nos={[[114, 220, 14], [113.5, 234, 13], [113, 244, 10]]} tons={MEIAO} />
            <Chuteira x={115} y={250} />
            <g stroke={NEON} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" filter="url(#fb-brilho)">
              <line x1={JOELHO[0]} y1={JOELHO[1]} x2="113" y2="246" />
            </g>
            <g filter="url(#fb-brilho)">
              <Junta p={[113, 246]} />
            </g>
          </g>
          <g stroke={NEON} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" filter="url(#fb-brilho)">
            <line x1={QUADRIL[0]} y1={QUADRIL[1]} x2={JOELHO[0]} y2={JOELHO[1]} />
          </g>
          <g filter="url(#fb-brilho)">
            <Junta p={JOELHO} />
          </g>
        </g>

        {/* braço da frente abre para equilibrar */}
        <g>
          <Animar tipo="rotate" values="0 130 100;-12 130 100;16 130 100;10 130 100;0 130 100;0 130 100" keyTimes={TEMPOS} dur={DUR} />
          <Parte nos={BRACO_FRENTE} tons={PELE} />
          <path d={membro([[130, 100, 17], [140, 107, 15]])} fill={CAMISA.base} />
        </g>

        {/* esqueleto rastreado do tronco e da perna de apoio */}
        <g stroke={NEON} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" filter="url(#fb-brilho)">
          {OSSOS.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={JUNTAS[a][0]} y1={JUNTAS[a][1]} x2={JUNTAS[b][0]} y2={JUNTAS[b][1]} />
          ))}
          <polyline points="130,100 150,114 170,108" fill="none" />
          <polyline points="106,100 86,115 70,104" fill="none" />
        </g>
        <g filter="url(#fb-brilho)">
          {Object.entries(JUNTAS).map(([nome, p]) => (
            <Junta key={nome} p={p} />
          ))}
        </g>
      </g>

      {/* bola: parada até o chute, depois curva até o ângulo */}
      <g transform="translate(166 243)">
        <g>
          <Animar
            tipo="translate"
            values="0 0;0 0;0 0;46 -60;92 -66;92 -66;0 0"
            keyTimes="0;0.34;0.42;0.52;0.62;0.86;1"
            linear
            dur={DUR}
          />
          <AnimarAtributo atributo="opacity" values="1;1;0;0;1" keyTimes="0;0.84;0.86;0.95;1" dur={DUR} />
          <g>
            <Girar dur="0.8s" />
            <circle r="8.5" fill="url(#fb-bola)" />
            <path d="M0 -3.5 L3.4 -1 L2.1 3 H-2.1 L-3.4 -1 Z" fill="#111827" />
            <path d="M0 -3.5 V-8.5 M3.4 -1 L8 -2.6 M2.1 3 L5 6.8 M-2.1 3 L-5 6.8 M-3.4 -1 L-8 -2.6" stroke="#111827" strokeWidth="1" />
          </g>
        </g>
      </g>

      {/* clarão e "GOL!" quando a bola entra */}
      <circle cx="258" cy="177" r="30" fill="url(#fb-clarao)" opacity="0">
        <AnimarAtributo atributo="opacity" values="0;0;0.9;0;0" keyTimes="0;0.6;0.63;0.8;1" dur={DUR} />
      </circle>
      <text x="150" y="44" textAnchor="middle" fontSize="34" fontWeight="900" fill="#fef08a" stroke="#065f46" strokeWidth="2" paintOrder="stroke" opacity="0" letterSpacing="2">
        GOL!
        <AnimarAtributo atributo="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.64;0.86;0.92;1" dur={DUR} />
      </text>
    </svg>
  )
}

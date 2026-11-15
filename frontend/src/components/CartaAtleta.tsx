import { useState } from 'react'
import type { ComponentType } from 'react'
import { RotateCw, Star } from 'lucide-react'
import { urlFoto } from './Avatar'
import { AnimacaoAtiva } from '../esportes/cena'
import { CORES_NIVEL, estrelas, nivel } from '../utils/carta'

interface CartaAtletaProps {
  nome: string
  fotoUrl?: string | null
  // Sigla curta da posição, ex.: ATA, GOL, LEV.
  posicao?: string
  nota?: number | null
  // Número da camisa, mostrado no verso.
  numero?: number | null
  // Cena animada do esporte (chute, cortada, enterrada) para o verso; sem ela a carta não vira.
  Cena?: ComponentType
  atributos?: Record<string, number> | null
  // Atributos do esporte na ordem da carta.
  lista: { sigla: string; nome: string }[]
}

function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'
}

// Carta do atleta: sempre escura, como a do jogo, com a moldura na cor do nível (bronze, prata, ouro).
// A frente tem a foto e as notas; tocar vira a carta e o verso mostra o lance do esporte, animado.
export default function CartaAtleta({ nome, fotoUrl, posicao, nota, numero, atributos, lista, Cena }: CartaAtletaProps) {
  const cores = CORES_NIVEL[nivel(nota)]
  const total = estrelas(nota)
  const [virada, setVirada] = useState(false)
  // Quem pediu "reduzir movimento" no sistema vê o verso parado.
  const [animar] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const moldura = 'tema-escuro overflow-hidden rounded-[2rem] border-[3px] bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 shadow-2xl shadow-black/30'

  const frente = (
    <div className={`carta-face relative px-5 pb-6 pt-5 text-center ${moldura}`} style={{ borderColor: cores.moldura }}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rotate-12 bg-white/5" aria-hidden="true" />
      <div className="relative flex items-start justify-between">
        <div className="text-left leading-none">
          <p className="text-5xl font-black tabular-nums" style={{ color: cores.destaque }}>{nota ?? '–'}</p>
          {posicao && <p className="mt-1 text-sm font-black uppercase tracking-widest text-white/80">{posicao}</p>}
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]" style={{ backgroundColor: `${cores.moldura}33`, color: cores.destaque }}>
          {nota ? nivel(nota) : 'sem nota'}
        </span>
      </div>

      <div
        className="relative mx-auto -mt-2 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[3px] bg-emerald-800 text-3xl font-black text-white"
        style={{ borderColor: `${cores.moldura}aa` }}
      >
        {fotoUrl ? <img src={urlFoto(fotoUrl)} alt="" className="h-full w-full object-cover" /> : iniciais(nome)}
      </div>

      {/* Nome comprido diminui antes de cortar com reticências. */}
      <p
        className={`relative mt-4 truncate font-black uppercase tracking-wide text-white ${
          nome.length > 18 ? 'text-base' : nome.length > 13 ? 'text-xl' : 'text-2xl'
        }`}
      >
        {nome}
      </p>

      <div className="relative mt-2 flex justify-center gap-1" aria-label={nota ? `${total} de 5 estrelas` : 'Sem nota'}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={20}
            strokeWidth={1.5}
            style={i < total ? { color: cores.destaque, fill: cores.destaque } : { color: 'rgba(255,255,255,0.25)' }}
          />
        ))}
      </div>

      <div className="relative mt-5 grid grid-cols-6 divide-x divide-white/10 border-t border-white/10 pt-4">
        {lista.map(({ sigla, nome: nomeAtributo }) => (
          <div key={sigla} title={nomeAtributo}>
            <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: cores.destaque }}>{sigla}</p>
            <p className="mt-0.5 text-base font-black tabular-nums text-white">{atributos?.[sigla] ?? '–'}</p>
          </div>
        ))}
      </div>

      {Cena && (
        <p className="relative mt-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white/50">
          <RotateCw size={12} /> Toque para ver o lance
        </p>
      )}
    </div>
  )

  if (!Cena) return <div className="mx-auto w-full max-w-[300px]">{frente}</div>

  return (
    <button
      type="button"
      onClick={() => setVirada((v) => !v)}
      aria-pressed={virada}
      aria-label={virada ? `Carta de ${nome}: voltar para as notas` : `Carta de ${nome}: ver o lance`}
      className="carta-virar mx-auto block w-full max-w-[300px] rounded-[2rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
    >
      <div className={`carta-virar-miolo relative ${virada ? 'carta-virada' : ''}`}>
        {frente}

        {/* Verso: o atleta em ação. A cena só é montada com a carta virada, para a animação começar do início. */}
        <div className={`carta-face carta-verso absolute inset-0 ${moldura}`} style={{ borderColor: cores.moldura }}>
          <div className="absolute inset-x-0 top-0 aspect-square">
            {virada && (
              <AnimacaoAtiva.Provider value={animar}>
                <Cena />
              </AnimacaoAtiva.Provider>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent px-5 pb-5 pt-12 text-center">
            <p className="truncate text-xl font-black uppercase tracking-wide text-white">{nome}</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-widest" style={{ color: cores.destaque }}>
              {[typeof numero === 'number' ? `Camisa ${numero}` : null, posicao].filter(Boolean).join(' · ') || 'Em ação'}
            </p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white/50">
              <RotateCw size={12} /> Toque para voltar
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

// Nota e estrelas em uma linha, para listas e para o sorteio.
export function NotaEstrelas({ nota, compacto = false }: { nota?: number | null; compacto?: boolean }) {
  if (!nota) return <span className="text-[11px] font-semibold text-gray-500">sem nota</span>
  const total = estrelas(nota)
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Nota ${nota}, ${total} de 5 estrelas`}>
      <span className={`font-black tabular-nums text-white ${compacto ? 'text-xs' : 'text-sm'}`}>{nota}</span>
      <span className="inline-flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={compacto ? 10 : 12}
            strokeWidth={1.5}
            className={i < total ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}
          />
        ))}
      </span>
    </span>
  )
}

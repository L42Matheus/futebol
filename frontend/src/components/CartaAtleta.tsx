import { Star } from 'lucide-react'
import { urlFoto } from './Avatar'
import { CORES_NIVEL, estrelas, nivel } from '../utils/carta'

interface CartaAtletaProps {
  nome: string
  fotoUrl?: string | null
  // Sigla curta da posição, ex.: ATA, GOL, LEV.
  posicao?: string
  nota?: number | null
  atributos?: Record<string, number> | null
  // Atributos do esporte na ordem da carta.
  lista: { sigla: string; nome: string }[]
}

function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'
}

// Carta do atleta: sempre escura, como a do jogo, com a moldura na cor do nível (bronze, prata, ouro).
export default function CartaAtleta({ nome, fotoUrl, posicao, nota, atributos, lista }: CartaAtletaProps) {
  const cores = CORES_NIVEL[nivel(nota)]
  const total = estrelas(nota)

  return (
    <div
      className="tema-escuro relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[2rem] border-[3px] bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 px-5 pb-6 pt-5 text-center shadow-2xl shadow-black/30"
      style={{ borderColor: cores.moldura }}
    >
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
    </div>
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

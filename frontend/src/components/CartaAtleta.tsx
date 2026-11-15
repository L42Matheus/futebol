import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'
import { Star } from 'lucide-react'
import { urlFoto } from './Avatar'
import JogadorCarta from './JogadorCarta'
import { CORES_NIVEL, estrelas, nivel } from '../utils/carta'

interface CartaAtletaProps {
  nome: string
  fotoUrl?: string | null
  // Sigla curta da posição, ex.: ATA, GOL, LEV.
  posicao?: string
  nota?: number | null
  // Número da camisa, estampado no peito do jogador.
  numero?: number | null
  atributos?: Record<string, number> | null
  // Atributos do esporte na ordem da carta.
  lista: { sigla: string; nome: string }[]
}

function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'
}

const limitar = (n: number) => Math.max(-1, Math.min(1, n))

// Inclinação da carta: o dedo (ou o mouse) grava --rx e --ry, de -1 a 1, e o CSS (.carta-3d em index.css)
// transforma isso em giro, brilho e paralaxe. Parada, a carta balança sozinha; ao soltar, volta ao centro.
function useInclinacao() {
  const ref = useRef<HTMLDivElement>(null)
  const volta = useRef<number>()

  useEffect(() => () => window.clearTimeout(volta.current), [])

  function mover(evento: PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const caixa = el.getBoundingClientRect()
    window.clearTimeout(volta.current)
    el.dataset.estado = 'ativo'
    el.style.setProperty('--rx', limitar(((evento.clientX - caixa.left) / caixa.width) * 2 - 1).toFixed(3))
    el.style.setProperty('--ry', limitar(((evento.clientY - caixa.top) / caixa.height) * 2 - 1).toFixed(3))
  }

  function soltar() {
    const el = ref.current
    if (!el || el.dataset.estado !== 'ativo') return
    el.dataset.estado = 'voltando'
    el.style.setProperty('--rx', '0')
    el.style.setProperty('--ry', '0')
    volta.current = window.setTimeout(() => {
      delete el.dataset.estado
      el.style.removeProperty('--rx')
      el.style.removeProperty('--ry')
    }, 450)
  }

  return { ref, onPointerMove: mover, onPointerLeave: soltar, onPointerUp: soltar, onPointerCancel: soltar }
}

// Carta do atleta: sempre escura, como a do jogo, com a moldura na cor do nível (bronze, prata, ouro).
// O jogador de corpo inteiro fica no meio e a carta inclina em 3D com o toque.
export default function CartaAtleta({ nome, fotoUrl, posicao, nota, numero, atributos, lista }: CartaAtletaProps) {
  const cores = CORES_NIVEL[nivel(nota)]
  const total = estrelas(nota)
  const inclinacao = useInclinacao()

  return (
    <div className="carta-3d mx-auto w-full max-w-[300px]" {...inclinacao}>
    <div
      className="carta-3d-face tema-escuro relative overflow-hidden rounded-[2rem] border-[3px] bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 px-5 pb-6 pt-5 text-center"
      style={{ borderColor: cores.moldura }}
    >
      <div className="carta-3d-fundo pointer-events-none absolute -right-16 -top-16 h-48 w-48 rotate-12 bg-white/5" aria-hidden="true" />
      <div className="relative flex items-start justify-between">
        <div className="text-left leading-none">
          <p className="text-5xl font-black tabular-nums" style={{ color: cores.destaque }}>{nota ?? '–'}</p>
          {posicao && <p className="mt-1 text-sm font-black uppercase tracking-widest text-white/80">{posicao}</p>}
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]" style={{ backgroundColor: `${cores.moldura}33`, color: cores.destaque }}>
          {nota ? nivel(nota) : 'sem nota'}
        </span>
      </div>

      <div className="carta-3d-palco relative mx-auto -mt-8 h-64">
        <div
          className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-40 w-40 rounded-full blur-2xl"
          style={{ backgroundColor: `${cores.moldura}40` }}
          aria-hidden="true"
        />
        <div className="carta-3d-jogador relative h-full">
          <JogadorCarta fotoUrl={fotoUrl ? urlFoto(fotoUrl) : null} iniciais={iniciais(nome)} numero={numero} cor={cores.moldura} />
        </div>
      </div>

      {/* Nome comprido diminui antes de cortar com reticências. */}
      <p
        className={`relative mt-1 truncate font-black uppercase tracking-wide text-white ${
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

      {/* reflexo que corre pela carta conforme ela inclina */}
      <div className="carta-3d-brilho pointer-events-none absolute inset-0" aria-hidden="true" />
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

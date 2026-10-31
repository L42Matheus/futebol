import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, ChevronRight, Flag, Flame, Megaphone, Trash2, Trophy, UserPlus } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Noticia } from '../types'

const ICONES: Record<Noticia['tipo'], { icone: ReactNode; cor: string }> = {
  resultado: { icone: <Flag size={18} />, cor: 'bg-emerald-500/10 text-emerald-400' },
  destaques: { icone: <Trophy size={18} />, cor: 'bg-amber-500/10 text-amber-400' },
  marca: { icone: <Flame size={18} />, cor: 'bg-rose-500/10 text-rose-400' },
  novo_atleta: { icone: <UserPlus size={18} />, cor: 'bg-sky-500/10 text-sky-400' },
  jogo_marcado: { icone: <CalendarPlus size={18} />, cor: 'bg-violet-500/10 text-violet-400' },
  aviso: { icone: <Megaphone size={18} />, cor: 'bg-gray-800 text-gray-300' },
}

// Para onde cada notícia leva: resultado e destaques abrem a votação/pódio, jogo marcado abre o jogo.
function destino(noticia: Noticia, rachaId: number | string): string | null {
  if (!noticia.jogo_id) return null
  if (noticia.tipo === 'resultado' || noticia.tipo === 'destaques') return `/racha/${rachaId}/jogo/${noticia.jogo_id}/destaques`
  return `/racha/${rachaId}/jogo/${noticia.jogo_id}`
}

export default function ItemResenha({
  noticia,
  rachaId,
  onApagar,
}: {
  noticia: Noticia
  rachaId: number | string
  onApagar?: () => void
}) {
  const visual = ICONES[noticia.tipo] ?? ICONES.aviso
  const link = destino(noticia, rachaId)
  const quando = formatDistanceToNowStrict(new Date(noticia.created_at), { locale: ptBR, addSuffix: true })
  const conteudo = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${visual.cor}`}>{visual.icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{noticia.titulo}</span>
        {noticia.texto && <span className="mt-0.5 block text-xs leading-5 text-gray-400">{noticia.texto}</span>}
        <span className="mt-1 block text-[11px] font-semibold text-gray-500">
          {noticia.autor ? `${noticia.autor} · ` : ''}
          {quando}
        </span>
      </span>
    </>
  )

  return (
    <div className="flex items-start gap-2 px-4 py-3">
      {link ? (
        <Link to={link} className="flex min-w-0 flex-1 items-start gap-3">
          {conteudo}
          <ChevronRight size={16} className="mt-3 shrink-0 text-gray-600" />
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{conteudo}</div>
      )}
      {onApagar && (
        <button type="button" onClick={onApagar} aria-label="Apagar notícia" className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400">
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

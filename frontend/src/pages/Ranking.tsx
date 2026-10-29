import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Medal, SlidersHorizontal, Trophy } from 'lucide-react'
import Avatar from '../components/Avatar'
import { rachasApi, rankingApi } from '../services/api'
import { getEsporte, labelPosicao } from '../esportes'
import type { AtletaRanking, CategoriaRanking, Ranking as RankingDados } from '../types'

const CORES_PODIO = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

function nomeCurto(atleta: AtletaRanking) {
  if (atleta.apelido?.trim()) return atleta.apelido.trim()
  const partes = atleta.nome.trim().split(/\s+/)
  return partes.length > 2 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : atleta.nome
}

function formatar(valor: number | null | undefined, categoria: CategoriaRanking) {
  if (valor === null || valor === undefined) return '–'
  const numero = Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',')
  return categoria.sufixo === '%' ? `${numero}%` : numero
}

export default function Ranking() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [dados, setDados] = useState<RankingDados | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  const carregar = useCallback(async () => {
    if (!rachaId) return
    setCarregando(true)
    setErro(false)
    try {
      const [rankingRes, rachaRes] = await Promise.all([rankingApi.get(rachaId), rachasApi.get(rachaId)])
      setDados(rankingRes.data)
      setIsAdmin(Boolean(rachaRes.data.is_admin))
      setCategoriaId((atual) => atual || rankingRes.data.categorias[0]?.id || '')
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [rachaId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const categoria = dados?.categorias.find((c) => c.id === categoriaId) ?? dados?.categorias[0]

  // Maior valor primeiro; quem não tem valor (ex.: sem jogo encerrado) vai para o fim.
  const ordenados = useMemo(() => {
    if (!dados || !categoria) return []
    return [...dados.atletas].sort((a, b) => {
      const va = a.valores[categoria.id]
      const vb = b.valores[categoria.id]
      if (va === vb) return nomeCurto(a).localeCompare(nomeCurto(b))
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      return vb - va
    })
  }, [dados, categoria])

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (erro || !dados || !categoria) {
    return (
      <div className="card py-10 text-center">
        <p className="font-semibold text-white">Não foi possível carregar o ranking.</p>
        <button type="button" onClick={() => void carregar()} className="btn-secondary mt-4">
          Tentar de novo
        </button>
      </div>
    )
  }

  const esporte = getEsporte(dados.esporte)
  const comValor = ordenados.filter((a) => (a.valores[categoria.id] ?? 0) > 0)
  const podio = comValor.slice(0, 3)
  const resto = ordenados.filter((a) => !podio.includes(a))
  const valor = (a: AtletaRanking) => formatar(a.valores[categoria.id], categoria)
  const usaPartidasEncerradas = ['vitorias', 'aproveitamento', 'media', 'sets'].includes(categoria.id)

  return (
    <div className="space-y-5 pb-20">
      {/* O título "Ranking" já está no cabeçalho do app. */}
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-gray-400">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <esporte.Icone size={16} />
          </span>
          {esporte.nome} · {dados.jogos_encerrados} partida{dados.jogos_encerrados === 1 ? '' : 's'} encerrada{dados.jogos_encerrados === 1 ? '' : 's'}
        </p>
        {isAdmin && dados.esporte === 'futebol' && (
          <Link to="/artilharia" className="btn-secondary shrink-0 text-xs">
            <SlidersHorizontal size={14} /> Ajustar gols
          </Link>
        )}
      </div>

      {/* Uma linha que desliza até a borda da tela; o esmaecido na ponta indica que tem mais. */}
      <div className="relative -mx-4">
        <div className="sem-barra flex gap-2 overflow-x-auto scroll-px-4 px-4 pb-1" role="tablist">
          {dados.categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === categoria.id}
              onClick={(e) => {
                setCategoriaId(c.id)
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
              }}
              className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors ${
                c.id === categoria.id
                  ? 'border-emerald-500 bg-emerald-500 text-branco'
                  : 'border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-700 hover:text-white'
              }`}
            >
              {c.nome}
            </button>
          ))}
          <span className="w-2 shrink-0" aria-hidden="true" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-fundo to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-fundo to-transparent" />
      </div>

      {podio.length === 0 ? (
        <div className="card flex flex-col items-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
            <Trophy size={24} />
          </div>
          <p className="font-bold text-white">Ninguém pontuou em {categoria.nome.toLowerCase()} ainda</p>
          <p className="mt-1 max-w-xs text-sm text-gray-500">
            O ranking enche sozinho conforme as partidas ao vivo são jogadas e encerradas.
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-3 items-end gap-2">
          {/* Pódio na ordem 2º, 1º, 3º, com o primeiro mais alto no meio. */}
          {[podio[1], podio[0], podio[2]].map((atleta, indice) => {
            if (!atleta) return <div key={`vazio-${indice}`} />
            const posicao = podio.indexOf(atleta)
            return (
              <div
                key={atleta.atleta_id}
                className={`flex flex-col items-center rounded-[1.5rem] border border-gray-800 bg-gray-900/40 px-2 text-center ${
                  posicao === 0 ? 'pb-4 pt-5' : 'pb-3 pt-4'
                }`}
              >
                <Medal size={posicao === 0 ? 22 : 18} className={CORES_PODIO[posicao]} />
                <div className="relative mt-2">
                  <Avatar src={atleta.foto_url ?? undefined} name={atleta.apelido || atleta.nome} size={posicao === 0 ? 'lg' : 'md'} />
                  <span className="absolute -bottom-1 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-branco">
                    {posicao + 1}
                  </span>
                </div>
                <p className="mt-3 w-full truncate text-sm font-black text-white">{nomeCurto(atleta)}</p>
                <p className={`font-black tabular-nums text-white ${posicao === 0 ? 'text-2xl' : 'text-xl'}`}>{valor(atleta)}</p>
                {categoria.sufixo && categoria.sufixo !== '%' && (
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{categoria.sufixo}</p>
                )}
              </div>
            )
          })}
        </section>
      )}

      {resto.length > 0 && (
        <section className="card divide-y divide-gray-800 p-0">
          {resto.map((atleta) => {
            const posicao = ordenados.indexOf(atleta) + 1
            const temValor = (atleta.valores[categoria.id] ?? 0) > 0
            return (
              <div key={atleta.atleta_id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center text-sm font-black tabular-nums text-gray-500">{temValor ? posicao : '–'}</span>
                <Avatar src={atleta.foto_url ?? undefined} name={atleta.apelido || atleta.nome} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{nomeCurto(atleta)}</p>
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {labelPosicao(atleta.posicao) || '—'} · {atleta.jogos} jogo{atleta.jogos === 1 ? '' : 's'}
                  </p>
                </div>
                <span className={`text-base font-black tabular-nums ${temValor ? 'text-white' : 'text-gray-600'}`}>
                  {valor(atleta)}
                </span>
              </div>
            )
          })}
        </section>
      )}

      {usaPartidasEncerradas && (
        <p className="px-1 text-center text-xs text-gray-500">
          {categoria.nome} conta só as partidas ao vivo encerradas.
        </p>
      )}
    </div>
  )
}

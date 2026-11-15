import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, ChevronRight, Crown, SlidersHorizontal, Trophy } from 'lucide-react'
import Avatar from '../components/Avatar'
import { atletasApi, rachasApi, rankingApi } from '../services/api'
import { getEsporte, labelPosicao } from '../esportes'
import type { AtletaRanking, CategoriaRanking, Ranking as RankingDados } from '../types'

// Ouro, prata e bronze: cor do número, do aro da foto e altura do degrau.
const PODIO = [
  { cor: 'text-yellow-400', aro: 'ring-yellow-400', degrau: 'h-16', fundo: 'from-yellow-500/25' },
  { cor: 'text-gray-300', aro: 'ring-gray-300', degrau: 'h-11', fundo: 'from-gray-400/20' },
  { cor: 'text-amber-600', aro: 'ring-amber-600', degrau: 'h-8', fundo: 'from-amber-600/20' },
]

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
  // Atleta de quem está logado neste racha, para destacar a própria linha.
  const [meuAtletaId, setMeuAtletaId] = useState<number | null>(null)
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

  useEffect(() => {
    if (!rachaId) return
    // Admin que não joga não tem atleta no racha: aí ninguém é destacado.
    atletasApi.meu(rachaId).then(({ data }) => setMeuAtletaId(data.id)).catch(() => setMeuAtletaId(null))
  }, [rachaId])

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
  const maior = comValor.length > 0 ? (comValor[0].valores[categoria.id] ?? 0) : 0
  const eu = meuAtletaId ? ordenados.find((a) => a.atleta_id === meuAtletaId) : undefined
  const minhaPosicao = eu && comValor.includes(eu) ? comValor.indexOf(eu) + 1 : null
  const perfil = (a: AtletaRanking) => `/racha/${rachaId}/atleta/${a.atleta_id}`
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
              className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors ${
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

      {/* Onde eu estou nesta categoria, sem precisar procurar na lista. */}
      {eu && podio.length > 0 && (
        <Link
          to={perfil(eu)}
          className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
        >
          <Avatar src={eu.foto_url ?? undefined} name={eu.apelido || eu.nome} size="sm" />
          <p className="min-w-0 flex-1 text-sm text-gray-300">
            {minhaPosicao ? (
              <>
                Você está em <span className="font-black text-white">{minhaPosicao}º</span> em {categoria.nome.toLowerCase()}
              </>
            ) : (
              <>Você ainda não pontuou em {categoria.nome.toLowerCase()}</>
            )}
          </p>
          <span className="text-lg font-black tabular-nums text-white">{valor(eu)}</span>
        </Link>
      )}

      {podio.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
            <Trophy size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white">Ninguém pontuou em {categoria.nome.toLowerCase()} ainda</p>
            <p className="mt-0.5 text-sm text-gray-500">O ranking se preenche quando as partidas ao vivo são encerradas.</p>
            {isAdmin && (
              <Link
                to={`/racha/${rachaId}/jogos`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400"
              >
                <CalendarDays size={15} /> Ir para a agenda <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      ) : (
        <section className="grid grid-cols-3 items-end gap-2" aria-label="Pódio">
          {/* Pódio na ordem 2º, 1º, 3º, com o primeiro mais alto no meio. */}
          {[podio[1], podio[0], podio[2]].map((atleta, indice) => {
            if (!atleta) return <div key={`vazio-${indice}`} />
            const posicao = podio.indexOf(atleta)
            const visual = PODIO[posicao]
            return (
              <Link key={atleta.atleta_id} to={perfil(atleta)} className="flex min-w-0 flex-col items-center text-center">
                {posicao === 0 && <Crown size={20} className="mb-1 text-yellow-400" aria-hidden="true" />}
                <Avatar
                  src={atleta.foto_url ?? undefined}
                  name={atleta.apelido || atleta.nome}
                  size={posicao === 0 ? 'lg' : 'md'}
                  className={`ring-2 ring-offset-2 ring-offset-fundo ${visual.aro}`}
                />
                <p className="mt-2 w-full truncate text-sm font-bold text-white">
                  {nomeCurto(atleta)}
                  {atleta.atleta_id === meuAtletaId && <span className="font-medium text-emerald-400"> (você)</span>}
                </p>
                <p className={`font-black tabular-nums text-white ${posicao === 0 ? 'text-2xl' : 'text-xl'}`}>
                  {valor(atleta)}
                  {categoria.sufixo && categoria.sufixo !== '%' && (
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">{categoria.sufixo}</span>
                  )}
                </p>
                <div
                  className={`mt-2 flex w-full items-start justify-center rounded-t-2xl border-x border-t border-gray-800 bg-gradient-to-b to-transparent pt-1.5 ${visual.degrau} ${visual.fundo}`}
                >
                  <span className={`text-lg font-black ${visual.cor}`}>{posicao + 1}º</span>
                </div>
              </Link>
            )
          })}
        </section>
      )}

      {resto.length > 0 && (
        <section className="space-y-2">
          {podio.length === 0 && (
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              Elenco · {resto.length} atleta{resto.length === 1 ? '' : 's'}
            </h2>
          )}
          <div className="card divide-y divide-gray-800 p-0">
            {resto.map((atleta) => {
              const posicao = ordenados.indexOf(atleta) + 1
              const numero = atleta.valores[categoria.id] ?? 0
              const temValor = numero > 0
              const souEu = atleta.atleta_id === meuAtletaId
              return (
                <Link
                  key={atleta.atleta_id}
                  to={perfil(atleta)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-800/40 ${souEu ? 'bg-emerald-500/5' : ''}`}
                >
                  {/* Sem ninguém pontuando não há posição para mostrar: a coluna some. */}
                  {podio.length > 0 && (
                    <span className="w-6 text-center text-sm font-black tabular-nums text-gray-500">{temValor ? posicao : '–'}</span>
                  )}
                  <Avatar src={atleta.foto_url ?? undefined} name={atleta.apelido || atleta.nome} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {nomeCurto(atleta)}
                      {souEu && <span className="font-medium text-emerald-400"> (você)</span>}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {labelPosicao(atleta.posicao) || '—'} · {atleta.jogos} jogo{atleta.jogos === 1 ? '' : 's'}
                    </p>
                    {/* Barra proporcional ao líder: mostra a distância, não só a ordem. */}
                    {temValor && maior > 0 && (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-800" aria-hidden="true">
                        <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${Math.max(4, (numero / maior) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <span className={`text-base font-black tabular-nums ${temValor ? 'text-white' : 'text-gray-600'}`}>
                    {valor(atleta)}
                  </span>
                </Link>
              )
            })}
          </div>
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

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Layout as LayoutIcon,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Trophy,
  Users,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react'
import { rachasApi, jogosApi, rankingApi, resenhaApi, presencasApi } from '../services/api'
import ItemResenha from '../components/ItemResenha'
import { CONVITE_RACHA_KEY, SELECTED_RACHA_KEY } from '../services/convite'
import EscudoTime from '../components/EscudoTime'
import { parseDataJogo } from '../utils/dataJogo'
import { definirEsporteAtual, lerEsporteAtual } from '../utils/esporteEscolhido'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ESPORTES, esporteDaModalidade, getEsporte, getModalidade, temRecurso } from '../esportes'
import type { EsporteId } from '../esportes'
import { MASCOTE_ADMIN, mascoteDoAtleta } from '../esportes/mascotes'
import type { Jogo, Noticia, Racha, Saldo } from '../types'
import { differenceInCalendarDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type StatusPresenca = 'confirmado' | 'recusado' | 'pendente'

// A presença de quem está logado no próximo jogo; null quando a pessoa não está na lista.
interface MinhaPresenca {
  atletaId: number
  status: StatusPresenca
}

function tempoDecorrido(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
}

// "2º quarto" no basquete e "Sets · 3º set" no vôlei; o futebol não tem partes.
function nomePeriodoAoVivo(tipo: string, periodo: number) {
  const { placar } = esporteDaModalidade(tipo)
  if (placar.tipo === 'pontos') return `Sets · ${periodo}º set`
  if (!placar.periodo) return null
  if (periodo > placar.periodo.total) return 'Prorrogação'
  return `${periodo}º ${placar.periodo.nome}`
}

function maiuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// "Hoje", "Amanhã" ou o dia da semana quando o jogo é nos próximos dias; a data completa vai embaixo.
function rotuloDoJogo(data: Date) {
  const dias = differenceInCalendarDays(data, new Date())
  const hora = format(data, 'HH:mm')
  const dataCompleta = maiuscula(format(data, "EEEE, d 'de' MMMM", { locale: ptBR }))
  if (dias === 0) return { titulo: `Hoje, ${hora}`, detalhe: dataCompleta }
  if (dias === 1) return { titulo: `Amanhã, ${hora}`, detalhe: dataCompleta }
  if (dias > 1 && dias < 7) {
    return {
      titulo: `${maiuscula(format(data, 'EEEE', { locale: ptBR }))}, ${hora}`,
      detalhe: maiuscula(format(data, "d 'de' MMMM", { locale: ptBR })),
    }
  }
  return { titulo: `${format(data, "d 'de' MMM", { locale: ptBR })}, ${hora}`, detalhe: dataCompleta }
}

function saudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Classes completas para o Tailwind encontrar; a quantidade de cards muda com o esporte e o papel.
const GRID_COLS: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }

const FOCO = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70'

function TituloSecao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">{children}</h2>
      {acao}
    </div>
  )
}

function Esqueleto({ className }: { className: string }) {
  return <div aria-hidden className={`animate-pulse rounded-3xl bg-gray-800/60 ${className}`} />
}

export default function Home() {
  const [rachas, setRachas] = useState<Racha[]>([])
  // Esporte escolhido em /esporte; a tela mostra só os rachas dele.
  const [esporteAtual, setEsporteAtual] = useState<EsporteId | null>(() => lerEsporteAtual())
  // Quantos rachas a conta tem nos outros esportes, para o aviso da tela vazia.
  const [outrosEsportes, setOutrosEsportes] = useState<Partial<Record<EsporteId, number>>>({})
  const [loading, setLoading] = useState(true)
  // Falha ao buscar os rachas: sem isto, um erro de rede parecia "Nenhum racha ainda".
  const [erro, setErro] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  // Enquanto os dados do racha chegam aparecem esqueletos, e não "Sem jogo" ou "R$ 0,00" por engano.
  const [carregandoRacha, setCarregandoRacha] = useState(true)
  const [nextGame, setNextGame] = useState<Jogo | null>(null)
  // Partida ao vivo do racha: quando existe, aparece no lugar do próximo jogo.
  const [liveGame, setLiveGame] = useState<Jogo | null>(null)
  const [minhaPresenca, setMinhaPresenca] = useState<MinhaPresenca | null>(null)
  const [salvandoPresenca, setSalvandoPresenca] = useState(false)
  // Líder da categoria principal do ranking (gols, pontos...), para o card do resumo.
  const [lider, setLider] = useState<{ nome: string; valor: string; categoria: string } | null>(null)
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  // As 3 últimas da Resenha; a lista completa fica na tela da Resenha.
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const loadRachas = useCallback(async () => {
    setLoading(true)
    setErro(false)
    try {
      const response = await rachasApi.listTodos()
      const todos = response.data || []
      const savedRachaId = localStorage.getItem(SELECTED_RACHA_KEY)

      // Acabou de entrar por convite: o app passa para o esporte desse racha (uma vez só).
      let esporte = lerEsporteAtual()
      const conviteId = localStorage.getItem(CONVITE_RACHA_KEY)
      if (conviteId) {
        localStorage.removeItem(CONVITE_RACHA_KEY)
        const convidado = todos.find((racha) => String(racha.id) === conviteId)
        if (convidado && convidado.esporte !== esporte) {
          esporte = convidado.esporte
          definirEsporteAtual(esporte)
        }
      }
      setEsporteAtual(esporte)

      const list = esporte ? todos.filter((racha) => racha.esporte === esporte) : todos
      const outros: Partial<Record<EsporteId, number>> = {}
      todos.forEach((racha) => {
        if (racha.esporte !== esporte) outros[racha.esporte] = (outros[racha.esporte] ?? 0) + 1
      })
      setOutrosEsportes(outros)

      const savedIndex = savedRachaId
        ? list.findIndex((racha) => String(racha.id) === savedRachaId)
        : -1

      setRachas(list)
      setSelectedIndex(savedIndex >= 0 ? savedIndex : 0)
    } catch (error) {
      console.error('Erro ao carregar clubes:', error)
      setErro(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRachas()
  }, [loadRachas])

  const currentRacha = rachas[selectedIndex]
  const rachaId = currentRacha?.id
  const userId = user?.id

  useEffect(() => {
    if (!rachaId) return
    // Trocar de racha no meio da busca não pode deixar os dados do anterior na tela.
    let cancelado = false
    setCarregandoRacha(true)
    setNextGame(null)
    setLiveGame(null)
    setMinhaPresenca(null)
    setSaldo(null)
    setLider(null)
    setNoticias([])

    const jogos = jogosApi
      .list(rachaId, true)
      .then(({ data }) => {
        if (cancelado) return
        const lista = data || []
        setLiveGame(lista.find((jogo) => jogo.iniciado_em && !jogo.finalizado) || null)
        setNextGame(lista.find((jogo) => !jogo.iniciado_em) || null)
      })
      .catch((e) => console.error(e))

    const caixa = rachasApi
      .getSaldo(rachaId)
      .then(({ data }) => !cancelado && setSaldo(data || null))
      .catch(() => undefined)

    const ranking = rankingApi
      .get(rachaId)
      .then(({ data }) => {
        if (cancelado) return
        const principal = data.categorias[0]
        const melhor = [...data.atletas].sort((a, b) => (b.valores[principal.id] ?? 0) - (a.valores[principal.id] ?? 0))[0]
        const valor = melhor?.valores[principal.id] ?? 0
        setLider(
          melhor && valor > 0
            ? { nome: melhor.apelido || melhor.nome.split(' ')[0], valor: `${valor} ${principal.nome.toLowerCase()}`, categoria: principal.nome }
            : { nome: '', valor: '', categoria: principal.nome },
        )
      })
      .catch(() => undefined)

    resenhaApi
      .listar(rachaId, 3)
      .then(({ data }) => !cancelado && setNoticias(data))
      .catch(() => undefined)

    Promise.all([jogos, caixa, ranking]).then(() => !cancelado && setCarregandoRacha(false))

    return () => {
      cancelado = true
    }
  }, [rachaId])

  // Minha presença no próximo jogo, para confirmar direto da tela inicial.
  const nextGameId = nextGame?.id
  const carregarPresenca = useCallback(async () => {
    if (!nextGameId || !userId) return
    try {
      const { data } = await jogosApi.getLista(nextGameId)
      const achar = (itens: Array<{ atleta_id: number; user_id?: number | null }>) =>
        itens.find((item) => item.user_id === userId)
      const confirmado = achar(data.confirmados)
      const recusado = achar(data.recusados)
      const pendente = achar(data.pendentes)
      const eu = confirmado ?? recusado ?? pendente
      setMinhaPresenca(
        eu ? { atletaId: eu.atleta_id, status: confirmado ? 'confirmado' : recusado ? 'recusado' : 'pendente' } : null,
      )
      setNextGame((jogo) => (jogo && jogo.id === nextGameId ? { ...jogo, total_confirmados: data.confirmados.length } : jogo))
    } catch {
      setMinhaPresenca(null)
    }
  }, [nextGameId, userId])

  useEffect(() => {
    setMinhaPresenca(null)
    carregarPresenca()
  }, [carregarPresenca])

  async function responderPresenca(vou: boolean) {
    if (!nextGame || !minhaPresenca || salvandoPresenca) return
    setSalvandoPresenca(true)
    try {
      if (vou) await presencasApi.confirmar(nextGame.id, minhaPresenca.atletaId)
      else await presencasApi.recusar(nextGame.id, minhaPresenca.atletaId)
      await carregarPresenca()
      toast(vou ? 'Presença confirmada!' : 'Ausência registrada.', 'success')
    } catch {
      toast('Não foi possível salvar sua presença. Tente novamente.', 'error')
    } finally {
      setSalvandoPresenca(false)
    }
  }

  // Relógio da partida ao vivo no card da tela inicial.
  const [agora, setAgora] = useState(Date.now())
  useEffect(() => {
    if (!liveGame) return
    const relogio = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(relogio)
  }, [liveGame?.id])

  // Com partida ao vivo, o placar da tela inicial se atualiza sozinho.
  useEffect(() => {
    if (!liveGame) return
    const intervalo = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await jogosApi.get(liveGame.id)
        setLiveGame(res.data.finalizado ? null : res.data)
      } catch {
        // mantém o último placar
      }
    }, 15000)
    return () => window.clearInterval(intervalo)
  }, [liveGame?.id])

  function handleSelectRacha(event: React.ChangeEvent<HTMLSelectElement>) {
    const novoId = event.target.value
    const nextIndex = rachas.findIndex((racha) => String(racha.id) === novoId)
    if (nextIndex < 0) return

    localStorage.setItem(SELECTED_RACHA_KEY, novoId)
    setSelectedIndex(nextIndex)
  }

  // Com um racha aberto vale o papel nele: a mesma conta pode ser admin de um e atleta de outro.
  const isAdmin = currentRacha ? Boolean(currentRacha.is_admin) : user?.role === 'admin'
  const nextGameDate = nextGame ? parseDataJogo(nextGame.data_hora) : null
  const rotulo = nextGameDate ? rotuloDoJogo(nextGameDate) : null
  const periodoAoVivo = liveGame && currentRacha ? nomePeriodoAoVivo(currentRacha.tipo, liveGame.periodo ?? 1) : null
  const primeiroNome = user?.nome?.trim().split(/\s+/)[0]

  const summaryCards = currentRacha ? [
    {
      label: 'Atletas',
      value: String(currentRacha.total_atletas || 0),
      hint: 'Ver elenco',
      icon: <Users size={18} />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      path: `/racha/${currentRacha.id}/atletas`,
      visivel: true,
    },
    {
      label: 'Ranking',
      value: lider?.nome || '—',
      hint: lider?.valor || (lider?.nome === '' ? 'Sem líder ainda' : 'Ver ranking'),
      icon: <Trophy size={18} />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      path: `/racha/${currentRacha.id}/ranking`,
      visivel: true,
    },
    {
      // Só o admin vê o caixa; antes o atleta via um card desabilitado escrito "Admin".
      label: 'A receber',
      value: saldo?.pendente_formatado || 'R$ 0,00',
      hint: 'Abrir caixa',
      icon: <Wallet size={18} />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      path: `/racha/${currentRacha.id}/financeiro`,
      visivel: isAdmin,
    },
  ].filter((card) => card.visivel) : []

  const quickActions = currentRacha ? [
    {
      label: 'Novo jogo',
      icon: <CalendarPlus size={22} />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      path: `/racha/${currentRacha.id}/novo-jogo`,
      visivel: isAdmin,
    },
    {
      label: 'Agenda',
      icon: <Calendar size={22} />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      path: `/racha/${currentRacha.id}/jogos`,
      visivel: true,
    },
    {
      label: 'Times',
      icon: <Layers size={22} />,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      path: `/racha/${currentRacha.id}/times`,
      visivel: true,
    },
    {
      label: 'Escalação',
      icon: <LayoutIcon size={22} />,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      path: `/racha/${currentRacha.id}/escalacao`,
      visivel: temRecurso(currentRacha.tipo, 'escalacao'),
    },
  ].filter((acao) => acao.visivel) : []
  const EsporteIcone = currentRacha ? esporteDaModalidade(currentRacha.tipo).Icone : null

  const EsporteAtualIcone = esporteAtual ? getEsporte(esporteAtual).Icone : null
  // Tela vazia: admin vê o mascote de crachá; atleta, o do esporte em que está.
  const mascoteVazio = isAdmin ? MASCOTE_ADMIN : mascoteDoAtleta(esporteAtual)

  function trocarEsporte(id: EsporteId) {
    definirEsporteAtual(id)
    void loadRachas()
  }

  const seletorEsporte = (
    <div className="flex shrink-0 justify-end">
      {/* Recebe o painel da página /esporte na transição (mesmo view-transition-name). */}
      <Link
        to="/esporte"
        style={{ viewTransitionName: 'esporte-cartao' }}
        className={`inline-flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-900/40 py-1.5 pl-3 pr-2 text-xs font-bold text-gray-300 transition-colors hover:border-emerald-500/40 ${FOCO}`}
      >
        {EsporteAtualIcone && <EsporteAtualIcone size={14} className="text-emerald-400" />}
        <span style={{ viewTransitionName: 'esporte-nome' }}>{esporteAtual ? getEsporte(esporteAtual).nome : 'Todos os esportes'}</span>
        <span className="text-gray-500">· trocar</span>
        <ChevronRight size={14} className="text-gray-500" />
      </Link>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Carregando">
        <Esqueleto className="h-20" />
        <Esqueleto className="h-52" />
        <Esqueleto className="h-28" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-800/50">
          <WifiOff size={36} className="text-gray-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Não deu para carregar</h2>
        <p className="mb-6 max-w-xs text-sm text-gray-500">Verifique sua conexão e tente de novo.</p>
        <button
          type="button"
          onClick={loadRachas}
          className={`flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-branco transition-colors hover:bg-emerald-700 ${FOCO}`}
        >
          <RefreshCw size={18} />
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Esporte em que o app está; tocar leva à página de troca. Com racha, fica na linha da saudação. */}
      {!currentRacha && seletorEsporte}

      {/* Estado vazio: nenhum racha neste esporte */}
      {rachas.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-12">
          {/* Clube vazio: o mascote recebe a pessoa no lugar de um ícone apagado. */}
          <img
            src={mascoteVazio.src}
            alt=""
            width={mascoteVazio.largura}
            height={mascoteVazio.altura}
            className={`mascote-flutuar mb-4 h-40 w-auto ${mascoteVazio.busto ? 'mascote-busto' : ''}`}
          />
          <h2 className="mb-2 text-center text-xl font-bold text-white">
            {esporteAtual ? `Nenhum clube de ${getEsporte(esporteAtual).nome.toLowerCase()} ainda` : 'Nenhum clube ainda'}
          </h2>
          <p className="mb-6 max-w-xs text-center text-sm text-gray-500">
            {isAdmin
              ? 'Crie o clube para começar a organizar jogos e atletas.'
              : 'Peça o link de convite ao organizador do clube.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/novo')}
              className={`flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-branco transition-colors hover:bg-emerald-700 ${FOCO}`}
            >
              <Plus size={20} />
              {esporteAtual ? `Criar clube de ${getEsporte(esporteAtual).nome.toLowerCase()}` : 'Criar primeiro clube'}
            </button>
          )}

          {/* Tem racha em outro esporte: um toque leva até ele. */}
          {Object.keys(outrosEsportes).length > 0 && (
            <div className="mt-8 w-full max-w-xs space-y-2">
              <p className="text-center text-xs font-bold uppercase tracking-wider text-gray-500">Seus clubes em outros esportes</p>
              {ESPORTES.filter((e) => outrosEsportes[e.id]).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => trocarEsporte(e.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/40 px-4 py-3 text-left transition-colors hover:border-gray-700 ${FOCO}`}
                >
                  <e.Icone size={20} className="text-emerald-400" />
                  <span className="flex-1 text-sm font-bold text-white">{e.nome}</span>
                  <span className="text-xs text-gray-500">
                    {outrosEsportes[e.id]} clube{outrosEsportes[e.id] === 1 ? '' : 's'}
                  </span>
                  <ChevronRight size={16} className="text-gray-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {currentRacha && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate px-1 text-sm text-gray-400">
                {primeiroNome && (
                  <>
                    {saudacao()}, <span className="font-semibold text-white">{primeiroNome}</span>
                  </>
                )}
              </p>
              {seletorEsporte}
            </div>

            <div className={`relative rounded-3xl border border-gray-800 bg-gray-900/40 p-4 transition-colors ${rachas.length > 1 ? 'hover:border-emerald-500/40 focus-within:border-emerald-500/60' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                  {EsporteIcone && <EsporteIcone className="h-6 w-6 text-emerald-300" />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-bold text-white">{currentRacha.nome}</p>
                  <p className="truncate text-xs font-medium text-gray-400">
                    {esporteDaModalidade(currentRacha.tipo).nome} · {getModalidade(currentRacha.tipo).nome}
                  </p>
                </div>

                {rachas.length > 1 && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-gray-300">
                    <ChevronDown size={18} />
                  </span>
                )}
              </div>

              {rachas.length > 1 && (
                <select
                  aria-label="Trocar de clube"
                  value={String(currentRacha.id)}
                  onChange={handleSelectRacha}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                >
                  {rachas.map((racha) => (
                    <option key={racha.id} value={String(racha.id)}>
                      {racha.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {carregandoRacha ? (
            <Esqueleto className="h-52" />
          ) : liveGame ? (
            <button
              type="button"
              onClick={() => navigate(`/racha/${currentRacha.id}/jogo/${liveGame.id}/partida`)}
              className={`tema-escuro w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-900 via-slate-900 to-emerald-800 px-5 py-5 text-center shadow-lg shadow-black/10 ${FOCO}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Ao vivo
                </span>
                <span className="text-sm font-bold tabular-nums text-white/80">
                  {liveGame.iniciado_em ? tempoDecorrido(agora - Date.parse(liveGame.iniciado_em)) : ''}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <EscudoTime nome={liveGame.time_a_nome || 'Time A'} cor="emerald" />
                <div className="px-1">
                  <p className="text-5xl font-black leading-none tabular-nums text-white">
                    {liveGame.placar_time_a ?? 0}
                    <span className="mx-2 align-middle text-2xl text-white/40">x</span>
                    {liveGame.placar_time_b ?? 0}
                  </p>
                  {periodoAoVivo && (
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-white/70">{periodoAoVivo}</p>
                  )}
                </div>
                <EscudoTime nome={liveGame.time_b_nome || 'Time B'} cor="sky" />
              </div>

              {/* O card inteiro abre a partida; o rodapé só indica a ação. */}
              <span className="-mx-5 -mb-5 mt-5 flex items-center justify-between gap-3 border-t border-white/10 bg-white/5 px-5 py-3.5">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                  <Radio size={16} className="text-emerald-300" />
                  {isAdmin ? 'Controlar partida' : 'Acompanhar lances'}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-slate-900">
                  <ChevronRight size={18} />
                </span>
              </span>
            </button>
          ) : nextGame && rotulo ? (
            <section
              aria-label="Próximo jogo"
              className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-500/10 shadow-lg shadow-black/10"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.20),transparent_35%)]" />

              {/* O topo abre o jogo (antes abria a agenda inteira). */}
              <Link
                to={`/racha/${currentRacha.id}/jogo/${nextGame.id}`}
                className={`relative block space-y-3 rounded-t-3xl p-5 ${FOCO}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <Calendar size={14} />
                    Próximo jogo
                  </span>
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-gray-400">
                    Detalhes <ChevronRight size={14} />
                  </span>
                </div>

                <div>
                  <p className="text-3xl font-black leading-tight text-white">{rotulo.titulo}</p>
                  <p className="mt-1 text-sm text-gray-400">{rotulo.detalhe}</p>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-300">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <MapPin size={16} className="shrink-0 text-gray-500" />
                    <span className="truncate">{nextGame.local || 'Local a definir'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={16} className="shrink-0 text-gray-500" />
                    <span>
                      <span className="font-bold text-emerald-400">{nextGame.total_confirmados || 0}</span>{' '}
                      {nextGame.total_confirmados === 1 ? 'confirmado' : 'confirmados'}
                    </span>
                  </span>
                </div>
              </Link>

              {/* Confirmar presença sem sair da tela inicial: é o que o atleta mais faz no app. */}
              {minhaPresenca && (
                <div className="relative border-t border-gray-800 bg-gray-900/40 p-4">
                  <p className="mb-3 text-sm font-semibold text-white" aria-live="polite">
                    {minhaPresenca.status === 'confirmado'
                      ? 'Você está confirmado'
                      : minhaPresenca.status === 'recusado'
                        ? 'Você avisou que não vai'
                        : 'Você vai jogar?'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={salvandoPresenca}
                      aria-pressed={minhaPresenca.status === 'confirmado'}
                      onClick={() => responderPresenca(true)}
                      className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-colors disabled:opacity-60 ${FOCO} ${
                        minhaPresenca.status === 'confirmado'
                          ? 'bg-emerald-500 text-branco'
                          : 'border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      <Check size={18} />
                      Vou
                    </button>
                    <button
                      type="button"
                      disabled={salvandoPresenca}
                      aria-pressed={minhaPresenca.status === 'recusado'}
                      onClick={() => responderPresenca(false)}
                      className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-colors disabled:opacity-60 ${FOCO} ${
                        minhaPresenca.status === 'recusado'
                          ? 'bg-red-500 text-branco'
                          : 'border border-gray-700 text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <X size={18} />
                      Não vou
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-3xl border border-dashed border-gray-700 bg-gray-900/40 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-800 text-gray-400">
                <Calendar size={22} />
              </div>
              <p className="text-lg font-bold text-white">Nenhum jogo marcado</p>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin ? 'Marque o próximo jogo para a galera confirmar presença.' : 'Quando o organizador marcar, o jogo aparece aqui.'}
              </p>
              <button
                type="button"
                onClick={() => navigate(isAdmin ? `/racha/${currentRacha.id}/novo-jogo` : `/racha/${currentRacha.id}/jogos`)}
                className={`mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold transition-colors ${FOCO} ${
                  isAdmin ? 'bg-emerald-600 text-branco hover:bg-emerald-700' : 'border border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                {isAdmin ? <><Plus size={18} /> Marcar jogo</> : 'Ver jogos anteriores'}
              </button>
            </section>
          )}

          <section className="space-y-3">
            <TituloSecao>Resumo</TituloSecao>
            {carregandoRacha ? (
              <Esqueleto className="h-28" />
            ) : (
              <div className={`grid gap-3 ${GRID_COLS[summaryCards.length]}`}>
                {summaryCards.map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => navigate(card.path)}
                    className={`min-w-0 rounded-3xl border border-gray-800 bg-gray-900/40 p-3 text-left transition-colors hover:border-gray-700 active:scale-[0.98] ${FOCO}`}
                  >
                    <span className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
                      {card.icon}
                    </span>
                    <p className="truncate text-xs font-semibold text-gray-400">{card.label}</p>
                    <p className="mt-0.5 truncate text-base font-bold text-white">{card.value}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{card.hint}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <TituloSecao>Atalhos</TituloSecao>
            <div className={`grid gap-3 ${GRID_COLS[quickActions.length]}`}>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className={`flex flex-col items-center gap-2 rounded-3xl border border-gray-800 bg-gray-900/40 px-2 pb-3 pt-4 text-center transition-all hover:border-gray-700 active:scale-[0.98] ${FOCO}`}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.bg} ${action.color}`}>
                    {action.icon}
                  </span>
                  <span className="text-xs font-semibold leading-tight text-gray-200">{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <TituloSecao
              acao={
                <Link
                  to={`/racha/${currentRacha.id}/resenha`}
                  className={`inline-flex items-center gap-0.5 rounded-lg text-xs font-bold text-emerald-400 ${FOCO}`}
                >
                  Ver tudo <ChevronRight size={14} />
                </Link>
              }
            >
              Resenha
            </TituloSecao>
            {noticias.length > 0 ? (
              <div className="divide-y divide-gray-800 rounded-3xl border border-gray-800 bg-gray-900/40">
                {noticias.map((n) => (
                  <ItemResenha key={n.id} noticia={n} rachaId={currentRacha.id} />
                ))}
              </div>
            ) : (
              <p className="rounded-3xl border border-dashed border-gray-800 px-4 py-5 text-center text-sm text-gray-500">
                Resultados, destaques e novidades do clube aparecem aqui.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

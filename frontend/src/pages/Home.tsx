import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  AlertCircle,
  Layers,
  Layout as LayoutIcon,
  Users,
  Plus,
  Trophy,
  ChevronRight,
  MapPin,
  ChevronDown,
  Radio,
} from 'lucide-react'
import { rachasApi, jogosApi } from '../services/api'
import { SELECTED_RACHA_KEY } from '../services/convite'
import EscudoTime from '../components/EscudoTime'
import { parseDataJogo } from '../utils/dataJogo'
import { useAuth } from '../context/AuthContext'
import { esporteDaModalidade, getModalidade, temRecurso } from '../esportes'
import type { Jogo, Racha, Saldo } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

// Classes completas para o Tailwind encontrar; a quantidade de cards muda com o esporte.
const GRID_COLS: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }

export default function Home() {
  const [rachas, setRachas] = useState<Racha[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [nextGame, setNextGame] = useState<Jogo | null>(null)
  // Partida ao vivo do racha: quando existe, aparece no lugar do próximo jogo.
  const [liveGame, setLiveGame] = useState<Jogo | null>(null)
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadRachas()
  }, [])

  useEffect(() => {
    async function loadExtras() {
      const current = rachas[selectedIndex]
      if (!current) return
      try {
        const [jogosRes, saldoRes] = await Promise.all([
          jogosApi.list(current.id, true),
          rachasApi.getSaldo(current.id)
        ])
        const lista = jogosRes.data || []
        setLiveGame(lista.find((jogo) => jogo.iniciado_em && !jogo.finalizado) || null)
        setNextGame(lista.find((jogo) => !jogo.iniciado_em) || null)
        setSaldo(saldoRes.data || null)
      } catch (e) {
        console.error(e)
        setLiveGame(null)
        setNextGame(null)
        setSaldo(null)
      }
    }
    loadExtras()
  }, [rachas, selectedIndex])

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



  async function loadRachas() {
    try {
      const response = await rachasApi.list()
      const list = response.data || []
      const savedRachaId = localStorage.getItem(SELECTED_RACHA_KEY)
      const savedIndex = savedRachaId
        ? list.findIndex((racha) => String(racha.id) === savedRachaId)
        : -1

      setRachas(list)
      setSelectedIndex(savedIndex >= 0 ? savedIndex : 0)
    } catch (error) {
      console.error('Erro ao carregar rachas:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectRacha(event: React.ChangeEvent<HTMLSelectElement>) {
    const rachaId = event.target.value
    const nextIndex = rachas.findIndex((racha) => String(racha.id) === rachaId)
    if (nextIndex < 0) return

    localStorage.setItem(SELECTED_RACHA_KEY, rachaId)
    setSelectedIndex(nextIndex)
  }

  const currentRacha = rachas[selectedIndex]
  // Com um racha aberto vale o papel nele: a mesma conta pode ser admin de um e atleta de outro.
  const isAdmin = currentRacha ? Boolean(currentRacha.is_admin) : user?.role === 'admin'
  const nextGameDate = nextGame ? parseDataJogo(nextGame.data_hora) : null
  const periodoAoVivo = liveGame && currentRacha ? nomePeriodoAoVivo(currentRacha.tipo, liveGame.periodo ?? 1) : null
  const summaryCards = currentRacha ? [
    {
      label: 'Atletas',
      value: currentRacha.total_atletas || 0,
      hint: 'Ver lista',
      icon: <Users size={20} />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      path: `/racha/${currentRacha.id}/atletas`,
      disabled: false,
    },
    {
      label: 'Caixa',
      value: saldo?.pendente_formatado || 'R$ 0,00',
      hint: isAdmin ? 'Ver detalhes' : 'Admin',
      icon: <AlertCircle size={20} />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      path: `/racha/${currentRacha.id}/financeiro`,
      disabled: !isAdmin,
    },
    {
      label: 'Ranking',
      value: 'Ver',
      hint: 'Gols e assist.',
      icon: <Trophy size={20} />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      path: '/artilharia',
      disabled: false,
      recurso: 'artilharia' as const,
    },
  ].filter((card) => !card.recurso || temRecurso(currentRacha.tipo, card.recurso)) : []
  const quickActions = currentRacha ? [
    {
      label: isAdmin ? 'Novo jogo' : 'Jogos',
      icon: <Calendar size={24} />,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      path: isAdmin ? `/racha/${currentRacha.id}/novo-jogo` : `/racha/${currentRacha.id}/jogos`,
    },
    {
      label: isAdmin ? 'Adicionar atleta' : 'Atletas',
      icon: <Users size={24} />,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      path: `/racha/${currentRacha.id}/atletas`,
    },
    {
      label: 'Escalação',
      icon: <LayoutIcon size={24} />,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      path: `/racha/${currentRacha.id}/escalacao`,
      recurso: 'escalacao' as const,
    },
    {
      label: 'Times',
      icon: <Layers size={24} />,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      path: `/racha/${currentRacha.id}/times`,
    },
  ].filter((acao) => !acao.recurso || temRecurso(currentRacha.tipo, acao.recurso)) : []
  const EsporteIcone = currentRacha ? esporteDaModalidade(currentRacha.tipo).Icone : null

  if (loading) {
    return (
      <div className="min-h-screen bg-fundo flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      {/* Estado vazio - Nenhum racha */}
      {rachas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
            <Users size={40} className="text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nenhum racha ainda</h3>
          <p className="text-gray-500 text-sm text-center mb-6 max-w-xs">
            {isAdmin
              ? 'Crie seu primeiro racha para começar a organizar seus jogos e atletas.'
              : 'Você ainda não participa de nenhum racha. Peça para um admin te adicionar.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => navigate('/novo')}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-branco font-semibold rounded-2xl transition-colors"
            >
              <Plus size={20} />
              Criar Primeiro Racha
            </button>
          )}
        </div>
      )}

      {currentRacha && (
        <div className="space-y-6">
          <div className={`relative rounded-[2rem] border border-gray-800 bg-gray-900/40 p-4 transition-colors ${rachas.length > 1 ? 'cursor-pointer hover:border-emerald-500/40' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 shadow-inner shadow-emerald-950/30">
                {EsporteIcone && <EsporteIcone className="h-6 w-6 text-emerald-300" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-black tracking-[0.22em] text-emerald-400">
                  {esporteDaModalidade(currentRacha.tipo).nome} · {getModalidade(currentRacha.tipo).nome}
                </p>
                <p className="text-xl font-black text-white truncate">
                  {currentRacha.nome}
                </p>
              </div>

              {rachas.length > 1 && (
                <ChevronDown size={24} className="shrink-0 text-gray-400" />
              )}
            </div>

            {rachas.length > 1 && (
              <select
                aria-label="Selecionar racha"
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

          {liveGame ? (
            <button
              type="button"
              onClick={() => navigate(`/racha/${currentRacha.id}/jogo/${liveGame.id}/partida`)}
              className="tema-escuro w-full overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-sky-900 via-slate-900 to-emerald-800 px-5 py-5 text-center shadow-lg shadow-black/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Ao vivo
                </span>
                <span className="text-sm font-black tabular-nums text-white/80">
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
                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/70">{periodoAoVivo}</p>
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
          ) : (
          <button
            type="button"
            onClick={() => navigate(`/racha/${currentRacha.id}/jogos`)}
            className="relative overflow-hidden w-full rounded-[2rem] border border-emerald-500/25 bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-500/10 p-5 text-left shadow-lg shadow-black/10"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.20),transparent_35%)]" />
            <div className="relative space-y-5">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-emerald-400" />
                <p className="text-[10px] uppercase font-black tracking-[0.22em] text-emerald-400">Próximo jogo</p>
              </div>

              <div className="space-y-2">
                <p className="text-3xl font-black text-white">
                  {nextGameDate
                    ? format(nextGameDate, "EEEE, HH:mm", { locale: ptBR })
                    : 'Sem jogo marcado'}
                </p>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin size={18} />
                  <span className="text-sm font-medium">{nextGame?.local || 'Local ainda não definido'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-400">
                  <span className="font-black text-emerald-400">{nextGame?.total_confirmados || 0}</span>{' '}
                  confirmados
                </div>
                <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-branco">
                  Ver agenda <ChevronRight size={18} />
                </span>
              </div>
            </div>
          </button>
          )}

          <div className="space-y-3">
            <p className="px-1 text-[10px] uppercase font-black text-gray-500 tracking-widest">Ações rápidas</p>
            <div className={`grid gap-3 ${GRID_COLS[quickActions.length]}`}>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="bg-gray-900/40 border border-gray-800 p-3 rounded-3xl flex flex-col items-center justify-center min-h-[112px] text-center gap-3 active:scale-[0.98] transition-all"
                >
                  <div className={`w-11 h-11 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center`}>
                    {action.icon}
                  </div>
                  <p className="text-xs font-bold text-gray-200 leading-tight">{action.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="px-1 text-[10px] uppercase font-black text-gray-500 tracking-widest">Resumo do racha</p>
            <div className={`grid gap-3 ${GRID_COLS[summaryCards.length]}`}>
              {summaryCards.map((card) => (
                <button
                  key={card.label}
                  type="button"
                  disabled={card.disabled}
                  onClick={() => navigate(card.path)}
                  className="rounded-3xl border border-gray-800 bg-gray-900/40 p-3 text-left min-h-[112px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className={`w-10 h-10 ${card.bg} ${card.color} rounded-2xl flex items-center justify-center mb-3`}>
                    {card.icon}
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-wider text-gray-500">{card.label}</p>
                  <p className="mt-1 text-lg font-black text-white truncate">{card.value}</p>
                  <p className="mt-2 text-xs text-gray-400 truncate">{card.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

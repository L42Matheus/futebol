import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  AlertCircle,
  Layout as LayoutIcon,
  Users,
  Plus,
  Trophy,
  ChevronRight,
  MapPin,
  ChevronDown,
} from 'lucide-react'
import { rachasApi, jogosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { TIPO_RACHA_LABELS } from '../constants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const SELECTED_RACHA_KEY = 'quemjogafc:selected_racha_id'

export default function Home() {
  const [rachas, setRachas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [nextGame, setNextGame] = useState(null)
  const [saldo, setSaldo] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

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
        setNextGame(jogosRes.data?.[0] || null)
        setSaldo(saldoRes.data || null)
      } catch (e) {
        console.error(e)
        setNextGame(null)
        setSaldo(null)
      }
    }
    loadExtras()
  }, [rachas, selectedIndex])


function parseDataJogo(dataHora) {
  const str = String(dataHora)
  const [datePart, timePart] = str.includes('T') ? str.split('T') : str.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = (timePart || '12:00').split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute, 0)
}

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

  function handleSelectRacha(event) {
    const rachaId = event.target.value
    const nextIndex = rachas.findIndex((racha) => String(racha.id) === rachaId)
    if (nextIndex < 0) return

    localStorage.setItem(SELECTED_RACHA_KEY, rachaId)
    setSelectedIndex(nextIndex)
  }

  const currentRacha = rachas[selectedIndex]
  const nextGameDate = nextGame ? parseDataJogo(nextGame.data_hora) : null
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
    },
  ] : []
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
    },
    {
      label: 'Ranking',
      icon: <Trophy size={24} />,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      path: '/artilharia',
    },
  ] : []

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
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
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition-colors"
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
                <span className="text-lg font-black text-emerald-300">7</span>
                <span className="absolute -top-1.5 text-[8px] font-black uppercase tracking-wider text-emerald-200/60">
                  QJ
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-black tracking-[0.22em] text-emerald-400">Racha ativo</p>
                <p className="text-xl font-black text-white truncate">
                  {currentRacha.nome}{' '}
                  <span className="text-gray-500">{TIPO_RACHA_LABELS[currentRacha.tipo] || currentRacha.tipo}</span>
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

          <button
            type="button"
            onClick={() => navigate(`/racha/${currentRacha.id}/jogos`)}
            className="relative overflow-hidden w-full rounded-[2rem] border border-emerald-500/25 bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/40 p-5 text-left shadow-lg shadow-black/10"
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
                <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white">
                  Ver agenda <ChevronRight size={18} />
                </span>
              </div>
            </div>
          </button>

          <div className="space-y-3">
            <p className="px-1 text-[10px] uppercase font-black text-gray-500 tracking-widest">Ações rápidas</p>
            <div className="grid grid-cols-4 gap-3">
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
            <div className="grid grid-cols-3 gap-3">
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

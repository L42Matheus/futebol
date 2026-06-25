import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  AlertCircle,
  Layout as LayoutIcon,
  Users,
  Trash2,
  Plus,
  Trophy,
  Layers,
} from 'lucide-react'
import { rachasApi, jogosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { TIPO_RACHA_LABELS } from '../constants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
      setRachas(response.data)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Erro ao carregar rachas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteRacha(e, id) {
    e.stopPropagation()
    if (!window.confirm('Deseja realmente excluir este racha? Esta ação não pode ser desfeita.')) return
    try {
      await rachasApi.delete(id)
      setRachas(prev => prev.filter(r => r.id !== id))
      if (selectedIndex >= rachas.length - 1) {
        setSelectedIndex(0)
      }
    } catch (error) {
      console.error('Erro ao excluir racha:', error)
      alert('Erro ao excluir racha.')
    }
  }

  const currentRacha = rachas[selectedIndex]
  const quickActions = currentRacha ? [
    {
      label: 'Jogos',
      subtitle: nextGame
        ? format(parseDataJogo(nextGame.data_hora), "EEE, HH:mm", { locale: ptBR })
        : 'Sem jogos',
      icon: <Calendar size={24} />,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      path: `/racha/${currentRacha.id}/jogos`,
      disabled: false,
    },
    {
      label: 'Atletas',
      subtitle: `${currentRacha.total_atletas || 0} membros`,
      icon: <Users size={24} />,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      path: `/racha/${currentRacha.id}/atletas`,
      disabled: false,
    },
    {
      label: 'Times',
      subtitle: 'Temporada',
      icon: <Layers size={24} />,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      path: `/racha/${currentRacha.id}/times`,
      disabled: false,
    },
    {
      label: 'Escalação',
      subtitle: TIPO_RACHA_LABELS[currentRacha.tipo] || currentRacha.tipo,
      icon: <LayoutIcon size={24} />,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      path: `/racha/${currentRacha.id}/escalacao`,
      disabled: false,
    },
    {
      label: 'Ranking',
      subtitle: 'Gols e assistências',
      icon: <Trophy size={24} />,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      path: '/artilharia',
      disabled: false,
    },
    {
      label: 'Caixa',
      subtitle: saldo?.pendente_formatado || 'R$ 0,00',
      icon: <AlertCircle size={24} />,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      path: `/racha/${currentRacha.id}/financeiro`,
      disabled: !isAdmin,
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
      <div className="space-y-3">
        <div className="px-1">
          <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Meus Rachas</p>
        </div>

        <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-2">
          {rachas.map((r, idx) => (
            <div key={r.id} className="relative flex-shrink-0 group">
              <button
                onClick={() => setSelectedIndex(idx)}
                className={`px-5 py-3 rounded-3xl border transition-all flex flex-col items-start justify-center min-w-[132px] min-h-[76px] ${
                  selectedIndex === idx
                    ? 'bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-900/20'
                    : 'bg-gray-900/50 border-gray-800 text-gray-400'
                }`}
              >
                <span className={`text-[10px] font-black uppercase tracking-wider ${selectedIndex === idx ? 'text-emerald-200' : 'text-gray-600'}`}>
                  {TIPO_RACHA_LABELS[r.tipo] || r.tipo}
                </span>
                <span className="text-lg font-black text-white whitespace-nowrap">{r.nome}</span>
              </button>
              {isAdmin && selectedIndex === idx && (
                <button
                  onClick={(e) => handleDeleteRacha(e, r.id)}
                  className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-red-500/90 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
                  title="Excluir Racha"
                >
                  <Trash2 size={13} strokeWidth={3} />
                </button>
              )}
            </div>
          ))}

          {isAdmin && (
            <button
              onClick={() => navigate('/novo')}
              className="flex-shrink-0 px-5 py-3 rounded-3xl border border-dashed border-gray-700 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center min-w-[92px] min-h-[76px] group"
            >
              <Plus size={22} className="text-gray-600 group-hover:text-emerald-500 transition-colors" />
              <span className="text-xs font-bold text-gray-600 group-hover:text-emerald-500 transition-colors mt-1">Novo</span>
            </button>
          )}
        </div>

        {currentRacha && (
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-gray-400 truncate">
              Gerenciando <span className="font-bold text-white">{currentRacha.nome}</span>
            </p>
            <div>
              <span className="rounded-full bg-gray-900/80 border border-gray-800 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                {currentRacha.total_atletas || 0} atletas
              </span>
            </div>
          </div>
        )}
      </div>

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
        <div className="space-y-3">
          <div className="px-1">
            <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Ações do Racha</p>
            <p className="text-sm text-gray-400">Acesse rapidamente as áreas principais.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={action.disabled}
                onClick={() => navigate(action.path)}
                className="bg-gray-900/40 border border-gray-800 p-4 rounded-[2rem] flex flex-col justify-between min-h-[145px] text-left group hover:border-emerald-500/50 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className={`w-12 h-12 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center`}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-xl font-black text-white truncate">{action.label}</p>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider truncate">
                    {action.subtitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, AlertCircle, Layout as LayoutIcon, Users, DollarSign, Layers, Trash2 } from 'lucide-react'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Meus Rachas */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest px-1">Meus Rachas</p>
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          {rachas.length === 0 && (
            <div className="text-gray-500 text-sm">Nenhum racha cadastrado</div>
          )}
          {rachas.map((r, idx) => (
            <div key={r.id} className="relative flex-shrink-0 group">
              <button
                onClick={() => setSelectedIndex(idx)}
                className={`px-6 py-4 rounded-3xl border-2 transition-all flex flex-col gap-1 min-w-[140px] ${
                  selectedIndex === idx
                    ? 'bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-900/20'
                    : 'bg-gray-900/50 border-gray-800 text-gray-400'
                }`}
              >
                <span className={`text-xs font-black uppercase tracking-wider ${selectedIndex === idx ? 'text-emerald-200' : 'text-gray-600'}`}>
                  {TIPO_RACHA_LABELS[r.tipo] || r.tipo}
                </span>
                <span className="text-lg font-bold text-white whitespace-nowrap">{r.nome}</span>
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => handleDeleteRacha(e, r.id)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500/90 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="Excluir Racha"
                >
                  <Trash2 size={12} strokeWidth={3} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {currentRacha && (
        <>
          {/* Tabs */}
          <ul className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { label: 'Jogos', path: `/racha/${currentRacha.id}/jogos` },
              { label: 'Atletas', path: `/racha/${currentRacha.id}/atletas` },
              { label: 'Times', path: `/racha/${currentRacha.id}/times` },
              { label: 'Escalação', path: `/racha/${currentRacha.id}/escalacao` },
              { label: 'Financeiro', path: `/racha/${currentRacha.id}/financeiro` },
            ].map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => navigate(item.path)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Tabs handle navigation; quick links removed */}

          {/* Middle grid */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate(`/racha/${currentRacha.id}/jogos`)}
              className="bg-gray-900/40 border border-gray-800 p-5 rounded-[2.5rem] flex flex-col justify-between aspect-square group hover:border-emerald-500/50 transition-all"
            >
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xl font-black text-white">
                  {nextGame ? format(new Date(nextGame.data_hora), "EEE, HH:mm", { locale: ptBR }) : 'Sem jogos'}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Calendario</p>
              </div>
            </button>

            <button
              onClick={() => isAdmin && navigate(`/racha/${currentRacha.id}/financeiro`)}
              className="bg-gray-900/40 border border-gray-800 p-5 rounded-[2.5rem] flex flex-col justify-between aspect-square group hover:border-emerald-500/50 transition-all"
            >
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-xl font-black text-white">{saldo?.pendente_formatado || 'R$ 0,00'}</p>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Pendentes</p>
              </div>
            </button>

            <button
              onClick={() => navigate(`/racha/${currentRacha.id}/escalacao`)}
              className="bg-gray-900/40 border border-gray-800 p-5 rounded-[2.5rem] flex flex-col justify-between aspect-square group hover:border-emerald-500/50 transition-all"
            >
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                <LayoutIcon size={24} />
              </div>
              <div>
                <p className="text-xl font-black text-white mb-1 uppercase tracking-tight">Escalacao</p>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  {TIPO_RACHA_LABELS[currentRacha.tipo] || currentRacha.tipo}
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate(`/racha/${currentRacha.id}/atletas`)}
              className="bg-gray-900/40 border border-gray-800 p-5 rounded-[2.5rem] flex flex-col justify-between aspect-square group hover:border-emerald-500/50 transition-all"
            >
              <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xl font-black text-white">{currentRacha.total_atletas}</p>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Membros</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, Calendar, DollarSign, ChevronRight, Layers, Link2, LayoutGrid } from 'lucide-react'
import { rachasApi, jogosApi, authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Racha, Jogo, Saldo } from '../types'

export default function RachaDetail() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [racha, setRacha] = useState<Racha | null>(null)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteLink, setInviteLink] = useState('')
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      const [rachaRes, jogosRes, saldoRes] = await Promise.all([
        rachasApi.get(rachaId),
        jogosApi.list(rachaId),
        rachasApi.getSaldo(rachaId),
      ])
      setRacha(rachaRes.data)
      setJogos(jogosRes.data)
      setSaldo(saldoRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [rachaId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleInvite() {
    if (!rachaId) return
    try {
      const res = await authApi.createInvite({ racha_id: parseInt(rachaId), role: 'atleta' })
      const base = window.location.origin
      setInviteLink(`${base}/register?invite=${res.data.token}`)
    } catch (error) {
      console.error('Erro ao gerar convite:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!racha) {
    return <div className="text-center py-12 text-gray-400">Racha não encontrado</div>
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Info principal */}
      <div className="card">
        <h1 className="text-2xl font-bold text-white">{racha.nome}</h1>
        <p className="text-gray-400 capitalize mt-1">
          {racha.tipo} — {racha.total_atletas}/{racha.max_atletas} atletas
        </p>
        {saldo && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-4">
            <p className="text-sm text-emerald-400">Saldo do Racha</p>
            <p className="text-2xl font-bold text-white">{saldo.saldo_formatado}</p>
            {saldo.pendente > 0 && (
              <p className="text-sm text-amber-400 mt-1">{saldo.pendente_formatado} pendente</p>
            )}
          </div>
        )}
      </div>

      {/* Navegação rápida */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link
          to={`/racha/${rachaId}/atletas`}
          className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
        >
          <Users className="text-emerald-500 mb-2" size={24} />
          <span className="text-sm font-medium text-white">Atletas</span>
          <span className="text-xs text-gray-500">{racha.total_atletas}</span>
        </Link>
        <Link
          to={`/racha/${rachaId}/jogos`}
          className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
        >
          <Calendar className="text-blue-400 mb-2" size={24} />
          <span className="text-sm font-medium text-white">Jogos</span>
          <span className="text-xs text-gray-500">{jogos.length}</span>
        </Link>
        {isAdmin && (
          <Link
            to={`/racha/${rachaId}/times`}
            className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
          >
            <Layers className="text-purple-400 mb-2" size={24} />
            <span className="text-sm font-medium text-white">Times</span>
          </Link>
        )}
        <Link
          to={`/racha/${rachaId}/escalacao`}
          className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
        >
          <LayoutGrid className="text-emerald-400 mb-2" size={24} />
          <span className="text-sm font-medium text-white">Escalação</span>
        </Link>
        {isAdmin && (
          <Link
            to={`/racha/${rachaId}/financeiro`}
            className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
          >
            <DollarSign className="text-amber-400 mb-2" size={24} />
            <span className="text-sm font-medium text-white">Caixa</span>
          </Link>
        )}
      </div>

      {/* Convite */}
      {isAdmin && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Convidar atleta</h3>
              <p className="text-sm text-gray-500">Gere um link para o atleta criar conta</p>
            </div>
            <button onClick={handleInvite} className="btn-secondary flex items-center gap-2">
              <Link2 size={16} /> Gerar link
            </button>
          </div>
          {inviteLink && (
            <input
              className="input"
              readOnly
              value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      )}

      {/* Próximos jogos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Próximos Jogos</h2>
          {isAdmin && (
            <Link to={`/racha/${rachaId}/novo-jogo`} className="btn-secondary">
              Novo Jogo
            </Link>
          )}
        </div>
        {jogos.length === 0 ? (
          <div className="card text-center py-8">
            <Calendar size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-gray-500">Nenhum jogo agendado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jogos.slice(0, 3).map((jogo) => (
              <Link
                key={jogo.id}
                to={`/racha/${rachaId}/jogo/${jogo.id}`}
                className="card flex items-center justify-between hover:border-gray-700 transition-colors"
              >
                <div>
                  <p className="font-medium text-white">
                    {format(new Date(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(jogo.data_hora), 'HH:mm')} —{' '}
                    {jogo.local ?? 'Local não definido'}
                  </p>
                  <p className="text-sm text-emerald-400 font-medium mt-1">
                    {jogo.total_confirmados} confirmados
                  </p>
                </div>
                <ChevronRight className="text-gray-600" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

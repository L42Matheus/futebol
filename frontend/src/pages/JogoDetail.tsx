import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, X, Clock, Trash2 } from 'lucide-react'
import { jogosApi, presencasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Jogo, JogoLista } from '../types'

export default function JogoDetail() {
  const { jogoId } = useParams<{ jogoId: string }>()
  const navigate = useNavigate()
  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [lista, setLista] = useState<JogoLista & {
    total_confirmados: number
    total_pendentes: number
    total_recusados: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const loadData = useCallback(async () => {
    if (!jogoId) return
    try {
      const [jogoRes, listaRes] = await Promise.all([
        jogosApi.get(jogoId),
        jogosApi.getLista(jogoId),
      ])
      setJogo(jogoRes.data)
      setLista(listaRes.data as typeof lista)
    } catch (error) {
      console.error('Erro ao carregar jogo:', error)
    } finally {
      setLoading(false)
    }
  }, [jogoId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleConfirmar(atletaId: number) {
    if (!jogoId) return
    await presencasApi.confirmar(jogoId, atletaId)
    loadData()
  }

  async function handleRecusar(atletaId: number) {
    if (!jogoId) return
    await presencasApi.recusar(jogoId, atletaId)
    loadData()
  }

  async function handleExcluirConfirm() {
    if (!jogoId || !jogo) return
    try {
      await jogosApi.cancel(jogoId)
      navigate(`/racha/${jogo.racha_id}/jogos`)
    } catch {
      toast('Erro ao excluir jogo. Tente novamente.', 'error')
    } finally {
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!jogo || !lista) {
    return <div className="text-center py-12 text-gray-400">Jogo não encontrado</div>
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">
            {format(new Date(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h1>
          <p className="text-gray-400">
            {format(new Date(jogo.data_hora), 'HH:mm')} —{' '}
            {jogo.local ?? 'Local não definido'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Excluir jogo"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-emerald-400">{lista.total_confirmados}</p>
          <p className="text-xs text-gray-500">Confirmados</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-amber-400">{lista.total_pendentes}</p>
          <p className="text-xs text-gray-500">Pendentes</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-red-400">{lista.total_recusados}</p>
          <p className="text-xs text-gray-500">Recusados</p>
        </div>
      </div>

      {/* Confirmados */}
      <div>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Check className="text-emerald-500" size={20} />
          Confirmados ({lista.confirmados.length})
        </h2>
        <div className="card divide-y divide-gray-800">
          {lista.confirmados.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum confirmado ainda</p>
          ) : (
            lista.confirmados.map((a) => (
              <div key={a.atleta_id} className="py-3 flex items-center justify-between">
                <p className="font-medium text-white">{a.nome}</p>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                  Confirmado
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pendentes */}
      <div>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="text-amber-400" size={20} />
          Pendentes ({lista.pendentes.length})
        </h2>
        <div className="card divide-y divide-gray-800">
          {lista.pendentes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Todos responderam</p>
          ) : (
            lista.pendentes.map((a) => (
              <div key={a.atleta_id} className="py-3 flex items-center justify-between">
                <p className="font-medium text-white">{a.nome}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmar(a.atleta_id)}
                    className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => handleRecusar(a.atleta_id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir jogo"
        description="Deseja realmente excluir este jogo?"
        confirmLabel="Excluir"
        danger
        onConfirm={handleExcluirConfirm}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

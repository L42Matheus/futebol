import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Calendar, Trash2 } from 'lucide-react'
import { jogosApi, rachasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Racha, Jogo } from '../types'

export default function Jogos() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [racha, setRacha] = useState<Racha | null>(null)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [apenasFuturos, setApenasFuturos] = useState(true)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      setLoading(true)
      const [rachaRes, jogosRes] = await Promise.all([
        rachasApi.get(rachaId),
        jogosApi.list(rachaId, apenasFuturos),
      ])
      setRacha(rachaRes.data)
      setJogos(jogosRes.data)
    } catch (error) {
      console.error('Erro ao carregar jogos:', error)
    } finally {
      setLoading(false)
    }
  }, [apenasFuturos, rachaId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleExcluirConfirm() {
    if (deleteId === null) return
    try {
      await jogosApi.cancel(deleteId)
      toast('Jogo excluído.', 'success')
      loadData()
    } catch {
      toast('Erro ao excluir jogo. Tente novamente.', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!racha) return <div className="text-center py-12 text-gray-400">Racha não encontrado</div>

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white">Agenda de Jogos</h1>
        <p className="text-gray-400">{racha.nome}</p>
      </div>

      <div className="card flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={apenasFuturos}
            onChange={(e) => setApenasFuturos(e.target.checked)}
          />
          Apenas futuros
        </label>
        {isAdmin ? (
          <Link to={`/racha/${rachaId}/novo-jogo`} className="btn-secondary">
            Novo Jogo
          </Link>
        ) : (
          <p className="text-xs text-gray-400">Somente administradores podem criar jogos.</p>
        )}
      </div>

      {jogos.length === 0 ? (
        <div className="card text-center py-10">
          <Calendar size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400">Nenhum jogo agendado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jogos.map((jogo) => (
            <div key={jogo.id} className="card flex items-center justify-between">
              <Link to={`/racha/${rachaId}/jogo/${jogo.id}`} className="flex-1">
                <p className="font-medium text-white">
                  {format(new Date(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-sm text-gray-400">
                  {format(new Date(jogo.data_hora), 'HH:mm')} —{' '}
                  {jogo.local ?? 'Local não definido'}
                </p>
                <p className="text-sm text-emerald-400 font-medium mt-1">
                  {jogo.total_confirmados} confirmados
                </p>
              </Link>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setDeleteId(jogo.id)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir jogo"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Excluir jogo"
        description="Deseja realmente excluir este jogo?"
        confirmLabel="Excluir"
        danger
        onConfirm={handleExcluirConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

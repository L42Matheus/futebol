import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, X, Clock, Trash2, Save, Trophy } from 'lucide-react'
import { jogosApi, presencasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Jogo, JogoLista } from '../types'

function parseGameDate(dataHora: string) {
  const dateStr = String(dataHora).substring(0, 10)
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

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
  const [savingScore, setSavingScore] = useState(false)
  const [scoreForm, setScoreForm] = useState({
    time_a_nome: 'Time A',
    time_b_nome: 'Time B',
    placar_time_a: '',
    placar_time_b: '',
  })
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
      setScoreForm({
        time_a_nome: jogoRes.data.time_a_nome || 'Time A',
        time_b_nome: jogoRes.data.time_b_nome || 'Time B',
        placar_time_a:
          jogoRes.data.placar_time_a === null || jogoRes.data.placar_time_a === undefined
            ? ''
            : String(jogoRes.data.placar_time_a),
        placar_time_b:
          jogoRes.data.placar_time_b === null || jogoRes.data.placar_time_b === undefined
            ? ''
            : String(jogoRes.data.placar_time_b),
      })
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

  async function handleSaveScore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!jogoId || !jogo) return

    if (scoreForm.placar_time_a === '' || scoreForm.placar_time_b === '') {
      toast('Informe o placar dos dois times.', 'error')
      return
    }

    const placarTimeA = Number(scoreForm.placar_time_a)
    const placarTimeB = Number(scoreForm.placar_time_b)

    if (!Number.isFinite(placarTimeA) || !Number.isFinite(placarTimeB) || placarTimeA < 0 || placarTimeB < 0) {
      toast('Informe um placar válido para os dois times.', 'error')
      return
    }

    try {
      setSavingScore(true)
      const response = await jogosApi.updatePlacar(jogoId, {
        time_a_nome: scoreForm.time_a_nome,
        time_b_nome: scoreForm.time_b_nome,
        placar_time_a: placarTimeA,
        placar_time_b: placarTimeB,
      })
      setJogo((current) => (current ? { ...current, ...response.data } : current))
      toast('Placar salvo com sucesso.', 'success')
    } catch (error) {
      console.error('Erro ao salvar placar:', error)
      toast('Erro ao salvar placar. Tente novamente.', 'error')
    } finally {
      setSavingScore(false)
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

  const hasScore = jogo.placar_time_a !== null && jogo.placar_time_a !== undefined
    && jogo.placar_time_b !== null && jogo.placar_time_b !== undefined
  const winnerLabel = hasScore
    ? jogo.placar_time_a === jogo.placar_time_b
      ? 'Empate'
      : jogo.placar_time_a > jogo.placar_time_b
        ? jogo.time_a_nome || 'Time A'
        : jogo.time_b_nome || 'Time B'
    : 'Aguardando resultado'

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">
            {format(parseGameDate(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h1>
          <p className="text-gray-400">
            {format(parseGameDate(jogo.data_hora), 'HH:mm')} - {jogo.local ?? 'Local não definido'}
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

      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
              Resultado
            </p>
            <h2 className="text-lg font-bold text-white">Placar da partida</h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300">
            <Trophy size={14} className={hasScore ? 'text-amber-400' : 'text-gray-500'} />
            {winnerLabel}
          </span>
        </div>

        {isAdmin ? (
          <form onSubmit={handleSaveScore} className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold text-gray-400">Time A</span>
                <input
                  value={scoreForm.time_a_nome}
                  onChange={(e) => setScoreForm((current) => ({ ...current, time_a_nome: e.target.value }))}
                  className="input"
                  placeholder="Ex: Verde"
                />
              </label>
              <span className="pb-3 text-lg font-bold text-gray-500">x</span>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-gray-400">Time B</span>
                <input
                  value={scoreForm.time_b_nome}
                  onChange={(e) => setScoreForm((current) => ({ ...current, time_b_nome: e.target.value }))}
                  className="input"
                  placeholder="Ex: Azul"
                />
              </label>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <input
                type="number"
                min="0"
                value={scoreForm.placar_time_a}
                onChange={(e) => setScoreForm((current) => ({ ...current, placar_time_a: e.target.value }))}
                className="input text-center text-2xl font-bold"
                placeholder="0"
              />
              <span className="text-2xl font-bold text-gray-500">x</span>
              <input
                type="number"
                min="0"
                value={scoreForm.placar_time_b}
                onChange={(e) => setScoreForm((current) => ({ ...current, placar_time_b: e.target.value }))}
                className="input text-center text-2xl font-bold"
                placeholder="0"
              />
            </div>

            <button type="submit" disabled={savingScore} className="btn-primary w-full">
              <Save size={18} />
              {savingScore ? 'Salvando...' : 'Salvar placar'}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
            <div>
              <p className="text-sm text-gray-400">{jogo.time_a_nome || 'Time A'}</p>
              <p className="text-3xl font-bold text-white">{hasScore ? jogo.placar_time_a : '-'}</p>
            </div>
            <span className="text-2xl font-bold text-gray-500">x</span>
            <div className="text-right">
              <p className="text-sm text-gray-400">{jogo.time_b_nome || 'Time B'}</p>
              <p className="text-3xl font-bold text-white">{hasScore ? jogo.placar_time_b : '-'}</p>
            </div>
          </div>
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

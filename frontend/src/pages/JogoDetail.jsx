import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, Clock, Trash2, Save, Trophy } from 'lucide-react'
import { jogosApi, presencasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function JogoDetail() {
  const { jogoId } = useParams()
  const navigate = useNavigate()
  const [jogo, setJogo] = useState(null)
  const [lista, setLista] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingScore, setSavingScore] = useState(false)
  const [scoreForm, setScoreForm] = useState({
    time_a_nome: 'Time A',
    time_b_nome: 'Time B',
    placar_time_a: '',
    placar_time_b: '',
  })
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const loadData = useCallback(async () => {
    try {
      const [jogoRes, listaRes] = await Promise.all([jogosApi.get(jogoId), jogosApi.getLista(jogoId)])
      setJogo(jogoRes.data)
      setScoreForm({
        time_a_nome: jogoRes.data.time_a_nome || 'Time A',
        time_b_nome: jogoRes.data.time_b_nome || 'Time B',
        placar_time_a: jogoRes.data.placar_time_a == null ? '' : String(jogoRes.data.placar_time_a),
        placar_time_b: jogoRes.data.placar_time_b == null ? '' : String(jogoRes.data.placar_time_b),
      })
      setLista(listaRes.data)
    } catch (error) {
      console.error('Erro ao carregar jogo:', error)
    } finally {
      setLoading(false)
    }
  }, [jogoId])

  useEffect(() => { loadData() }, [loadData])


function parseDataJogo(dataHora) {
  const str = String(dataHora)
  const [datePart, timePart] = str.includes('T') ? str.split('T') : str.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = (timePart || '12:00').split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute, 0)
}


  async function handleConfirmar(atletaId) { await presencasApi.confirmar(jogoId, atletaId); loadData() }
  async function handleRecusar(atletaId) { await presencasApi.recusar(jogoId, atletaId); loadData() }
  async function handleExcluir() {
    if (!isAdmin) return
    const ok = window.confirm('Excluir este jogo?')
    if (!ok) return
    try {
      await jogosApi.cancel(jogoId)
      navigate(`/racha/${jogo.racha_id}/jogos`)
    } catch (error) {
      console.error('Erro ao excluir jogo:', error)
      alert('Erro ao excluir jogo. Tente novamente.')
    }
  }

  async function handleSaveScore(event) {
    event.preventDefault()
    if (scoreForm.placar_time_a === '' || scoreForm.placar_time_b === '') {
      alert('Informe o placar dos dois times.')
      return
    }

    const placarTimeA = Number(scoreForm.placar_time_a)
    const placarTimeB = Number(scoreForm.placar_time_b)

    if (!Number.isFinite(placarTimeA) || !Number.isFinite(placarTimeB) || placarTimeA < 0 || placarTimeB < 0) {
      alert('Informe um placar válido para os dois times.')
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
      setJogo((current) => current ? { ...current, ...response.data } : current)
    } catch (error) {
      console.error('Erro ao salvar placar:', error)
      alert('Erro ao salvar placar. Tente novamente.')
    } finally {
      setSavingScore(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!jogo || !lista) return <div className="text-center py-12">Jogo não encontrado</div>

  const hasScore = jogo.placar_time_a != null && jogo.placar_time_b != null
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
        <button onClick={() => navigate(-1)} className="text-gray-500"><ArrowLeft size={24} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{format(parseDataJogo(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}</h1>
          <p className="text-gray-500">{format(parseDataJogo(jogo.data_hora), 'HH:mm')} - {jogo.local || 'Local n?o definido'}</p>
        </div>
        {isAdmin && (
          <button onClick={handleExcluir} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir jogo">
            <Trash2 size={18} />
          </button>
        )}
      </div>
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Resultado</p>
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
                <input value={scoreForm.time_a_nome} onChange={(e) => setScoreForm((current) => ({ ...current, time_a_nome: e.target.value }))} className="input" placeholder="Ex: Verde" />
              </label>
              <span className="pb-3 text-lg font-bold text-gray-500">x</span>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-gray-400">Time B</span>
                <input value={scoreForm.time_b_nome} onChange={(e) => setScoreForm((current) => ({ ...current, time_b_nome: e.target.value }))} className="input" placeholder="Ex: Azul" />
              </label>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <input type="number" min="0" value={scoreForm.placar_time_a} onChange={(e) => setScoreForm((current) => ({ ...current, placar_time_a: e.target.value }))} className="input text-center text-2xl font-bold" placeholder="0" />
              <span className="text-2xl font-bold text-gray-500">x</span>
              <input type="number" min="0" value={scoreForm.placar_time_b} onChange={(e) => setScoreForm((current) => ({ ...current, placar_time_b: e.target.value }))} className="input text-center text-2xl font-bold" placeholder="0" />
            </div>
            <button type="submit" disabled={savingScore} className="btn-primary w-full">
              <Save size={18} />
              {savingScore ? 'Salvando...' : 'Salvar placar'}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
            <div><p className="text-sm text-gray-400">{jogo.time_a_nome || 'Time A'}</p><p className="text-3xl font-bold text-white">{hasScore ? jogo.placar_time_a : '-'}</p></div>
            <span className="text-2xl font-bold text-gray-500">x</span>
            <div className="text-right"><p className="text-sm text-gray-400">{jogo.time_b_nome || 'Time B'}</p><p className="text-3xl font-bold text-white">{hasScore ? jogo.placar_time_b : '-'}</p></div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3"><p className="text-2xl font-bold text-green-600">{lista.total_confirmados}</p><p className="text-xs text-gray-500">Confirmados</p></div>
        <div className="card text-center py-3"><p className="text-2xl font-bold text-orange-500">{lista.total_pendentes}</p><p className="text-xs text-gray-500">Pendentes</p></div>
        <div className="card text-center py-3"><p className="text-2xl font-bold text-red-500">{lista.total_recusados}</p><p className="text-xs text-gray-500">Recusados</p></div>
      </div>
      <div><h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Check className="text-green-600" size={20} />Confirmados ({lista.confirmados.length})</h2>
        <div className="card divide-y">{lista.confirmados.length === 0 ? <p className="text-gray-500 text-center py-4">Nenhum confirmado ainda</p> : lista.confirmados.map((a) => <div key={a.atleta_id} className="py-3 flex items-center justify-between"><div><p className="font-medium text-white">{a.apelido || a.nome}</p><p className="text-xs text-gray-500 capitalize">{a.posicao}</p></div><span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Confirmado</span></div>)}</div>
      </div>
      <div>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Clock className="text-orange-500" size={20} />Pendentes ({lista.pendentes.length})</h2>
        <div className="card divide-y">
          {lista.pendentes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Todos responderam</p>
          ) : (
            lista.pendentes.map((a) => (
              <div key={a.atleta_id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{a.apelido || a.nome}</p>
                  <p className="text-xs text-gray-500 capitalize">{a.posicao}</p>
                </div>
                <div className="flex gap-2">
                  {(isAdmin || Number(user?.id) === Number(a.user_id)) && (
                    <>
                      <button onClick={() => handleConfirmar(a.atleta_id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Check size={16} /></button>
                      <button onClick={() => handleRecusar(a.atleta_id)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><X size={16} /></button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

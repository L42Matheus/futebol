import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, X, Clock, Trash2, Save, Trophy, Radio, ChevronDown, MapPin, Play, Shuffle } from 'lucide-react'
import { destaquesApi, jogosApi, presencasApi, rachasApi, teamsApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { esporteDaModalidade } from '../esportes'
import { parseDataJogo } from '../utils/dataJogo'
import type { DestaquesPartida, Jogo, JogoLista } from '../types'


function primeiraMaiuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
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
    time_a_id: '' as number | '',
    time_b_id: '' as number | '',
    time_a_nome: 'Time A',
    time_b_nome: 'Time B',
    placar_time_a: '',
    placar_time_b: '',
  })
  const [teams, setTeams] = useState<{ id: number; nome: string }[]>([])
  const { toast } = useToast()
  // Admin deste racha: a conta pode ser admin de um racha e atleta de outro.
  const [isAdmin, setIsAdmin] = useState(false)
  const [tipoRacha, setTipoRacha] = useState<string | null>(null)
  const [placarManual, setPlacarManual] = useState(false)
  const [destaques, setDestaques] = useState<DestaquesPartida | null>(null)

  const loadData = useCallback(async () => {
    if (!jogoId) return
    try {
      const [jogoRes, listaRes] = await Promise.all([
        jogosApi.get(jogoId),
        jogosApi.getLista(jogoId),
      ])
      setJogo(jogoRes.data)
      setScoreForm({
        time_a_id: jogoRes.data.time_a_id ?? '',
        time_b_id: jogoRes.data.time_b_id ?? '',
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
      rachasApi
        .get(jogoRes.data.racha_id)
        .then((res) => {
          setIsAdmin(Boolean(res.data.is_admin))
          setTipoRacha(res.data.tipo)
        })
        .catch(() => setIsAdmin(false))

      // Carrega times do racha (best-effort — se falhar, mantém só os inputs livres)
      try {
        const teamsRes = await teamsApi.list(jogoRes.data.racha_id)
        setTeams((teamsRes.data ?? []).map((t: { id: number; nome: string }) => ({ id: t.id, nome: t.nome })))
      } catch (e) {
        console.warn('Não foi possível carregar os times do racha:', e)
      }
    } catch (error) {
      console.error('Erro ao carregar jogo:', error)
    } finally {
      setLoading(false)
    }
  }, [jogoId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // O card dos destaques só aparece depois do apito final.
  const finalizado = Boolean(jogo?.finalizado)
  useEffect(() => {
    if (!jogoId || !finalizado) return
    destaquesApi.get(jogoId).then(({ data }) => setDestaques(data)).catch(() => setDestaques(null))
  }, [jogoId, finalizado])

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

    if (teams.length > 0 && (scoreForm.time_a_id === '' || scoreForm.time_b_id === '')) {
      toast('Escolha os dois times.', 'error')
      return
    }

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
        time_a_id: scoreForm.time_a_id === '' ? null : Number(scoreForm.time_a_id),
        time_b_id: scoreForm.time_b_id === '' ? null : Number(scoreForm.time_b_id),
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
      : (jogo.placar_time_a ?? 0) > (jogo.placar_time_b ?? 0)
        ? jogo.time_a_nome || 'Time A'
        : jogo.time_b_nome || 'Time B'
    : 'Aguardando resultado'

  const aoVivo = Boolean(jogo.iniciado_em) && !jogo.finalizado
  const nomeA = jogo.time_a_nome || 'Time A'
  const nomeB = jogo.time_b_nome || 'Time B'
  const statusLabel = aoVivo ? 'Ao vivo' : jogo.finalizado || hasScore ? 'Encerrado' : 'Ainda não começou'
  const emSets = esporteDaModalidade(tipoRacha).placar.tipo === 'pontos'

  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black text-white">
            {primeiraMaiuscula(format(parseDataJogo(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR }))}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={15} /> {format(parseDataJogo(jogo.data_hora), 'HH:mm')}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin size={15} /> <span className="truncate">{jogo.local || 'Local não definido'}</span>
            </span>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-xl p-2 text-red-500 transition-colors hover:bg-red-500/10"
            title="Excluir jogo"
            aria-label="Excluir jogo"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <section className="tema-escuro overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-sky-900 via-slate-900 to-emerald-800 px-5 py-5 text-center shadow-xl shadow-black/20">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${
            aoVivo ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/70'
          }`}
        >
          {aoVivo && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
          {statusLabel}
        </span>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p className="truncate text-right text-sm font-black uppercase tracking-wide text-white">{nomeA}</p>
          <div>
            <p className="text-4xl font-black leading-none tabular-nums text-white">
              {hasScore || aoVivo ? jogo.placar_time_a ?? 0 : '-'}
              <span className="mx-2 align-middle text-xl text-white/40">x</span>
              {hasScore || aoVivo ? jogo.placar_time_b ?? 0 : '-'}
            </p>
            {emSets && (hasScore || aoVivo) && (
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">sets</p>
            )}
          </div>
          <p className="truncate text-left text-sm font-black uppercase tracking-wide text-white">{nomeB}</p>
        </div>

        {hasScore && !aoVivo && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-white/80">
            <Trophy size={15} className="text-amber-300" />
            {winnerLabel === 'Empate' ? 'Empate' : `Vitória do ${winnerLabel}`}
          </p>
        )}

        {(isAdmin || jogo.iniciado_em) ? (
          <button
            type="button"
            onClick={() => navigate(`/racha/${jogo.racha_id}/jogo/${jogo.id}/partida`)}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-900 transition-colors hover:bg-white/90"
          >
            {!jogo.iniciado_em ? <Play size={17} /> : <Radio size={17} />}
            {!jogo.iniciado_em
              ? 'Iniciar partida ao vivo'
              : aoVivo
                ? isAdmin ? 'Abrir partida ao vivo' : 'Acompanhar ao vivo'
                : 'Ver lances da partida'}
          </button>
        ) : (
          <p className="mt-4 text-xs font-medium text-white/60">O placar aparece aqui quando a partida começar.</p>
        )}
      </section>

      {destaques && destaques.situacao !== 'aguardando' && (
        <button
          type="button"
          onClick={() => navigate(`/racha/${jogo.racha_id}/jogo/${jogo.id}/destaques`)}
          className="flex w-full items-center gap-3 rounded-[1.5rem] border border-amber-500/30 bg-amber-500/5 p-4 text-left transition-colors hover:border-amber-500/60"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Trophy size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black text-white">Destaques da partida</span>
            <span className="block truncate text-sm text-gray-400">
              {destaques.situacao === 'encerrada'
                ? destaques.destaques.length
                  ? `Melhor jogador: ${destaques.destaques[0].apelido || destaques.destaques[0].nome}`
                  : 'Veja o pódio da partida.'
                : destaques.pode_votar && destaques.meu_voto.length === 0
                  ? 'Votação aberta. Escolha os 3 melhores.'
                  : `Votação aberta · ${destaques.votantes}/${destaques.total_participantes} votaram`}
            </span>
          </span>
          <ChevronDown size={18} className="-rotate-90 shrink-0 text-gray-400" />
        </button>
      )}

      {isAdmin && !jogo.iniciado_em && (
        <button
          type="button"
          onClick={() => navigate(`/racha/${jogo.racha_id}/jogo/${jogo.id}/sorteio`)}
          className="flex w-full items-center gap-3 rounded-[1.5rem] border border-gray-800 bg-gray-900/40 p-4 text-left transition-colors hover:border-emerald-500/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
            <Shuffle size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black text-white">Sortear times</span>
            <span className="block text-sm text-gray-400">
              {jogo.time_a_nome && jogo.time_b_nome
                ? `Hoje: ${jogo.time_a_nome} x ${jogo.time_b_nome}. Sorteie de novo se quiser.`
                : 'Monte os times na hora com quem confirmou presença.'}
            </span>
          </span>
          <ChevronDown size={18} className="-rotate-90 shrink-0 text-gray-400" />
        </button>
      )}

      {isAdmin && !jogo.iniciado_em && (
        <div className="card">
          <button
            type="button"
            onClick={() => setPlacarManual((aberto) => !aberto)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-sm font-black text-white">Lançar só o placar</span>
              <span className="block text-xs text-gray-500">Para quando o jogo não foi acompanhado ao vivo.</span>
            </span>
            <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform ${placarManual ? 'rotate-180' : ''}`} />
          </button>
          {placarManual && (
            <div className="mt-4 border-t border-gray-800 pt-4">
              <form onSubmit={handleSaveScore} className="space-y-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold text-gray-400">Time A</span>
                    {teams.length > 0 ? (
                      <select
                        value={scoreForm.time_a_id}
                        onChange={(e) => {
                          const id = e.target.value
                          const team = teams.find((t) => String(t.id) === id)
                          setScoreForm((current) => ({
                            ...current,
                            time_a_id: id === '' ? '' : Number(id),
                            time_a_nome: team ? team.nome : current.time_a_nome,
                          }))
                        }}
                        className="input"
                      >
                        <option value="">Escolha o time</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {teams.length === 0 && (
                      <input
                        value={scoreForm.time_a_nome}
                        onChange={(e) => setScoreForm((current) => ({ ...current, time_a_nome: e.target.value }))}
                        className="input"
                        placeholder="Ex: Verde"
                      />
                    )}
                  </label>
                  <span className="pb-3 text-lg font-bold text-gray-500">x</span>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold text-gray-400">Time B</span>
                    {teams.length > 0 ? (
                      <select
                        value={scoreForm.time_b_id}
                        onChange={(e) => {
                          const id = e.target.value
                          const team = teams.find((t) => String(t.id) === id)
                          setScoreForm((current) => ({
                            ...current,
                            time_b_id: id === '' ? '' : Number(id),
                            time_b_nome: team ? team.nome : current.time_b_nome,
                          }))
                        }}
                        className="input"
                      >
                        <option value="">Escolha o time</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {teams.length === 0 && (
                      <input
                        value={scoreForm.time_b_nome}
                        onChange={(e) => setScoreForm((current) => ({ ...current, time_b_nome: e.target.value }))}
                        className="input"
                        placeholder="Ex: Azul"
                      />
                    )}
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

                <button type="submit" disabled={savingScore} className="btn-primary flex w-full items-center justify-center gap-2">
                  <Save size={18} />
                  {savingScore ? 'Salvando...' : 'Salvar placar'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

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

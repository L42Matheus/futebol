import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Calendar, Trophy, Plus, ArrowLeft, Lock, Unlock, Trash2 } from 'lucide-react'
import { rachasApi, teamsApi, temporadasApi, type Temporada } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import FormField from '../components/FormField'
import { Input, Select } from '../components/Input'
import ConfirmDialog from '../components/ConfirmDialog'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface TeamLite {
  id: number
  nome: string
}

function formatPeriodo(t: Temporada): string {
  const mes = MESES[t.mes - 1] ?? String(t.mes)
  return `${mes} de ${t.ano}`
}

function defaultName(): string {
  const now = new Date()
  return `Temporada ${MESES[now.getMonth()]} ${now.getFullYear()}`
}

export default function Temporadas() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [teams, setTeams] = useState<TeamLite[]>([])
  const [rachaNome, setRachaNome] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(() => {
    const now = new Date()
    return {
      nome: defaultName(),
      mes: now.getMonth() + 1,
      ano: now.getFullYear(),
    }
  })
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      const [tempRes, teamsRes, rachaRes] = await Promise.all([
        temporadasApi.list(rachaId),
        teamsApi.list(rachaId),
        rachasApi.get(rachaId),
      ])
      setTemporadas(tempRes.data ?? [])
      setTeams((teamsRes.data ?? []).map((t) => ({ id: t.id, nome: t.nome })))
      setRachaNome(rachaRes.data?.nome ?? '')
    } catch (e) {
      console.error(e)
      toast('Não foi possível carregar as temporadas.', 'error')
    } finally {
      setLoading(false)
    }
  }, [rachaId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const ativa = useMemo(() => temporadas.find((t) => t.status === 'ativa') ?? null, [temporadas])
  const encerradas = useMemo(() => temporadas.filter((t) => t.status === 'encerrada'), [temporadas])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!rachaId || !isAdmin) return
    if (ativa) {
      toast('Encerre a temporada ativa antes de criar uma nova.', 'info')
      return
    }
    setCreating(true)
    try {
      await temporadasApi.create({
        racha_id: Number(rachaId),
        nome: form.nome.trim() || defaultName(),
        mes: form.mes,
        ano: form.ano,
        status: 'ativa',
      })
      toast('Temporada criada!', 'success')
      setForm({ nome: defaultName(), mes: new Date().getMonth() + 1, ano: new Date().getFullYear() })
      loadData()
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(detail ?? 'Erro ao criar temporada.', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleStatus(temporada: Temporada) {
    if (!isAdmin) return
    const next = temporada.status === 'ativa' ? 'encerrada' : 'ativa'
    try {
      await temporadasApi.update(temporada.id, { status: next })
      toast(next === 'ativa' ? 'Temporada reaberta.' : 'Temporada encerrada.', 'success')
      loadData()
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(detail ?? 'Erro ao atualizar temporada.', 'error')
    }
  }

  async function handleSetCampeao(temporada: Temporada, teamId: number | '') {
    if (!isAdmin) return
    try {
      await temporadasApi.update(temporada.id, {
        campeao_team_id: teamId === '' ? null : Number(teamId),
      })
      toast(teamId === '' ? 'Campeão removido.' : 'Campeão definido!', 'success')
      loadData()
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(detail ?? 'Erro ao definir campeão.', 'error')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await temporadasApi.remove(deleteId)
      toast('Temporada removida.', 'success')
      setDeleteId(null)
      loadData()
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(detail ?? 'Erro ao remover temporada.', 'error')
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

  if (user && !isAdmin) {
    return (
      <div className="card text-center py-10">
        <h1 className="text-xl font-semibold text-white mb-2">Acesso restrito</h1>
        <p className="text-gray-400">Apenas administradores podem gerenciar temporadas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to={`/racha/${rachaId}/times`}
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft size={16} /> Voltar para Times
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">Temporadas</h1>
          {rachaNome && <p className="text-gray-400">{rachaNome}</p>}
        </div>
      </div>

      {/* Temporada ativa */}
      <div className="card border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Temporada ativa</p>
            {ativa ? (
              <>
                <h2 className="text-lg font-bold text-white">{ativa.nome}</h2>
                <p className="text-sm text-gray-400">{formatPeriodo(ativa)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleToggleStatus(ativa)}
                    className="btn-secondary inline-flex items-center gap-2 text-sm"
                  >
                    <Lock size={14} /> Encerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white">Nenhuma temporada ativa</h2>
                <p className="text-sm text-gray-400">Crie uma nova temporada abaixo para começar a vincular os times.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form criar */}
      {!ativa && (
        <form onSubmit={handleCreate} className="card space-y-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Plus size={18} /> Nova temporada
          </h2>
          <FormField label="Nome">
            <Input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Temporada Setembro 2026"
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Mês">
              <Select
                value={form.mes}
                onChange={(e) => setForm({ ...form, mes: parseInt(e.target.value, 10) })}
              >
                {MESES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Ano">
              <Input
                type="number"
                min={2000}
                max={2100}
                value={form.ano}
                onChange={(e) => setForm({ ...form, ano: parseInt(e.target.value, 10) })}
                required
              />
            </FormField>
          </div>
          <button type="submit" disabled={creating} className="btn-primary w-full disabled:opacity-60">
            {creating ? 'Criando...' : 'Criar temporada'}
          </button>
        </form>
      )}

      {/* Encerradas */}
      <div className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-gray-500 font-bold px-1">Temporadas encerradas</h2>
        {encerradas.length === 0 ? (
          <div className="card text-center py-8 text-gray-500">
            Nenhuma temporada encerrada ainda.
          </div>
        ) : (
          encerradas.map((t) => {
            const campeao = teams.find((team) => team.id === t.campeao_team_id) ?? null
            return (
              <div key={t.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">{t.nome}</h3>
                    <p className="text-xs text-gray-500">{formatPeriodo(t)}</p>
                    {campeao && (
                      <p className="mt-1 text-sm text-amber-400 inline-flex items-center gap-1">
                        <Trophy size={14} /> Campeão: <span className="font-semibold">{campeao.nome}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="p-2 text-gray-500 hover:text-red-500"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={t.campeao_team_id ?? ''}
                    onChange={(e) => handleSetCampeao(t, e.target.value as number | '')}
                    className="flex-1 min-w-[140px]"
                  >
                    <option value="">— Sem campeão —</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.nome}
                      </option>
                    ))}
                  </Select>
                  <button
                    onClick={() => handleToggleStatus(t)}
                    className="btn-secondary inline-flex items-center gap-2 text-sm"
                    title="Reabrir temporada"
                    disabled={Boolean(ativa)}
                  >
                    <Unlock size={14} /> Reabrir
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover temporada"
        description="Times vinculados ficam sem temporada. Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

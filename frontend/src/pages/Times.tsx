import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Users, Plus, Trash2, CalendarDays, Copy, UserPlus, X, ChevronRight } from 'lucide-react'
import { teamsApi, atletasApi, authApi, temporadasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Avatar from '../components/Avatar'
import { labelPosicao } from '../esportes'
import type { Atleta, Team } from '../types'

interface TeamMember {
  id: number
  atleta_id: number
}

interface TeamWithMembers extends Team {
  membros?: TeamMember[]
}

interface Temporada {
  id: number
  racha_id: number
  nome: string
  mes: number
  ano: number
  status: 'ativa' | 'encerrada'
  campeao_team_id?: number | null
}

// Cor de cada time pela ordem de criação; classes completas para o Tailwind encontrar.
const CORES = [
  { ponto: 'bg-emerald-400', botao: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15' },
  { ponto: 'bg-sky-400', botao: 'border-sky-500/40 text-sky-300 hover:bg-sky-500/15' },
  { ponto: 'bg-amber-400', botao: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/15' },
  { ponto: 'bg-rose-400', botao: 'border-rose-500/40 text-rose-300 hover:bg-rose-500/15' },
  { ponto: 'bg-violet-400', botao: 'border-violet-500/40 text-violet-300 hover:bg-violet-500/15' },
  { ponto: 'bg-lime-400', botao: 'border-lime-500/40 text-lime-300 hover:bg-lime-500/15' },
]
const corDoTime = (indice: number) => CORES[indice % CORES.length]

// Com poucos times, cada atleta sem time mostra um botão por time; acima disso, um select.
const MAX_BOTOES_DE_TIME = 4

const nomeDoAtleta = (atleta?: Atleta) => atleta?.apelido || atleta?.nome || 'Atleta'

export default function Times() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [temporada, setTemporada] = useState<Temporada | null>(null)
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamError, setNewTeamError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [deleteTeam, setDeleteTeam] = useState<TeamWithMembers | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const atletasById = useMemo(() => {
    const map: Record<number, Atleta> = {}
    atletas.forEach((a) => { map[a.id] = a })
    return map
  }, [atletas])

  const atletasSemTime = useMemo(() => {
    const comTime = new Set(teams.flatMap((team) => (team.membros ?? []).map((m) => Number(m.atleta_id))))
    return atletas.filter((atleta) => !comTime.has(Number(atleta.id)))
  }, [teams, atletas])

  // Só a primeira carga mostra o carregando; depois a tela atualiza no lugar.
  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      const temporadaRes = await temporadasApi.getActive(rachaId)
      const temporadaAtiva = temporadaRes.data as Temporada | null
      const [teamsRes, atletasRes] = await Promise.all([
        teamsApi.list(rachaId, temporadaAtiva?.id),
        atletasApi.list(rachaId),
      ])
      setTemporada(temporadaAtiva)
      setTeams(teamsRes.data as TeamWithMembers[])
      setAtletas(atletasRes.data)
    } catch (error) {
      console.error('Erro ao carregar times:', error)
    } finally {
      setLoading(false)
    }
  }, [rachaId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function getTeamCreateErrorMessage(error: unknown) {
    const detail = (error as any)?.response?.data?.detail
    const firstDetail = Array.isArray(detail) ? detail[0] : null

    if (firstDetail?.loc?.includes?.('nome') && firstDetail?.type === 'string_too_short') {
      return 'O nome do time precisa ter pelo menos 2 caracteres.'
    }

    if (typeof detail === 'string') return detail
    if (firstDetail?.msg) return firstDetail.msg

    return 'Erro ao criar time.'
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    const teamName = newTeamName.trim()
    if (!rachaId) return
    if (teamName.length < 2) {
      setNewTeamError('O nome do time precisa ter pelo menos 2 caracteres.')
      return
    }

    try {
      setNewTeamError('')
      await teamsApi.create({
        racha_id: Number(rachaId),
        temporada_id: temporada?.id,
        nome: teamName,
      })
      setNewTeamName('')
      toast(`Time "${teamName}" criado.`, 'success')
      loadData()
    } catch (error) {
      const message = getTeamCreateErrorMessage(error)
      setNewTeamError(message)
      toast(message, 'error')
    }
  }

  async function handleAddMember(teamId: number, atletaId: number) {
    try {
      await teamsApi.addMember(teamId, atletaId)
      loadData()
    } catch {
      toast('Erro ao adicionar atleta.', 'error')
    }
  }

  async function handleRemoveMember(teamId: number, atletaId: number) {
    try {
      await teamsApi.removeMember(teamId, atletaId)
      loadData()
    } catch {
      toast('Erro ao remover atleta.', 'error')
    }
  }

  async function handleDeleteTeamConfirm() {
    if (!deleteTeam) return
    try {
      await teamsApi.remove(deleteTeam.id)
      toast('Time apagado.', 'success')
      loadData()
    } catch {
      toast('Erro ao apagar time.', 'error')
    } finally {
      setDeleteTeam(null)
    }
  }

  async function handleGenerateInvite() {
    if (!rachaId) return
    try {
      const res = await authApi.createInvite({
        racha_id: Number(rachaId),
        role: 'atleta',
      })
      const link = `${window.location.origin}/register?invite=${res.data.token}`
      setInviteLink(link)
      try {
        await navigator.clipboard.writeText(link)
        toast('Link de convite copiado!', 'success')
      } catch {
        toast('Link gerado. Copie pelo campo abaixo.', 'info')
      }
    } catch {
      toast('Erro ao gerar convite.', 'error')
    }
  }

  async function handleCopyInvite() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast('Link de convite copiado!', 'success')
    } catch {
      toast('Não consegui copiar automaticamente. Selecione o campo e copie manualmente.', 'info')
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
        <p className="text-gray-400">Apenas administradores podem gerenciar times.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Times</h1>
          <Link
            to={`/racha/${rachaId}/temporadas`}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            <CalendarDays size={15} />
            <span className="truncate">{temporada ? temporada.nome : 'Nenhuma temporada ativa'}</span>
            <ChevronRight size={15} />
          </Link>
        </div>
        <button type="button" onClick={handleGenerateInvite} className="btn-secondary flex items-center gap-2 text-sm">
          <UserPlus size={16} /> Convidar atletas
        </button>
      </header>

      {inviteLink && (
        <div className="card flex items-center gap-2 py-3">
          <input className="input text-sm" readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={handleCopyInvite} className="btn-secondary shrink-0 p-3" title="Copiar link">
            <Copy size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleCreateTeam} className="space-y-2">
        <div className="flex gap-2">
          <input
            value={newTeamName}
            onChange={(e) => {
              setNewTeamName(e.target.value)
              if (newTeamError) setNewTeamError('')
            }}
            className="input flex-1"
            placeholder={teams.length === 0 ? 'Ex: Time Verde' : 'Nome do próximo time'}
            aria-invalid={Boolean(newTeamError)}
            aria-label="Nome do time"
          />
          <button className="btn-primary flex shrink-0 items-center justify-center gap-1" type="submit">
            <Plus size={16} /> Criar time
          </button>
        </div>
        {newTeamError && <p className="text-sm font-medium text-red-400">{newTeamError}</p>}
      </form>

      {atletas.length === 0 ? (
        <div className="card py-8 text-center">
          <Users size={30} className="mx-auto mb-2 text-gray-600" />
          <p className="text-gray-300">Ainda não há atletas no racha.</p>
          <p className="mt-1 text-sm text-gray-500">Use “Convidar atletas” e distribua cada um aqui quando entrarem.</p>
        </div>
      ) : atletasSemTime.length > 0 && (
        <section className="card space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold text-white">
              Sem time <span className="font-medium text-gray-500">({atletasSemTime.length})</span>
            </h2>
            <p className="text-xs text-gray-500">
              {teams.length === 0 ? 'Crie um time para distribuir' : 'Toque no time para mover'}
            </p>
          </div>
          <ul className="divide-y divide-gray-800">
            {atletasSemTime.map((atleta) => (
              <li key={atleta.id} className="flex items-center gap-3 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={atleta.foto_url} name={nomeDoAtleta(atleta)} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{nomeDoAtleta(atleta)}</p>
                    <p className="text-xs text-gray-500">{labelPosicao(atleta.posicao)}</p>
                  </div>
                </div>
                {teams.length > 0 && teams.length <= MAX_BOTOES_DE_TIME && (
                  <div className="flex max-w-[55%] flex-wrap justify-end gap-1.5">
                    {teams.map((team, i) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => handleAddMember(team.id, atleta.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${corDoTime(i).botao}`}
                      >
                        {team.nome}
                      </button>
                    ))}
                  </div>
                )}
                {teams.length > MAX_BOTOES_DE_TIME && (
                  <select
                    className="input w-36 shrink-0 py-2 text-sm sm:w-48"
                    value=""
                    onChange={(e) => e.target.value && handleAddMember(Number(e.target.value), atleta.id)}
                    aria-label={`Mover ${nomeDoAtleta(atleta)} para um time`}
                  >
                    <option value="">Mover para...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.nome}</option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 py-8 text-center">
          <p className="text-gray-400">Nenhum time criado</p>
          <p className="mt-1 text-sm text-gray-500">Dê um nome acima e clique em “Criar time”.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team, i) => {
            const membros = team.membros ?? []
            return (
              <article key={team.id} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40">
                <header className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${corDoTime(i).ponto}`} />
                  <h3 className="min-w-0 flex-1 truncate font-bold text-white">{team.nome}</h3>
                  <span className="shrink-0 text-xs text-gray-400">
                    {membros.length} atleta{membros.length === 1 ? '' : 's'}
                  </span>
                  <button
                    className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    type="button"
                    onClick={() => setDeleteTeam(team)}
                    title="Apagar time"
                    aria-label={`Apagar time ${team.nome}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </header>
                {membros.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-gray-500">
                    {atletasSemTime.length > 0 ? 'Sem atletas ainda. Use os botões em “Sem time”.' : 'Sem atletas ainda.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-800/70 px-2 py-1">
                    {membros.map((m) => {
                      const atleta = atletasById[m.atleta_id]
                      return (
                        <li key={m.id} className="flex items-center gap-3 px-2 py-2">
                          <Avatar src={atleta?.foto_url} name={nomeDoAtleta(atleta)} size="xs" />
                          <span className="min-w-0 flex-1 truncate text-sm text-white">{nomeDoAtleta(atleta)}</span>
                          <span className="text-xs text-gray-500">{labelPosicao(atleta?.posicao)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(team.id, m.atleta_id)}
                            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                            title="Tirar do time"
                            aria-label={`Tirar ${nomeDoAtleta(atleta)} do time ${team.nome}`}
                          >
                            <X size={14} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </article>
            )
          })}
        </section>
      )}

      <ConfirmDialog
        open={deleteTeam !== null}
        title="Apagar time"
        description={`Tem certeza que deseja apagar o time "${deleteTeam?.nome}"?`}
        confirmLabel="Apagar"
        danger
        onConfirm={handleDeleteTeamConfirm}
        onCancel={() => setDeleteTeam(null)}
      />
    </div>
  )
}

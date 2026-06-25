import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Users, Plus, Trash2, CalendarDays, Trophy, Copy, UserPlus } from 'lucide-react'
import { teamsApi, atletasApi, authApi, temporadasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
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

export default function Times() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [temporada, setTemporada] = useState<Temporada | null>(null)
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [selectedAthleteByTeam, setSelectedAthleteByTeam] = useState<Record<number, string>>({})
  const [deleteTeam, setDeleteTeam] = useState<TeamWithMembers | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const atletasById = useMemo(() => {
    const map: Record<number, Atleta> = {}
    atletas.forEach((a) => { map[a.id] = a })
    return map
  }, [atletas])

  const assignedAtletaIds = useMemo(() => {
    const ids = new Set<number>()
    teams.forEach((team) => {
      const members = team.membros ?? []
      members.forEach((member) => ids.add(Number(member.atleta_id)))
    })
    return ids
  }, [teams])

  const atletasSemTime = useMemo(
    () => atletas.filter((atleta) => !assignedAtletaIds.has(Number(atleta.id))),
    [assignedAtletaIds, atletas],
  )

  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      setLoading(true)
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

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeamName.trim() || !rachaId) return
    try {
      await teamsApi.create({
        racha_id: Number(rachaId),
        temporada_id: temporada?.id,
        nome: newTeamName.trim(),
      })
      setNewTeamName('')
      loadData()
    } catch {
      toast('Erro ao criar time.', 'error')
    }
  }

  async function handleAddMember(teamId: number, atletaId: string) {
    if (!atletaId) return
    try {
      await teamsApi.addMember(teamId, Number(atletaId))
      setSelectedAthleteByTeam((prev) => ({ ...prev, [teamId]: '' }))
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
      const base = window.location.origin
      const link = `${base}/register?invite=${res.data.token}`
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

  async function handleCreateCurrentSeason() {
    if (!rachaId) return
    const now = new Date()
    try {
      await temporadasApi.create({
        racha_id: Number(rachaId),
        nome: `Temporada ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        mes: now.getMonth() + 1,
        ano: now.getFullYear(),
        status: 'ativa',
      })
      toast('Temporada criada!', 'success')
      loadData()
    } catch {
      toast('Erro ao criar temporada.', 'error')
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
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white">Times</h1>
        <p className="text-gray-400">Convide atletas e monte os times da temporada</p>
      </div>

      <div className="card flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CalendarDays size={22} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Temporada ativa</p>
            {temporada ? (
              <>
                <h2 className="text-lg font-bold text-white">{temporada.nome}</h2>
                <p className="text-sm text-gray-400">
                  Times criados aqui disputam o ranking e o campeão do mês.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white">Nenhuma temporada criada</h2>
                <p className="text-sm text-gray-400">
                  Crie uma temporada para vincular os times do mês.
                </p>
              </>
            )}
          </div>
        </div>
        {!temporada && (
          <button
            type="button"
            onClick={handleCreateCurrentSeason}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Trophy size={16} /> Criar temporada
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white">1. Convide atletas para o racha</h2>
              <p className="text-sm text-gray-400">
                Use um único link. Depois que eles entrarem, você distribui cada um no time certo.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className="btn-primary flex items-center justify-center gap-2"
              onClick={handleGenerateInvite}
            >
              <Copy size={16} /> {inviteLink ? 'Gerar novo link' : 'Gerar e copiar link'}
            </button>
            {inviteLink && (
              <button
                type="button"
                className="btn-secondary flex items-center justify-center gap-2"
                onClick={handleCopyInvite}
              >
                <Copy size={16} /> Copiar novamente
              </button>
            )}
          </div>

          {inviteLink && (
            <input
              className="input text-sm"
              readOnly
              value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>

        <form onSubmit={handleCreateTeam} className="card space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white">2. Crie os times</h2>
              <p className="text-sm text-gray-400">
                Ex: Time Verde, Time Preto, Galáticos, Resenha FC.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="input"
              placeholder="Nome do time"
            />
            <button className="btn-primary flex items-center justify-center gap-1" type="submit">
              <Plus size={16} /> Criar
            </button>
          </div>
        </form>
      </div>

      <div className="card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="font-bold text-white">3. Distribua os atletas nos times</h2>
          <p className="text-sm text-gray-400">
            {atletas.length === 0
              ? 'Nenhum atleta cadastrado ainda. Convide ou cadastre atletas antes de montar os times.'
              : `${atletasSemTime.length} atleta${atletasSemTime.length === 1 ? '' : 's'} ainda sem time.`}
          </p>
        </div>
        <Link to={`/racha/${rachaId}/atletas`} className="btn-secondary text-center">
          Ver atletas
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="card text-center py-10">
          <Users size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400">Nenhum time criado</p>
          <p className="text-sm text-gray-500 mt-1">Crie o primeiro time acima para começar a distribuir os atletas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.id} className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white">{team.nome}</h2>
                  <p className="text-xs text-gray-500">
                    {(team.membros ?? []).length} atleta{(team.membros ?? []).length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    type="button"
                    onClick={() => setDeleteTeam(team)}
                    title="Apagar time"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Adicionar atleta existente
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="input"
                    value={selectedAthleteByTeam[team.id] ?? ''}
                    onChange={(e) => setSelectedAthleteByTeam((prev) => ({
                      ...prev,
                      [team.id]: e.target.value,
                    }))}
                    disabled={atletasSemTime.length === 0}
                  >
                    <option value="">
                      {atletasSemTime.length === 0 ? 'Nenhum atleta disponível' : 'Escolha um atleta...'}
                    </option>
                    {atletasSemTime.map((a) => (
                      <option key={a.id} value={a.id}>{a.apelido ?? a.nome}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-primary flex items-center justify-center gap-2"
                    disabled={!selectedAthleteByTeam[team.id]}
                    onClick={() => handleAddMember(team.id, selectedAthleteByTeam[team.id])}
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-800">
                {(team.membros ?? []).length === 0 && (
                  <p className="text-sm text-gray-500 py-2">Este time ainda está sem atletas.</p>
                )}
                {(team.membros ?? []).map((m) => (
                  <div key={m.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {atletasById[m.atleta_id]?.apelido ??
                          atletasById[m.atleta_id]?.nome ??
                          `Atleta ${m.atleta_id}`}
                      </p>
                    </div>
                    <button
                      className="text-red-400 text-sm hover:text-red-300 transition-colors"
                      type="button"
                      onClick={() => handleRemoveMember(team.id, m.atleta_id)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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

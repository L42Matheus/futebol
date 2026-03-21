import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Users, Link2, Plus, Trash2 } from 'lucide-react'
import { teamsApi, atletasApi, authApi } from '../services/api'
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

export default function Times() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteLinks, setInviteLinks] = useState<Record<number, string>>({})
  const [deleteTeam, setDeleteTeam] = useState<TeamWithMembers | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const atletasById = useMemo(() => {
    const map: Record<number, Atleta> = {}
    atletas.forEach((a) => { map[a.id] = a })
    return map
  }, [atletas])

  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      setLoading(true)
      const [teamsRes, atletasRes] = await Promise.all([
        teamsApi.list(rachaId),
        atletasApi.list(rachaId),
      ])
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
      await teamsApi.create({ racha_id: Number(rachaId), nome: newTeamName.trim() })
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

  async function handleGenerateInvite(teamId: number) {
    if (!rachaId) return
    try {
      const res = await authApi.createInvite({
        racha_id: Number(rachaId),
        role: 'atleta',
      })
      const base = window.location.origin
      const link = `${base}/register?invite=${res.data.token}`
      setInviteLinks((prev) => ({ ...prev, [teamId]: link }))
    } catch {
      toast('Erro ao gerar convite.', 'error')
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
        <p className="text-gray-400">Gerencie times e convites</p>
      </div>

      <form onSubmit={handleCreateTeam} className="card flex gap-3 items-center">
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          className="input"
          placeholder="Nome do time"
        />
        <button className="btn-primary flex items-center gap-1" type="submit">
          <Plus size={16} /> Criar
        </button>
      </form>

      {teams.length === 0 ? (
        <div className="card text-center py-10">
          <Users size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400">Nenhum time criado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">{team.nome}</h2>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary flex items-center gap-1"
                    type="button"
                    onClick={() => handleGenerateInvite(team.id)}
                  >
                    <Link2 size={16} /> Link
                  </button>
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

              {inviteLinks[team.id] && (
                <input
                  className="input"
                  readOnly
                  value={inviteLinks[team.id]}
                  onFocus={(e) => e.currentTarget.select()}
                />
              )}

              <select
                className="input"
                defaultValue=""
                onChange={(e) => handleAddMember(team.id, e.target.value)}
              >
                <option value="" disabled>Adicionar atleta...</option>
                {atletas.map((a) => (
                  <option key={a.id} value={a.id}>{a.apelido ?? a.nome}</option>
                ))}
              </select>

              <div className="divide-y divide-gray-800">
                {(team.membros ?? []).length === 0 && (
                  <p className="text-sm text-gray-500 py-2">Sem atletas</p>
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

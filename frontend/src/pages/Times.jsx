import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Users, Link2, Plus, Trash2 } from 'lucide-react'
import { teamsApi, atletasApi, authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Times() {
  const { rachaId } = useParams()
  const [teams, setTeams] = useState([])
  const [atletas, setAtletas] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteLinks, setInviteLinks] = useState({})
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const atletasById = useMemo(() => {
    const map = {}
    atletas.forEach((a) => { map[a.id] = a })
    return map
  }, [atletas])

  async function loadData() {
    try {
      setLoading(true)
      const [teamsRes, atletasRes] = await Promise.all([
        teamsApi.list(rachaId),
        atletasApi.list(rachaId),
      ])
      setTeams(teamsRes.data)
      setAtletas(atletasRes.data)
    } catch (error) {
      console.error('Erro ao carregar times:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [rachaId])

  async function handleCreateTeam(e) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    try {
      await teamsApi.create({ racha_id: Number(rachaId), nome: newTeamName.trim() })
      setNewTeamName('')
      loadData()
    } catch (error) {
      console.error('Erro ao criar time:', error)
      alert('Erro ao criar time.')
    }
  }

  async function handleAddMember(teamId, atletaId) {
    if (!atletaId) return
    try {
      await teamsApi.addMember(teamId, Number(atletaId))
      loadData()
    } catch (error) {
      console.error('Erro ao adicionar atleta:', error)
      alert('Erro ao adicionar atleta.')
    }
  }

  async function handleRemoveMember(teamId, atletaId) {
    try {
      await teamsApi.removeMember(teamId, atletaId)
      loadData()
    } catch (error) {
      console.error('Erro ao remover atleta:', error)
      alert('Erro ao remover atleta.')
    }
  }

  async function handleDeleteTeam(teamId, teamName) {
    if (!window.confirm(`Tem certeza que deseja apagar o time "${teamName}"?`)) return
    try {
      await teamsApi.remove(teamId)
      loadData()
    } catch (error) {
      console.error('Erro ao apagar time:', error)
      alert('Erro ao apagar time.')
    }
  }

  async function handleGenerateInvite(teamId) {
    try {
      const res = await authApi.createInvite({ racha_id: Number(rachaId), role: 'atleta', team_id: teamId })
      const base = window.location.origin
      const link = `${base}/register?invite=${res.data.token}`
      setInviteLinks((prev) => ({ ...prev, [teamId]: link }))
    } catch (error) {
      console.error('Erro ao gerar convite:', error)
      alert('Erro ao gerar convite.')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (user && !isAdmin) {
    return (
      <div className="card text-center py-10">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Acesso restrito</h1>
        <p className="text-gray-500">Apenas administradores podem gerenciar times.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to={`/racha/${rachaId}`} className="text-gray-500"><ArrowLeft size={24} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Times</h1>
          <p className="text-gray-500">Gerencie times e convites</p>
        </div>
      </div>

      <form onSubmit={handleCreateTeam} className="card flex gap-3 items-center">
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          className="input"
          placeholder="Nome do time"
        />
        <button className="btn-primary" type="submit"><Plus size={16} /> Criar</button>
      </form>

      {teams.length === 0 ? (
        <div className="card text-center py-10">
          <Users size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">Nenhum time criado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{team.nome}</h2>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary" type="button" onClick={() => handleGenerateInvite(team.id)}>
                    <Link2 size={16} /> Link
                  </button>
                  <button
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    type="button"
                    onClick={() => handleDeleteTeam(team.id, team.nome)}
                    title="Apagar time"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {inviteLinks[team.id] && (
                <input className="input" readOnly value={inviteLinks[team.id]} onFocus={(e) => e.target.select()} />
              )}
              <div className="flex gap-3 items-center">
                <select className="input" defaultValue="" onChange={(e) => handleAddMember(team.id, e.target.value)}>
                  <option value="" disabled>Adicionar atleta...</option>
                  {atletas.map((a) => (
                    <option key={a.id} value={a.id}>{a.apelido || a.nome}</option>
                  ))}
                </select>
              </div>
              <div className="divide-y">
                {(team.membros || []).length === 0 && <p className="text-sm text-gray-500 py-2">Sem atletas</p>}
                {(team.membros || []).map((m) => (
                  <div key={m.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{atletasById[m.atleta_id]?.apelido || atletasById[m.atleta_id]?.nome || `Atleta ${m.atleta_id}`}</p>
                      <p className="text-xs text-gray-500">ID: {m.atleta_id}</p>
                    </div>
                    <button className="text-red-600 text-sm" type="button" onClick={() => handleRemoveMember(team.id, m.atleta_id)}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

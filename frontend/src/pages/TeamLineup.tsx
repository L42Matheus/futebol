import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, UserPlus, X, Check } from 'lucide-react'
import { teamsApi, atletasApi } from '../services/api'
import SoccerField from '../components/SoccerField'
import Avatar from '../components/Avatar'

interface Atleta {
  id: number
  nome: string
  apelido?: string
  foto_url?: string
  posicao: string
  numero_camisa?: number
}

interface TeamMember {
  id: number
  team_id: number
  atleta_id: number
  is_titular: boolean
  posicao_escalacao?: string
  ordem_banco?: number
  atleta: Atleta
}

interface Team {
  id: number
  nome: string
  racha_id: number
  membros: TeamMember[]
}

const posicaoLabels: Record<string, string> = {
  goleiro: 'Goleiro',
  zagueiro: 'Zagueiro',
  lateral: 'Lateral',
  volante: 'Volante',
  meia: 'Meia',
  atacante: 'Atacante',
  ponta: 'Ponta',
}

export default function TeamLineup() {
  const { rachaId } = useParams()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<Team[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeamA, setSelectedTeamA] = useState<Team | null>(null)
  const [selectedTeamB, setSelectedTeamB] = useState<Team | null>(null)

  // Modal de edição de jogador
  const [editingMember, setEditingMember] = useState<{ team: Team; member: TeamMember } | null>(null)
  const [memberForm, setMemberForm] = useState({ is_titular: true, posicao_escalacao: '' })

  // Modal de adicionar jogador
  const [addingToTeam, setAddingToTeam] = useState<Team | null>(null)

  useEffect(() => {
    loadData()
  }, [rachaId])

  async function loadData() {
    try {
      const [teamsRes, atletasRes] = await Promise.all([
        teamsApi.list(rachaId),
        atletasApi.list(rachaId)
      ])
      setTeams(teamsRes.data)
      setAtletas(atletasRes.data)

      // Seleciona automaticamente os dois primeiros times
      if (teamsRes.data.length >= 2) {
        setSelectedTeamA(teamsRes.data[0])
        setSelectedTeamB(teamsRes.data[1])
      } else if (teamsRes.data.length === 1) {
        setSelectedTeamA(teamsRes.data[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handlePlayerClick(team: Team, member: TeamMember) {
    setEditingMember({ team, member })
    setMemberForm({
      is_titular: member.is_titular,
      posicao_escalacao: member.posicao_escalacao || member.atleta.posicao
    })
  }

  async function handleUpdateMember() {
    if (!editingMember) return

    try {
      await teamsApi.updateMember(
        editingMember.team.id,
        editingMember.member.atleta_id,
        memberForm
      )
      await loadData()
      setEditingMember(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao atualizar')
    }
  }

  async function handleRemoveMember() {
    if (!editingMember) return
    if (!window.confirm('Remover jogador do time?')) return

    try {
      await teamsApi.removeMember(editingMember.team.id, editingMember.member.atleta_id)
      await loadData()
      setEditingMember(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao remover')
    }
  }

  async function handleAddMember(atletaId: number) {
    if (!addingToTeam) return

    try {
      await teamsApi.addMember(addingToTeam.id, atletaId, {
        is_titular: true,
        posicao_escalacao: atletas.find(a => a.id === atletaId)?.posicao
      })
      await loadData()
      setAddingToTeam(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao adicionar')
    }
  }

  // Atletas disponíveis (não estão em nenhum dos times selecionados)
  function getAvailableAtletas() {
    const membersInTeams = new Set<number>()
    if (selectedTeamA) {
      selectedTeamA.membros.forEach(m => membersInTeams.add(m.atleta_id))
    }
    if (selectedTeamB) {
      selectedTeamB.membros.forEach(m => membersInTeams.add(m.atleta_id))
    }
    return atletas.filter(a => !membersInTeams.has(a.id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Escalação</h1>
        </div>
      </div>

      {/* Seleção de times */}
      <div className="card p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Time A</label>
            <select
              value={selectedTeamA?.id || ''}
              onChange={(e) => {
                const team = teams.find(t => t.id === parseInt(e.target.value))
                setSelectedTeamA(team || null)
              }}
              className="input"
            >
              <option value="">Selecione...</option>
              {teams.filter(t => t.id !== selectedTeamB?.id).map(team => (
                <option key={team.id} value={team.id}>{team.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Time B</label>
            <select
              value={selectedTeamB?.id || ''}
              onChange={(e) => {
                const team = teams.find(t => t.id === parseInt(e.target.value))
                setSelectedTeamB(team || null)
              }}
              className="input"
            >
              <option value="">Selecione...</option>
              {teams.filter(t => t.id !== selectedTeamA?.id).map(team => (
                <option key={team.id} value={team.id}>{team.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Campos lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time A */}
        <div>
          {selectedTeamA ? (
            <>
              <SoccerField
                teamName={selectedTeamA.nome}
                members={selectedTeamA.membros}
                color="green"
                side="left"
                onPlayerClick={(member) => handlePlayerClick(selectedTeamA, member)}
              />
              <button
                onClick={() => setAddingToTeam(selectedTeamA)}
                className="mt-3 w-full btn-secondary flex items-center justify-center gap-2"
              >
                <UserPlus size={18} />
                Adicionar Jogador
              </button>
            </>
          ) : (
            <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center">
              <p className="text-gray-400">Selecione o Time A</p>
            </div>
          )}
        </div>

        {/* Time B */}
        <div>
          {selectedTeamB ? (
            <>
              <SoccerField
                teamName={selectedTeamB.nome}
                members={selectedTeamB.membros}
                color="blue"
                side="right"
                onPlayerClick={(member) => handlePlayerClick(selectedTeamB, member)}
              />
              <button
                onClick={() => setAddingToTeam(selectedTeamB)}
                className="mt-3 w-full btn-secondary flex items-center justify-center gap-2"
              >
                <UserPlus size={18} />
                Adicionar Jogador
              </button>
            </>
          ) : (
            <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center">
              <p className="text-gray-400">Selecione o Time B</p>
            </div>
          )}
        </div>
      </div>

      {/* Atletas disponíveis */}
      {getAvailableAtletas().length > 0 && (
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Users size={18} />
            Atletas Disponíveis ({getAvailableAtletas().length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {getAvailableAtletas().map(atleta => (
              <div
                key={atleta.id}
                className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg"
              >
                <Avatar src={atleta.foto_url} name={atleta.apelido || atleta.nome} size="sm" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{atleta.apelido || atleta.nome}</p>
                  <p className="text-xs text-gray-500">{posicaoLabels[atleta.posicao]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de edição de jogador */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Editar Jogador</h2>
              <button onClick={() => setEditingMember(null)} className="text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <Avatar
                src={editingMember.member.atleta.foto_url}
                name={editingMember.member.atleta.apelido || editingMember.member.atleta.nome}
                size="lg"
              />
              <div>
                <p className="font-medium text-gray-900">
                  {editingMember.member.atleta.apelido || editingMember.member.atleta.nome}
                </p>
                <p className="text-sm text-gray-500">
                  {editingMember.team.nome}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMemberForm({ ...memberForm, is_titular: true })}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                      memberForm.is_titular
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Titular
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberForm({ ...memberForm, is_titular: false })}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                      !memberForm.is_titular
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Reserva
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Posição na Escalação</label>
                <select
                  value={memberForm.posicao_escalacao}
                  onChange={(e) => setMemberForm({ ...memberForm, posicao_escalacao: e.target.value })}
                  className="input"
                >
                  {Object.entries(posicaoLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleRemoveMember}
                  className="px-4 py-3 text-red-600 font-medium"
                >
                  Remover
                </button>
                <button
                  onClick={() => setEditingMember(null)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateMember}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de adicionar jogador */}
      {addingToTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Adicionar ao {addingToTeam.nome}
              </h2>
              <button onClick={() => setAddingToTeam(null)} className="text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-2">
              {getAvailableAtletas().length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Todos os atletas já estão nos times
                </p>
              ) : (
                getAvailableAtletas().map(atleta => (
                  <button
                    key={atleta.id}
                    onClick={() => handleAddMember(atleta.id)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Avatar src={atleta.foto_url} name={atleta.apelido || atleta.nome} size="md" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{atleta.apelido || atleta.nome}</p>
                      <p className="text-sm text-gray-500">{posicaoLabels[atleta.posicao]}</p>
                    </div>
                    <UserPlus size={20} className="text-primary-600" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, UserPlus, X, Check } from 'lucide-react'
import { teamsApi, atletasApi, rachasApi } from '../services/api'
import SoccerField from '../components/SoccerField'
import Avatar from '../components/Avatar'
import {
  GameType,
  Formation,
  PositionSlot,
  formationsByType,
  defaultFormation,
  getFormation
} from '../config/formations'

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

  // Tipo de jogo e formações
  const [gameType, setGameType] = useState<GameType>('society')
  const [formationA, setFormationA] = useState<Formation | null>(null)
  const [formationB, setFormationB] = useState<Formation | null>(null)

  // Modal de edição de jogador
  const [editingMember, setEditingMember] = useState<{ team: Team; member: TeamMember; slot?: PositionSlot } | null>(null)
  const [memberForm, setMemberForm] = useState({ is_titular: true, posicao_escalacao: '' })

  // Modal de adicionar jogador
  const [addingToTeam, setAddingToTeam] = useState<{ team: Team; slot?: PositionSlot } | null>(null)

  useEffect(() => {
    loadData()
  }, [rachaId])

  async function loadData() {
    try {
      const [teamsRes, atletasRes, rachaRes] = await Promise.all([
        teamsApi.list(rachaId),
        atletasApi.list(rachaId),
        rachasApi.get(rachaId)
      ])
      setTeams(teamsRes.data)
      setAtletas(atletasRes.data)

      // Define o tipo de jogo baseado no racha
      const tipo = rachaRes.data.tipo as GameType
      setGameType(tipo)

      // Define as formações padrão se ainda não foram definidas
      const defaultFormationId = defaultFormation[tipo]
      const defaultForm = getFormation(tipo, defaultFormationId)
      if (defaultForm) {
        if (!formationA) setFormationA(defaultForm)
        if (!formationB) setFormationB(defaultForm)
      }

      // Atualiza times selecionados com dados frescos ou seleciona automaticamente
      const freshTeams = teamsRes.data
      if (selectedTeamA) {
        const freshA = freshTeams.find((t: Team) => t.id === selectedTeamA.id)
        if (freshA) setSelectedTeamA(freshA)
      }
      if (selectedTeamB) {
        const freshB = freshTeams.find((t: Team) => t.id === selectedTeamB.id)
        if (freshB) setSelectedTeamB(freshB)
      }

      // Se ainda não tem times selecionados, seleciona automaticamente
      if (!selectedTeamA && !selectedTeamB) {
        if (freshTeams.length >= 2) {
          setSelectedTeamA(freshTeams[0])
          setSelectedTeamB(freshTeams[1])
        } else if (freshTeams.length === 1) {
          setSelectedTeamA(freshTeams[0])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleSlotClick(team: Team, slot: PositionSlot, member?: TeamMember) {
    if (member) {
      // Clicou em um jogador existente - editar
      setEditingMember({ team, member, slot })
      setMemberForm({
        is_titular: member.is_titular,
        posicao_escalacao: slot.id
      })
    } else {
      // Clicou em um slot vazio - adicionar jogador
      setAddingToTeam({ team, slot })
    }
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
      const isBench = addingToTeam.slot?.id === 'bench'
      await teamsApi.addMember(addingToTeam.team.id, atletaId, {
        is_titular: !isBench,
        posicao_escalacao: isBench ? undefined : addingToTeam.slot?.id
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
          <button onClick={() => navigate(-1)} className="text-gray-400">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Escalação</h1>
            <span className="text-xs text-gray-400 capitalize">
              {gameType === 'campo' ? '11 jogadores' : gameType === 'society' ? '7 jogadores' : '5 jogadores'}
            </span>
          </div>
        </div>
      </div>

      {/* Seleção de times e formações */}
      <div className="card bg-gray-900/40 border border-gray-800 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
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
              <label className="label text-xs">Formação A</label>
              <select
                value={formationA?.id || ''}
                onChange={(e) => {
                  const form = getFormation(gameType, e.target.value)
                  if (form) setFormationA(form)
                }}
                className="input text-sm"
              >
                {formationsByType[gameType].map(form => (
                  <option key={form.id} value={form.id}>{form.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-3">
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
            <div>
              <label className="label text-xs">Formação B</label>
              <select
                value={formationB?.id || ''}
                onChange={(e) => {
                  const form = getFormation(gameType, e.target.value)
                  if (form) setFormationB(form)
                }}
                className="input text-sm"
              >
                {formationsByType[gameType].map(form => (
                  <option key={form.id} value={form.id}>{form.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Campos lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time A */}
        <div>
          {selectedTeamA && formationA ? (
            <>
              <SoccerField
                teamName={selectedTeamA.nome}
                members={selectedTeamA.membros}
                formation={formationA}
                color="green"
                side="left"
                onSlotClick={(slot, member) => handleSlotClick(selectedTeamA, slot, member)}
              />
              <button
                onClick={() => setAddingToTeam({ team: selectedTeamA, slot: undefined })}
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
          {selectedTeamB && formationB ? (
            <>
              <SoccerField
                teamName={selectedTeamB.nome}
                members={selectedTeamB.membros}
                formation={formationB}
                color="blue"
                side="right"
                onSlotClick={(slot, member) => handleSlotClick(selectedTeamB, slot, member)}
              />
              <button
                onClick={() => setAddingToTeam({ team: selectedTeamB, slot: undefined })}
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
        <div className="card bg-gray-900/40 border border-gray-800 p-4">
          <h3 className="font-medium text-white mb-3 flex items-center gap-2">
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
                  <p className="text-sm font-medium text-white">{atleta.apelido || atleta.nome}</p>
                  <p className="text-xs text-gray-400">{posicaoLabels[atleta.posicao]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de edição de jogador */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-gray-900/40 rounded-t-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Editar Jogador</h2>
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
                <p className="font-medium text-white">
                  {editingMember.member.atleta.apelido || editingMember.member.atleta.nome}
                </p>
                <p className="text-sm text-gray-400">
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
                        : 'bg-gray-100 text-gray-400'
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
                        : 'bg-gray-100 text-gray-400'
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
                  {(editingMember.team.id === selectedTeamA?.id ? formationA : formationB)?.positions.map((slot) => (
                    <option key={slot.id} value={slot.id}>{slot.label} ({slot.id})</option>
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
          <div className="bg-gray-900/40 rounded-t-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Adicionar ao {addingToTeam.team.nome}
                {addingToTeam.slot && addingToTeam.slot.id !== 'bench' && (
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({addingToTeam.slot.label})
                  </span>
                )}
              </h2>
              <button onClick={() => setAddingToTeam(null)} className="text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-2">
              {getAvailableAtletas().length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  Todos os atletas já estão nos times
                </p>
              ) : (
                getAvailableAtletas().map(atleta => (
                  <button
                    key={atleta.id}
                    onClick={() => handleAddMember(atleta.id)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-800/50 transition-colors"
                  >
                    <Avatar src={atleta.foto_url} name={atleta.apelido || atleta.nome} size="md" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{atleta.apelido || atleta.nome}</p>
                      <p className="text-sm text-gray-400">{posicaoLabels[atleta.posicao]}</p>
                    </div>
                    <UserPlus size={20} className="text-emerald-400" />
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

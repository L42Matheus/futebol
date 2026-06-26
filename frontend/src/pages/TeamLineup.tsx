import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, ChevronDown, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { teamsApi, atletasApi, rachasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import SoccerField from '../components/SoccerField'
import Avatar from '../components/Avatar'
import {
  GameType,
  Formation,
  PositionSlot,
  defaultFormation,
  formationsByType,
  getFormation,
  playerCount
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

const gameTypeLabels: Record<GameType, string> = {
  campo: 'Campo',
  society: 'Society',
  futsal: 'Futsal',
}

const gameTypeDescriptions: Record<GameType, string> = {
  campo: 'Escalação completa com 11 jogadores e banco amplo.',
  society: 'Campo reduzido com 7 vagas titulares por formação.',
  futsal: 'Quadra curta, cinco peças e rotações rápidas.'
}

export default function TeamLineup() {
  const { rachaId } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [teams, setTeams] = useState<Team[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeamA, setSelectedTeamA] = useState<Team | null>(null)
  const [selectedTeamB, setSelectedTeamB] = useState<Team | null>(null)
  const [gameType, setGameType] = useState<GameType>('society')
  const [formationA, setFormationA] = useState<Formation | null>(null)
  const [formationB, setFormationB] = useState<Formation | null>(null)
  const [editingMember, setEditingMember] = useState<{ team: Team; member: TeamMember; slot?: PositionSlot } | null>(null)
  const [memberForm, setMemberForm] = useState({ is_titular: true, posicao_escalacao: '' })
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

      const tipo = rachaRes.data.tipo as GameType
      setGameType(tipo)

      const defaultFormationId = defaultFormation[tipo]
      const defaultForm = getFormation(tipo, defaultFormationId)
      if (defaultForm) {
        if (!formationA || !getFormation(tipo, formationA.id)) setFormationA(defaultForm)
        if (!formationB || !getFormation(tipo, formationB.id)) setFormationB(defaultForm)
      }

      const freshTeams = teamsRes.data
      if (selectedTeamA) {
        const freshA = freshTeams.find((t: Team) => t.id === selectedTeamA.id)
        if (freshA) setSelectedTeamA(freshA)
      }
      if (selectedTeamB) {
        const freshB = freshTeams.find((t: Team) => t.id === selectedTeamB.id)
        if (freshB) setSelectedTeamB(freshB)
      }

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
    if (!isAdmin) return

    if (member) {
      const teamFormation = team.id === selectedTeamA?.id ? formationA : formationB
      setEditingMember({ team, member, slot })
      setMemberForm({
        is_titular: member.is_titular,
        posicao_escalacao: member.posicao_escalacao || (slot.id === 'bench' ? teamFormation?.positions[0]?.id || '' : slot.id)
      })
      return
    }

    setAddingToTeam({ team, slot })
  }

  async function handleUpdateMember() {
    if (!isAdmin || !editingMember) return

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
    if (!isAdmin || !editingMember) return
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
    if (!isAdmin || !addingToTeam) return

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

  async function handlePromoteBench(member: TeamMember) {
    if (!isAdmin || !addingToTeam) return
    if (!addingToTeam.slot || addingToTeam.slot.id === 'bench') return

    try {
      await teamsApi.updateMember(
        addingToTeam.team.id,
        member.atleta_id,
        { is_titular: true, posicao_escalacao: addingToTeam.slot.id }
      )
      await loadData()
      setAddingToTeam(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao mover do banco')
    }
  }

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

  function getBenchMembers(team: Team | null) {
    if (!team) return []
    return team.membros.filter(m => !m.is_titular)
  }

  function getStarterCount(team: Team | null) {
    if (!team) return 0
    return team.membros.filter(member => member.is_titular).length
  }

  const availableAtletas = getAvailableAtletas()
  const teamAOptions = teams.filter(team => team.id !== selectedTeamB?.id)
  const teamBOptions = teams.filter(team => team.id !== selectedTeamA?.id)
  const formationOptions = formationsByType[gameType]
  const playersPerSide = playerCount[gameType]
  const editingFormation = editingMember?.team.id === selectedTeamA?.id ? formationA : formationB
  const addingBenchMembers = getBenchMembers(addingToTeam?.team || null)
  const canPromoteBench = addingToTeam?.slot && addingToTeam.slot.id !== 'bench'

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#08111f] px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_35%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-emerald-300/70">
              Painel de Escalação
            </p>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Escalação</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/60">
                {gameTypeDescriptions[gameType]}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-white/70">
              {gameTypeLabels[gameType]}
            </span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-emerald-100">
              {playersPerSide} por time
            </span>
          </div>
        </div>
      </header>

      {isAdmin && (
        <section className="rounded-[2rem] border border-white/10 bg-[#08111f] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.35em] text-emerald-300/65">Time A</p>
              <div className="space-y-3">
                <div className="relative">
                  <select
                    value={selectedTeamA?.id || ''}
                    onChange={(e) => {
                      const team = teams.find(t => t.id === parseInt(e.target.value))
                      setSelectedTeamA(team || null)
                    }}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-4 pr-11 text-sm font-semibold text-white outline-none transition-colors focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                  >
                    <option value="">Selecione o time</option>
                    {teamAOptions.map(team => (
                      <option key={team.id} value={team.id}>{team.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/45" size={18} />
                </div>

                <div className="relative">
                  <select
                    value={formationA?.id || ''}
                    onChange={(e) => {
                      const form = getFormation(gameType, e.target.value)
                      if (form) setFormationA(form)
                    }}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-11 text-sm text-white/80 outline-none transition-colors focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                  >
                    {formationOptions.map(form => (
                      <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/45" size={18} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">Titulares</p>
                    <p className="mt-1 text-lg font-black text-white">{getStarterCount(selectedTeamA)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">Banco</p>
                    <p className="mt-1 text-lg font-black text-white">{getBenchMembers(selectedTeamA).length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border border-emerald-300/20 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.22),_rgba(13,20,32,0.95))] shadow-[0_12px_30px_rgba(16,185,129,0.18)]">
                <span className="text-[11px] font-black uppercase tracking-[0.35em] text-emerald-200/75">VS</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  {gameTypeLabels[gameType]}
                </span>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.35em] text-sky-300/65">Time B</p>
              <div className="space-y-3">
                <div className="relative">
                  <select
                    value={selectedTeamB?.id || ''}
                    onChange={(e) => {
                      const team = teams.find(t => t.id === parseInt(e.target.value))
                      setSelectedTeamB(team || null)
                    }}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-4 pr-11 text-sm font-semibold text-white outline-none transition-colors focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                  >
                    <option value="">Selecione o time</option>
                    {teamBOptions.map(team => (
                      <option key={team.id} value={team.id}>{team.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/45" size={18} />
                </div>

                <div className="relative">
                  <select
                    value={formationB?.id || ''}
                    onChange={(e) => {
                      const form = getFormation(gameType, e.target.value)
                      if (form) setFormationB(form)
                    }}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-11 text-sm text-white/80 outline-none transition-colors focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                  >
                    {formationOptions.map(form => (
                      <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/45" size={18} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">Titulares</p>
                    <p className="mt-1 text-lg font-black text-white">{getStarterCount(selectedTeamB)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">Banco</p>
                    <p className="mt-1 text-lg font-black text-white">{getBenchMembers(selectedTeamB).length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          {selectedTeamA && formationA ? (
            <SoccerField
              teamName={selectedTeamA.nome}
              members={selectedTeamA.membros}
              formation={formationA}
              color="green"
              side="left"
              onSlotClick={isAdmin ? (slot, member) => handleSlotClick(selectedTeamA, slot, member) : undefined}
              showBench={isAdmin}
              showMeta={isAdmin}
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-[#08111f] text-center shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
              <div className="space-y-2 px-6">
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/35">Time A</p>
                <p className="text-lg font-bold text-white/75">Selecione um time para montar a escalação</p>
              </div>
            </div>
          )}
        </div>

        <div>
          {selectedTeamB && formationB ? (
            <SoccerField
              teamName={selectedTeamB.nome}
              members={selectedTeamB.membros}
              formation={formationB}
              color="blue"
              side="right"
              onSlotClick={isAdmin ? (slot, member) => handleSlotClick(selectedTeamB, slot, member) : undefined}
              showBench={isAdmin}
              showMeta={isAdmin}
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-[#08111f] text-center shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
              <div className="space-y-2 px-6">
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/35">Time B</p>
                <p className="text-lg font-bold text-white/75">Selecione um time para montar a escalação</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && availableAtletas.length > 0 && (
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#08111f] shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-200">
                <Users size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/40">Sem Time</p>
                <h3 className="text-lg font-black text-white">Atletas Disponíveis</h3>
              </div>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-amber-100">
              {availableAtletas.length}
            </span>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableAtletas.map(atleta => (
              <div
                key={atleta.id}
                className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <Avatar src={atleta.foto_url} name={atleta.apelido || atleta.nome} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{atleta.apelido || atleta.nome}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {posicaoLabels[atleta.posicao] || atleta.posicao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isAdmin && editingMember && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm md:items-center md:p-6">
          <div className="w-full max-w-xl rounded-t-[2rem] border border-white/10 bg-[#08111f] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.45)] md:rounded-[2rem]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/40">Editar</p>
                <h2 className="text-2xl font-black text-white">Ajustar jogador</h2>
                <p className="mt-1 text-sm text-white/50">{editingMember.team.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
              <Avatar
                src={editingMember.member.atleta.foto_url}
                name={editingMember.member.atleta.apelido || editingMember.member.atleta.nome}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-white">
                  {editingMember.member.atleta.apelido || editingMember.member.atleta.nome}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                  {posicaoLabels[editingMember.member.atleta.posicao] || editingMember.member.atleta.posicao}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-white/75">Status no time</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMemberForm({ ...memberForm, is_titular: true })}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                      memberForm.is_titular
                        ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
                        : 'border-white/10 bg-white/[0.03] text-white/60'
                    }`}
                  >
                    Titular
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberForm({ ...memberForm, is_titular: false })}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                      !memberForm.is_titular
                        ? 'border-amber-300/25 bg-amber-400/10 text-amber-100'
                        : 'border-white/10 bg-white/[0.03] text-white/60'
                    }`}
                  >
                    Reserva
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/75">Posição na escalação</label>
                <div className="relative">
                  <select
                    value={memberForm.posicao_escalacao}
                    onChange={(e) => setMemberForm({ ...memberForm, posicao_escalacao: e.target.value })}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-11 text-sm text-white outline-none transition-colors focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                  >
                    {editingFormation?.positions.map((slot) => (
                      <option key={slot.id} value={slot.id}>{slot.label} ({slot.id})</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/45" size={18} />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleRemoveMember}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:bg-red-500/15"
                >
                  <UserMinus size={16} />
                  Remover
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-white/75 transition-colors hover:bg-white/[0.06]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpdateMember}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 transition-colors hover:bg-emerald-400/15"
                >
                  <Check size={16} />
                  Salvar alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && addingToTeam && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm md:items-center md:p-6">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#08111f] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.45)] md:rounded-[2rem]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/40">Adicionar</p>
                <h2 className="text-2xl font-black text-white">{addingToTeam.team.nome}</h2>
                <p className="mt-1 text-sm text-white/55">
                  {addingToTeam.slot?.id === 'bench'
                    ? 'Novo atleta direto no banco de reservas.'
                    : addingToTeam.slot
                      ? `Preencher slot ${addingToTeam.slot.label} (${addingToTeam.slot.id}).`
                      : 'Selecione um atleta para o time.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddingToTeam(null)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {canPromoteBench && addingBenchMembers.length > 0 && (
                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/40">Banco do Time</p>
                      <p className="text-sm text-white/60">Promova uma peça já inscrita para o slot selecionado.</p>
                    </div>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
                      {addingBenchMembers.length}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {addingBenchMembers.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handlePromoteBench(member)}
                        className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-left transition-colors hover:bg-[#0f1d31]"
                      >
                        <Avatar src={member.atleta.foto_url} name={member.atleta.apelido || member.atleta.nome} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{member.atleta.apelido || member.atleta.nome}</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                            {posicaoLabels[member.atleta.posicao] || member.atleta.posicao}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-100">
                          <UserPlus size={18} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/40">Atletas Disponíveis</p>
                    <p className="text-sm text-white/60">Atletas fora dos dois times selecionados.</p>
                  </div>
                  <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                    {availableAtletas.length}
                  </span>
                </div>

                {availableAtletas.length > 0 ? (
                  <div className="grid gap-2">
                    {availableAtletas.map(atleta => (
                      <button
                        key={atleta.id}
                        type="button"
                        onClick={() => handleAddMember(atleta.id)}
                        className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-left transition-colors hover:bg-[#0f1d31]"
                      >
                        <Avatar src={atleta.foto_url} name={atleta.apelido || atleta.nome} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{atleta.apelido || atleta.nome}</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                            {posicaoLabels[atleta.posicao] || atleta.posicao}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-100">
                          <UserPlus size={18} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#0b1728] px-4 py-6 text-center text-sm text-white/45">
                    Nenhum atleta disponível
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

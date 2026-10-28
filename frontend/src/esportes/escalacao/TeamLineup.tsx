import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { teamsApi, atletasApi, rachasApi, jogosApi, partidaApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import type { Partida } from '../../types'
import PainelTime from './PainelTime'
import Avatar from '../../components/Avatar'
import ConfirmDialog from '../../components/ConfirmDialog'
import { esporteDaModalidade, getModalidade, labelPosicao, temRecurso } from '..'
import type { EscalacaoEsporte, Formation, PositionSlot } from './tipos'

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

export default function TeamLineup() {
  const { rachaId } = useParams()
  // Admin deste racha (a conta pode ser admin de um racha e atleta em outro).
  const [isAdmin, setIsAdmin] = useState(false)

  const [teams, setTeams] = useState<Team[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeamA, setSelectedTeamA] = useState<Team | null>(null)
  const [selectedTeamB, setSelectedTeamB] = useState<Team | null>(null)
  const [tipo, setTipo] = useState('')
  const [escalacao, setEscalacao] = useState<EscalacaoEsporte | null>(null)
  const [escalacaoSize, setEscalacaoSize] = useState<number | null>(null)
  const [formationA, setFormationA] = useState<Formation | null>(null)
  const [formationB, setFormationB] = useState<Formation | null>(null)
  const [editingMember, setEditingMember] = useState<{ team: Team; member: TeamMember; slot?: PositionSlot } | null>(null)
  const [memberForm, setMemberForm] = useState({ is_titular: true, posicao_escalacao: '' })
  const [addingToTeam, setAddingToTeam] = useState<{ team: Team; slot?: PositionSlot } | null>(null)
  const [esporteSemEscalacao, setEsporteSemEscalacao] = useState<string | null>(null)
  // Partida ao vivo entre os dois times da tela: dá as bolinhas de gol e o botão de marcar.
  const [partida, setPartida] = useState<Partida | null>(null)
  const [marcando, setMarcando] = useState(false)
  const [salvamento, setSalvamento] = useState<'parado' | 'salvando' | 'salvo'>('parado')
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)
  const [assistenciaDe, setAssistenciaDe] = useState<{ team: Team; autorId: number } | null>(null)
  const { toast } = useToast()

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
      setIsAdmin(Boolean(rachaRes.data.is_admin))

      const tipoDoRacha = rachaRes.data.tipo
      const config = esporteDaModalidade(tipoDoRacha).escalacao
      if (!temRecurso(tipoDoRacha, 'escalacao') || !config) {
        setEsporteSemEscalacao(esporteDaModalidade(tipoDoRacha).nome)
        return
      }

      const size = rachaRes.data.escalacao_size ?? null
      setTipo(tipoDoRacha)
      setEscalacao(config)
      setEscalacaoSize(size)

      const formacoes = config.formacoes(tipoDoRacha, size)
      const existe = (f: Formation | null) => Boolean(f && formacoes.some((opcao) => opcao.id === f.id))
      const defaultForm = formacoes[0]
      if (defaultForm) {
        if (!existe(formationA)) setFormationA(defaultForm)
        if (!existe(formationB)) setFormationB(defaultForm)
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

  const carregarPartida = useCallback(async () => {
    if (!rachaId || !selectedTeamA || !selectedTeamB) {
      setPartida(null)
      return
    }
    try {
      const res = await jogosApi.list(rachaId, true)
      const ids = [selectedTeamA.id, selectedTeamB.id].sort().join('-')
      const aoVivo = res.data.find(
        (j) => j.iniciado_em && !j.finalizado && [j.time_a_id, j.time_b_id].sort().join('-') === ids,
      )
      setPartida(aoVivo ? (await partidaApi.get(aoVivo.id)).data : null)
    } catch {
      setPartida(null)
    }
  }, [rachaId, selectedTeamA?.id, selectedTeamB?.id])

  useEffect(() => {
    void carregarPartida()
  }, [carregarPartida])

  useEffect(() => {
    if (!partida) return
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregarPartida()
    }, 15000)
    return () => window.clearInterval(intervalo)
  }, [partida?.jogo_id, carregarPartida])

  const gols = useMemo(() => {
    const mapa: Record<number, number> = {}
    partida?.eventos.forEach((e) => {
      if (e.tipo === 'gol' && e.atleta_id) mapa[e.atleta_id] = (mapa[e.atleta_id] ?? 0) + 1
    })
    return mapa
  }, [partida])

  async function marcarGol(valor: number) {
    if (!partida || !editingMember) return
    const { team, member } = editingMember
    setMarcando(true)
    try {
      const res = await partidaApi.registrar(partida.jogo_id, { tipo: 'gol', atleta_id: member.atleta_id, valor })
      setPartida(res.data)
      const companheiros = team.membros.some((m) => m.is_titular && m.atleta_id !== member.atleta_id)
      if (res.data.eventos_permitidos.includes('assistencia') && companheiros) {
        setAssistenciaDe({ team, autorId: member.atleta_id })
      } else {
        toast(`${esporteDaModalidade(tipo).lance} registrado!`, 'success')
        setEditingMember(null)
      }
    } catch (e: any) {
      toast(e.response?.data?.detail || 'Não foi possível registrar.', 'error')
    } finally {
      setMarcando(false)
    }
  }

  async function marcarAssistencia(atletaId: number | null) {
    if (!partida) return
    setMarcando(true)
    try {
      if (atletaId) {
        const res = await partidaApi.registrar(partida.jogo_id, { tipo: 'assistencia', atleta_id: atletaId })
        setPartida(res.data)
      }
      toast(`${esporteDaModalidade(tipo).lance} registrado!`, 'success')
    } catch (e: any) {
      toast(e.response?.data?.detail || 'Não foi possível registrar a assistência.', 'error')
    } finally {
      setMarcando(false)
      setAssistenciaDe(null)
      setEditingMember(null)
    }
  }

  function handleSlotClick(team: Team, slot: PositionSlot, member?: TeamMember) {
    if (!isAdmin) return

    if (member) {
      setSalvamento('parado')
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

  // Em campo/banco e posição salvam na hora: a janela fica só com o que importa no jogo.
  async function salvarMembro(novo: typeof memberForm) {
    if (!isAdmin || !editingMember) return
    const anterior = memberForm
    setMemberForm(novo)
    setSalvamento('salvando')
    try {
      await teamsApi.updateMember(editingMember.team.id, editingMember.member.atleta_id, novo)
      setEditingMember((atual) => (atual ? { ...atual, member: { ...atual.member, ...novo } } : atual))
      await Promise.all([loadData(), carregarPartida()])
      setSalvamento('salvo')
    } catch (e: any) {
      setMemberForm(anterior)
      setSalvamento('parado')
      toast(e.response?.data?.detail || 'Não foi possível salvar.', 'error')
    }
  }

  async function handleRemoveMember() {
    if (!isAdmin || !editingMember) return
    setConfirmarRemocao(false)
    try {
      await teamsApi.removeMember(editingMember.team.id, editingMember.member.atleta_id)
      await Promise.all([loadData(), carregarPartida()])
      toast('Atleta tirado do time.', 'success')
      setEditingMember(null)
    } catch (e: any) {
      toast(e.response?.data?.detail || 'Não foi possível tirar do time.', 'error')
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
      toast(e.response?.data?.detail || 'Não foi possível adicionar.', 'error')
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
      toast(e.response?.data?.detail || 'Não foi possível tirar do banco.', 'error')
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
  const formationOptions = escalacao?.formacoes(tipo, escalacaoSize) ?? []
  const playersPerSide = escalacao?.jogadoresPorTime(tipo, escalacaoSize) ?? 0
  const getFormation = (id: string) => formationOptions.find((form) => form.id === id)
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

  if (esporteSemEscalacao) {
    return (
      <div className="card text-center py-10">
        <h1 className="text-xl font-semibold text-white mb-2">Escalação indisponível</h1>
        <p className="text-gray-400">A escalação ainda não existe para {esporteSemEscalacao}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* O título "Escalação" já está no cabeçalho do app: aqui só o resumo da modalidade. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-gray-400">{escalacao?.descricao(tipo)}</p>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
          {getModalidade(tipo).nome} · {playersPerSide} por time
        </span>
      </div>

      {isAdmin && (
        <section className="rounded-[1.75rem] border border-white/10 bg-painel p-3 shadow-[0_18px_40px_rgba(0,0,0,0.2)]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <SeletorEquipe
              rotulo="Time A"
              cor="emerald"
              time={selectedTeamA}
              opcoes={teamAOptions}
              formacao={formationA}
              formacoes={formationOptions}
              titulares={getStarterCount(selectedTeamA)}
              banco={getBenchMembers(selectedTeamA).length}
              onTime={(id) => setSelectedTeamA(teams.find((t) => t.id === id) || null)}
              onFormacao={(id) => {
                const form = getFormation(id)
                if (form) setFormationA(form)
              }}
            />
            <span className="mt-7 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-black text-white/60">
              VS
            </span>
            <SeletorEquipe
              rotulo="Time B"
              cor="sky"
              time={selectedTeamB}
              opcoes={teamBOptions}
              formacao={formationB}
              formacoes={formationOptions}
              titulares={getStarterCount(selectedTeamB)}
              banco={getBenchMembers(selectedTeamB).length}
              onTime={(id) => setSelectedTeamB(teams.find((t) => t.id === id) || null)}
              onFormacao={(id) => {
                const form = getFormation(id)
                if (form) setFormationB(form)
              }}
            />
          </div>
        </section>
      )}

      {partida ? (
        <Link
          to={`/racha/${rachaId}/jogo/${partida.jogo_id}/partida`}
          className="tema-escuro flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-sky-900 via-slate-900 to-emerald-800 px-4 py-3"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Ao vivo
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-black text-white">
            {partida.times[0].nome} {partida.times[0].placar} x {partida.times[1].placar} {partida.times[1].nome}
          </p>
          <ChevronRight size={18} className="shrink-0 text-white/60" />
        </Link>
      ) : (
        isAdmin && selectedTeamA && selectedTeamB && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/55">
            Para marcar {esporteDaModalidade(tipo).pontuacao.toLowerCase()} aqui, inicie a partida ao vivo entre {selectedTeamA.nome} e{' '}
            {selectedTeamB.nome} pela{' '}
            <Link to={`/racha/${rachaId}/jogos`} className="font-bold text-emerald-300 underline-offset-2 hover:underline">
              agenda
            </Link>
            .
          </p>
        )
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          {isAdmin && selectedTeamA && (
            <p className="mb-2 flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Time A · {selectedTeamA.nome}
            </p>
          )}
          {selectedTeamA && formationA && escalacao ? (
            <PainelTime
              Fundo={escalacao.Fundo}
              tipo={tipo}
              local={escalacao.local}
              teamName={selectedTeamA.nome}
              members={selectedTeamA.membros}
              formation={formationA}
              color="green"
              side="left"
              onSlotClick={isAdmin ? (slot, member) => handleSlotClick(selectedTeamA, slot, member) : undefined}
              showMeta={!isAdmin}
              gols={gols}
              IconePonto={partida ? esporteDaModalidade(tipo).Icone : undefined}
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-painel text-center shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
              <div className="space-y-2 px-6">
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/35">Time A</p>
                <p className="text-lg font-bold text-white/75">Selecione um time para montar a escalação</p>
              </div>
            </div>
          )}
        </div>

        <div>
          {isAdmin && selectedTeamB && (
            <p className="mb-2 flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-400">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Time B · {selectedTeamB.nome}
            </p>
          )}
          {selectedTeamB && formationB && escalacao ? (
            <PainelTime
              Fundo={escalacao.Fundo}
              tipo={tipo}
              local={escalacao.local}
              teamName={selectedTeamB.nome}
              members={selectedTeamB.membros}
              formation={formationB}
              color="blue"
              side="right"
              onSlotClick={isAdmin ? (slot, member) => handleSlotClick(selectedTeamB, slot, member) : undefined}
              showMeta={!isAdmin}
              gols={gols}
              IconePonto={partida ? esporteDaModalidade(tipo).Icone : undefined}
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-painel text-center shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
              <div className="space-y-2 px-6">
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/35">Time B</p>
                <p className="text-lg font-bold text-white/75">Selecione um time para montar a escalação</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && availableAtletas.length > 0 && (
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-painel shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
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
                    {labelPosicao(atleta.posicao)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isAdmin && editingMember && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm md:items-center md:p-6">
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-white/10 bg-painel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_32px_80px_rgba(0,0,0,0.45)] md:rounded-[2rem]">
            <div className="mb-5 flex items-center gap-3">
              <Avatar
                src={editingMember.member.atleta.foto_url}
                name={editingMember.member.atleta.apelido || editingMember.member.atleta.nome}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black text-white">
                  {editingMember.member.atleta.apelido || editingMember.member.atleta.nome}
                </p>
                <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  {labelPosicao(editingMember.member.atleta.posicao)} · {editingMember.team.nome}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => {
                  setEditingMember(null)
                  setAssistenciaDe(null)
                }}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {partida && !partida.finalizado && (
              <div className="mb-5">
                {assistenciaDe ? (
                  <>
                    <p className="text-sm font-black text-white">{esporteDaModalidade(tipo).lance} marcado! Quem deu a assistência?</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {assistenciaDe.team.membros
                        .filter((m) => m.is_titular && m.atleta_id !== assistenciaDe.autorId)
                        .map((m) => (
                          <button
                            key={m.atleta_id}
                            type="button"
                            disabled={marcando}
                            onClick={() => void marcarAssistencia(m.atleta_id)}
                            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm font-bold text-white transition-colors hover:border-emerald-300/40 disabled:opacity-40"
                          >
                            <Avatar src={m.atleta.foto_url} name={m.atleta.apelido || m.atleta.nome} size="xs" />
                            <span className="truncate">{m.atleta.apelido || m.atleta.nome.split(' ')[0]}</span>
                          </button>
                        ))}
                    </div>
                    <button
                      type="button"
                      disabled={marcando}
                      onClick={() => void marcarAssistencia(null)}
                      className="mt-2 w-full rounded-2xl border border-white/10 py-2.5 text-sm font-bold text-white/70 hover:bg-white/[0.05]"
                    >
                      Sem assistência
                    </button>
                  </>
                ) : editingMember.member.is_titular ? (
                  <>
                    <p className="flex items-center gap-2 text-xs font-bold text-white/60">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                      Ao vivo · {partida.times[0].nome} {partida.times[0].placar} x {partida.times[1].placar} {partida.times[1].nome}
                    </p>
                    <div className={`mt-3 grid gap-2 ${partida.valores_pontuacao.length > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      {partida.valores_pontuacao.map((valor) => (
                        <button
                          key={valor}
                          type="button"
                          disabled={marcando}
                          onClick={() => void marcarGol(valor)}
                          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-black text-branco transition-colors hover:bg-emerald-600 disabled:opacity-40"
                        >
                          {partida.valores_pontuacao.length > 1
                            ? `${esporteDaModalidade(tipo).lance} +${valor}`
                            : `Marcar ${esporteDaModalidade(tipo).lance.toLowerCase()}`}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-sm text-white/60">
                    No banco não marca {esporteDaModalidade(tipo).lance.toLowerCase()}. Coloque como titular para marcar.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-white/60">Situação no time</p>
                <p className="h-4 text-[11px] font-bold text-white/45" aria-live="polite">
                  {salvamento === 'salvando' ? 'Salvando...' : salvamento === 'salvo' ? 'Salvo ✓' : ''}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                {([
                  [true, 'Em campo'],
                  [false, 'No banco'],
                ] as const).map(([titular, nome]) => (
                  <button
                    key={nome}
                    type="button"
                    disabled={salvamento === 'salvando'}
                    onClick={() => {
                      if (memberForm.is_titular !== titular) void salvarMembro({ ...memberForm, is_titular: titular })
                    }}
                    className={`h-10 rounded-xl text-sm font-bold transition-colors ${
                      memberForm.is_titular === titular
                        ? 'bg-painel-2 text-white shadow-sm ring-1 ring-white/10'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {nome}
                  </button>
                ))}
              </div>

              {/* Posição só faz sentido para quem está em campo. */}
              {memberForm.is_titular && (
                <div className="relative">
                  <select
                    value={memberForm.posicao_escalacao}
                    disabled={salvamento === 'salvando'}
                    onChange={(e) => void salvarMembro({ ...memberForm, posicao_escalacao: e.target.value })}
                    aria-label={`Posição no ${escalacao?.local ?? 'campo'}`}
                    className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3 pr-10 text-sm font-semibold text-white outline-none transition-colors focus:border-emerald-400/50"
                  >
                    {editingFormation?.positions.map((slot) => (
                      <option key={slot.id} value={slot.id}>Posição: {slot.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
                </div>
              )}

              {/* Ação rara e destrutiva: discreta, no fim da janela. */}
              <button
                type="button"
                onClick={() => setConfirmarRemocao(true)}
                className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10"
              >
                <UserMinus size={14} />
                Tirar do time
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmarRemocao && Boolean(editingMember)}
        title="Tirar do time"
        description={
          editingMember
            ? `${editingMember.member.atleta.apelido || editingMember.member.atleta.nome} sai do ${editingMember.team.nome}. Continua no racha e pode voltar depois.`
            : ''
        }
        confirmLabel="Tirar do time"
        danger
        onConfirm={() => void handleRemoveMember()}
        onCancel={() => setConfirmarRemocao(false)}
      />

      {isAdmin && addingToTeam && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm md:items-center md:p-6">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-painel p-6 shadow-[0_32px_80px_rgba(0,0,0,0.45)] md:rounded-[2rem]">
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
                        className="flex items-center gap-4 rounded-2xl border border-white/10 bg-painel-2 px-4 py-3 text-left transition-colors hover:bg-painel-2"
                      >
                        <Avatar src={member.atleta.foto_url} name={member.atleta.apelido || member.atleta.nome} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{member.atleta.apelido || member.atleta.nome}</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                            {labelPosicao(member.atleta.posicao)}
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
                        className="flex items-center gap-4 rounded-2xl border border-white/10 bg-painel-2 px-4 py-3 text-left transition-colors hover:bg-painel-2"
                      >
                        <Avatar src={atleta.foto_url} name={atleta.apelido || atleta.nome} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{atleta.apelido || atleta.nome}</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                            {labelPosicao(atleta.posicao)}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-100">
                          <UserPlus size={18} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-painel-2 px-4 py-6 text-center text-sm text-white/45">
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

function SeletorEquipe({
  rotulo,
  cor,
  time,
  opcoes,
  formacao,
  formacoes,
  titulares,
  banco,
  onTime,
  onFormacao,
}: {
  rotulo: string
  cor: 'emerald' | 'sky'
  time: Team | null
  opcoes: Team[]
  formacao: Formation | null
  formacoes: Formation[]
  titulares: number
  banco: number
  onTime: (id: number) => void
  onFormacao: (id: string) => void
}) {
  const foco = cor === 'emerald' ? 'focus:border-emerald-400/50' : 'focus:border-sky-400/50'
  return (
    <div className="min-w-0 space-y-1.5">
      <p className={`px-1 text-[10px] font-black uppercase tracking-[0.25em] ${cor === 'emerald' ? 'text-emerald-400' : 'text-sky-400'}`}>
        {rotulo}
      </p>
      <div className="relative">
        <select
          value={time?.id || ''}
          onChange={(e) => onTime(parseInt(e.target.value))}
          aria-label={`${rotulo}: time`}
          className={`h-11 w-full appearance-none truncate rounded-xl border border-white/10 bg-painel-2 pl-3 pr-8 text-sm font-bold text-white outline-none ${foco}`}
        >
          <option value="">Escolha</option>
          {opcoes.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/45" size={16} />
      </div>
      <div className="relative">
        <select
          value={formacao?.id || ''}
          onChange={(e) => onFormacao(e.target.value)}
          aria-label={`${rotulo}: formação`}
          className={`h-9 w-full appearance-none truncate rounded-xl border border-white/10 bg-white/[0.03] pl-3 pr-8 text-xs text-white/80 outline-none ${foco}`}
        >
          {formacoes.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/45" size={14} />
      </div>
      <p className="px-1 text-[11px] font-semibold text-white/50">
        {titulares} titulares · {banco} no banco
      </p>
    </div>
  )
}

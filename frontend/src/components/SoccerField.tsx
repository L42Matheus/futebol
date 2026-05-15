import { Plus, Shield, Users } from 'lucide-react'
import Avatar from './Avatar'
import { Formation, PositionSlot } from '../config/formations'

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
  atleta_id: number
  is_titular: boolean
  posicao_escalacao?: string
  atleta: Atleta
}

interface SoccerFieldProps {
  teamName: string
  members: TeamMember[]
  formation: Formation
  color?: 'green' | 'blue' | 'red'
  side?: 'left' | 'right'
  onSlotClick?: (slot: PositionSlot, currentPlayer?: TeamMember) => void
  showBench?: boolean
  showMeta?: boolean
}

const BENCH_SLOT: PositionSlot = { id: 'bench', label: 'BANCO', top: '0', left: '0' }

const colorThemes = {
  green: {
    header: 'from-emerald-500 via-emerald-400 to-lime-300',
    chip: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/20',
    accent: 'bg-emerald-400/70',
    slot: 'hover:border-emerald-300/70 hover:bg-emerald-400/10',
    empty: 'border-emerald-200/35 text-emerald-100/80',
    benchAction: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
  },
  blue: {
    header: 'from-sky-500 via-blue-400 to-cyan-300',
    chip: 'bg-sky-500/15 text-sky-100 border-sky-300/20',
    accent: 'bg-sky-300/70',
    slot: 'hover:border-sky-300/70 hover:bg-sky-400/10',
    empty: 'border-sky-200/35 text-sky-100/80',
    benchAction: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
  },
  red: {
    header: 'from-rose-500 via-red-400 to-orange-300',
    chip: 'bg-rose-500/15 text-rose-100 border-rose-300/20',
    accent: 'bg-rose-300/70',
    slot: 'hover:border-rose-300/70 hover:bg-rose-400/10',
    empty: 'border-rose-200/35 text-rose-100/80',
    benchAction: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
  },
}

function getShortName(name: string) {
  return name.split(' ')[0]
}

export default function SoccerField({
  teamName,
  members,
  formation,
  color = 'green',
  side = 'left',
  onSlotClick,
  showBench = true,
  showMeta = true
}: SoccerFieldProps) {
  const titulares = members.filter(m => m.is_titular)
  const reservas = members.filter(m => !m.is_titular)
  const playersBySlot: Record<string, TeamMember> = {}

  titulares.forEach((member) => {
    if (member.posicao_escalacao) {
      const slot = formation.positions.find(
        p => p.id === member.posicao_escalacao || p.label === member.posicao_escalacao?.toUpperCase()
      )
      if (slot && !playersBySlot[slot.id]) {
        playersBySlot[slot.id] = member
        return
      }
    }

    for (const slot of formation.positions) {
      if (!playersBySlot[slot.id]) {
        playersBySlot[slot.id] = member
        break
      }
    }
  })

  const theme = colorThemes[color]
  const isInteractive = Boolean(onSlotClick)
  const fieldAvatarSize = formation.positions.length > 7 ? 'sm' : 'md'

  const getTop = (top: string) => {
    if (side === 'right') {
      const value = parseFloat(top)
      return `${100 - value}%`
    }
    return top
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {showMeta && (
        <div className="relative overflow-hidden border-b border-white/10 px-5 py-4">
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${theme.header}`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.1),_transparent_45%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/45">
                {side === 'left' ? 'Time A' : 'Time B'}
              </p>
              <h3 className="text-lg font-black text-white">{teamName}</h3>
              <p className="text-xs text-white/55">
                {formation.name} • {titulares.length} titulares
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] ${theme.chip}`}>
                {formation.positions.length} em campo
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70">
                {reservas.length} no banco
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        className={`relative aspect-[3/4] overflow-hidden ${showBench ? 'border-b border-white/10' : ''}`}
        style={{
          backgroundImage: `
            linear-gradient(180deg, rgba(8, 37, 18, 0.12) 0%, rgba(3, 16, 8, 0.34) 100%),
            repeating-linear-gradient(
              180deg,
              rgba(40, 149, 78, 0.92) 0%,
              rgba(40, 149, 78, 0.92) 12.5%,
              rgba(33, 127, 66, 0.92) 12.5%,
              rgba(33, 127, 66, 0.92) 25%
            )
          `
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.10),_transparent_58%)]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 130" preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="126" rx="3" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="0.6" />
          <line x1="2" y1="65" x2="98" y2="65" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
          <circle cx="50" cy="65" r="12" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
          <circle cx="50" cy="65" r="0.8" fill="rgba(255,255,255,0.75)" />
          <rect x="22" y="7" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
          <rect x="34" y="7" width="32" height="9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
          <rect x="22" y="103" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
          <rect x="34" y="114" width="32" height="9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
          <circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.75)" />
          <circle cx="50" cy="112" r="0.8" fill="rgba(255,255,255,0.75)" />
          <path d="M40,7 A10,10 0 0,0 60,7" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.45" />
          <path d="M40,123 A10,10 0 0,1 60,123" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.45" />
        </svg>

        <div className={`absolute left-4 top-4 h-16 w-16 rounded-full blur-2xl ${theme.accent}`} />
        <div className="absolute bottom-5 right-5 h-20 w-20 rounded-full bg-black/20 blur-3xl" />

        {formation.positions.map((slot) => {
          const player = playersBySlot[slot.id]

          return (
            <div
              key={slot.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                top: getTop(slot.top),
                left: slot.left,
              }}
            >
              {player ? (
                isInteractive ? (
                  <button
                    type="button"
                    onClick={() => onSlotClick?.(slot, player)}
                    className={`group flex w-20 flex-col items-center rounded-2xl border border-white/10 bg-slate-950/35 px-2 py-2 shadow-lg shadow-black/20 backdrop-blur-sm transition-all ${theme.slot}`}
                  >
                    <div className="relative">
                      <Avatar
                        src={player.atleta.foto_url}
                        name={player.atleta.apelido || player.atleta.nome}
                        size={fieldAvatarSize}
                        className="ring-2 ring-white/80 transition-all group-hover:ring-white"
                      />
                      {player.atleta.numero_camisa && (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] font-black text-white shadow-md">
                          {player.atleta.numero_camisa}
                        </span>
                      )}
                    </div>
                    <span className="mt-1.5 max-w-full truncate text-[11px] font-bold text-white">
                      {player.atleta.apelido || getShortName(player.atleta.nome)}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/60">
                      {slot.label}
                    </span>
                  </button>
                ) : (
                  <div className="flex w-20 flex-col items-center rounded-2xl border border-white/10 bg-slate-950/30 px-2 py-2 shadow-lg shadow-black/20 backdrop-blur-sm">
                    <div className="relative">
                      <Avatar
                        src={player.atleta.foto_url}
                        name={player.atleta.apelido || player.atleta.nome}
                        size={fieldAvatarSize}
                        className="ring-2 ring-white/80"
                      />
                      {player.atleta.numero_camisa && (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] font-black text-white shadow-md">
                          {player.atleta.numero_camisa}
                        </span>
                      )}
                    </div>
                    <span className="mt-1.5 max-w-full truncate text-[11px] font-bold text-white">
                      {player.atleta.apelido || getShortName(player.atleta.nome)}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/60">
                      {slot.label}
                    </span>
                  </div>
                )
              ) : isInteractive ? (
                <button
                  type="button"
                  onClick={() => onSlotClick?.(slot)}
                  className={`flex w-[76px] flex-col items-center rounded-2xl border border-dashed bg-slate-950/20 px-2 py-3 backdrop-blur-sm transition-all ${theme.empty} ${theme.slot}`}
                >
                  <Plus size={14} className="mb-1" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                    {slot.label}
                  </span>
                </button>
              ) : (
                <div className={`flex w-[76px] flex-col items-center rounded-2xl border border-dashed bg-slate-950/15 px-2 py-3 ${theme.empty}`}>
                  <Shield size={14} className="mb-1" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                    {slot.label}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showBench && (
        <div className="space-y-3 bg-[#091523] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-white/70">
                <Users size={16} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white/45">Banco</p>
                <p className="text-sm font-semibold text-white">{reservas.length} reservas</p>
              </div>
            </div>
            {isInteractive && (
              <button
                type="button"
                onClick={() => onSlotClick?.(BENCH_SLOT)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${theme.benchAction}`}
              >
                <Plus size={14} />
                Adicionar reserva
              </button>
            )}
          </div>

          {reservas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-center text-sm text-white/45">
              Nenhum reserva no banco
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {reservas.map(member => {
                const content = (
                  <>
                    <Avatar
                      src={member.atleta.foto_url}
                      name={member.atleta.apelido || member.atleta.nome}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold text-white">
                        {member.atleta.apelido || member.atleta.nome}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                        Reserva
                      </p>
                    </div>
                  </>
                )

                if (isInteractive) {
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => onSlotClick?.(BENCH_SLOT, member)}
                      className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition-all ${theme.slot}`}
                    >
                      {content}
                    </button>
                  )
                }

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                  >
                    {content}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

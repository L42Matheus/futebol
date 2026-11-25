import type { ComponentType } from 'react'
import { Plus, Shield, Users } from 'lucide-react'
import Avatar from '../../components/Avatar'
import type { Formation, PositionSlot } from './tipos'
import { distribuirNosSlots } from './distribuir'

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

interface PainelTimeProps {
  teamName: string
  members: TeamMember[]
  formation: Formation
  // Desenho do campo/quadra do esporte e a modalidade (ex.: vôlei de quadra ou de areia).
  Fundo: ComponentType<{ tipo: string }>
  tipo: string
  local: string
  color?: 'green' | 'blue' | 'red'
  side?: 'left' | 'right'
  onSlotClick?: (slot: PositionSlot, currentPlayer?: TeamMember) => void
  showBench?: boolean
  showMeta?: boolean
  // Gols de cada atleta na partida ao vivo entre os dois times (atleta_id -> gols).
  gols?: Record<number, number>
  IconePonto?: ComponentType<{ size?: number; className?: string }>
  // Quadra dividida (vôlei): os dois times no mesmo desenho, um de cada lado da rede.
  // `rival` é o time do outro lado; null deixa a metade de cima esperando adversário.
  rival?: TimeRival | null
}

export interface TimeRival {
  teamName: string
  members: TeamMember[]
  formation: Formation
  color: 'green' | 'blue' | 'red'
  onSlotClick?: (slot: PositionSlot, currentPlayer?: TeamMember) => void
}

type Tema = (typeof colorThemes)[keyof typeof colorThemes]
type IconeDoPonto = ComponentType<{ size?: number; className?: string }>

const BENCH_SLOT: PositionSlot = { id: 'bench', label: 'BANCO', top: '0', left: '0' }

const colorThemes = {
  green: {
    header: 'from-emerald-500 via-emerald-400 to-lime-300',
    chip: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/20',
    accent: 'bg-emerald-400/70',
    slot: 'hover:border-emerald-300/70 hover:bg-emerald-400/10',
    empty: 'border-emerald-200/35 text-emerald-100/80',
    benchAction: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    ponto: 'bg-emerald-400',
  },
  blue: {
    header: 'from-sky-500 via-blue-400 to-cyan-300',
    chip: 'bg-sky-500/15 text-sky-100 border-sky-300/20',
    accent: 'bg-sky-300/70',
    slot: 'hover:border-sky-300/70 hover:bg-sky-400/10',
    empty: 'border-sky-200/35 text-sky-100/80',
    benchAction: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
    ponto: 'bg-sky-400',
  },
  red: {
    header: 'from-rose-500 via-red-400 to-orange-300',
    chip: 'bg-rose-500/15 text-rose-100 border-rose-300/20',
    accent: 'bg-rose-300/70',
    slot: 'hover:border-rose-300/70 hover:bg-rose-400/10',
    empty: 'border-rose-200/35 text-rose-100/80',
    benchAction: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
    ponto: 'bg-rose-400',
  },
}

function getShortName(name: string) {
  return name.split(' ')[0]
}

// Cada titular na sua vaga: quem já tem vaga escolhida, depois pela posição do atleta, o gol por último.
function distribuir(members: TeamMember[], formation: Formation) {
  return distribuirNosSlots(members.filter((m) => m.is_titular), formation)
}

interface VagasProps {
  members: TeamMember[]
  formation: Formation
  theme: Tema
  // Espelha a altura (Time B no desenho próprio) e, na quadra dividida, também os lados.
  espelharTopo: boolean
  espelharLados: boolean
  onSlotClick?: (slot: PositionSlot, currentPlayer?: TeamMember) => void
  gols: Record<number, number>
  IconePonto?: IconeDoPonto
}

function Vagas({ members, formation, theme, espelharTopo, espelharLados, onSlotClick, gols, IconePonto }: VagasProps) {
  const playersBySlot = distribuir(members, formation)
  const isInteractive = Boolean(onSlotClick)
  const fieldAvatarSize = formation.positions.length > 7 ? 'sm' : 'md'
  const espelhar = (valor: string, ativo: boolean) => (ativo ? `${100 - parseFloat(valor)}%` : valor)
  const bolinhas = (atletaId: number) =>
    IconePonto ? <BolinhasGol quantidade={gols[atletaId] ?? 0} Icone={IconePonto} /> : null

  return (
    <>
      {formation.positions.map((slot) => {
        const player = playersBySlot[slot.id]
        const cartao = player && (
          <>
            <div className="relative">
              <Avatar
                src={player.atleta.foto_url}
                name={player.atleta.apelido || player.atleta.nome}
                size={fieldAvatarSize}
                className={`ring-2 ring-white/80 ${isInteractive ? 'transition-all group-hover:ring-white' : ''}`}
              />
              {bolinhas(player.atleta.id)}
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
          </>
        )

        return (
          <div
            key={slot.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: espelhar(slot.top, espelharTopo), left: espelhar(slot.left, espelharLados) }}
          >
            {player ? (
              isInteractive ? (
                <button
                  type="button"
                  onClick={() => onSlotClick?.(slot, player)}
                  className={`group flex w-20 flex-col items-center rounded-2xl border border-white/10 bg-slate-950/35 px-2 py-2 shadow-lg shadow-black/20 backdrop-blur-sm transition-all ${theme.slot}`}
                >
                  {cartao}
                </button>
              ) : (
                <div className="flex w-20 flex-col items-center rounded-2xl border border-white/10 bg-slate-950/30 px-2 py-2 shadow-lg shadow-black/20 backdrop-blur-sm">
                  {cartao}
                </div>
              )
            ) : isInteractive ? (
              <button
                type="button"
                onClick={() => onSlotClick?.(slot)}
                aria-label={`Escalar ${slot.label}`}
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
    </>
  )
}

interface BancoProps {
  members: TeamMember[]
  theme: Tema
  // Na quadra dividida cada banco leva o nome do time.
  titulo?: string
  onSlotClick?: (slot: PositionSlot, currentPlayer?: TeamMember) => void
  gols: Record<number, number>
  IconePonto?: IconeDoPonto
}

function Banco({ members, theme, titulo, onSlotClick, gols, IconePonto }: BancoProps) {
  const reservas = members.filter((m) => !m.is_titular)
  const isInteractive = Boolean(onSlotClick)

  return (
    <div className="space-y-3 bg-painel px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-white/70">
            <Users size={16} />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-xs font-black uppercase tracking-[0.3em] text-white/45">
              {titulo && <span className={`h-2 w-2 shrink-0 rounded-full ${theme.ponto}`} />}
              <span className="truncate">{titulo ? `Banco · ${titulo}` : 'Banco'}</span>
            </p>
            <p className="text-sm font-semibold text-white">
              {reservas.length} reserva{reservas.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {isInteractive && (
          <button
            type="button"
            onClick={() => onSlotClick?.(BENCH_SLOT)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${theme.benchAction}`}
          >
            <Plus size={14} />
            {titulo ? 'Reserva' : 'Adicionar reserva'}
          </button>
        )}
      </div>

      {reservas.length === 0 ? (
        !titulo && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-center text-sm text-white/45">
            Nenhum reserva no banco
          </div>
        )
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {reservas.map(member => {
            const content = (
              <>
                <div className="relative shrink-0">
                  <Avatar
                    src={member.atleta.foto_url}
                    name={member.atleta.apelido || member.atleta.nome}
                    size="sm"
                  />
                  {IconePonto && <BolinhasGol quantidade={gols[member.atleta.id] ?? 0} Icone={IconePonto} />}
                </div>
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
  )
}

// Faixa com o nome do time acima ou abaixo da quadra dividida: fora do desenho, para não cobrir as vagas.
function FaixaTime({ nome, theme, detalhe }: { nome: string; theme: Tema; detalhe: string }) {
  return (
    <div className="flex items-center gap-2 bg-painel px-4 py-2.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.ponto}`} />
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{nome}</p>
      <p className="shrink-0 text-xs text-white/50">{detalhe}</p>
    </div>
  )
}

export default function PainelTime({
  teamName,
  members,
  formation,
  Fundo,
  tipo,
  local,
  color = 'green',
  side = 'left',
  onSlotClick,
  showBench = true,
  showMeta = true,
  gols = {},
  IconePonto,
  rival,
}: PainelTimeProps) {
  const titulares = members.filter(m => m.is_titular)
  const reservas = members.filter(m => !m.is_titular)
  const theme = colorThemes[color]
  // undefined = desenho só deste time; null ou um time = quadra dividida.
  const dividida = rival !== undefined
  const temaRival = rival ? colorThemes[rival.color] : null

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-painel shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {showMeta && !dividida && (
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
                {formation.positions.length} em {local}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70">
                {reservas.length} no banco
              </span>
            </div>
          </div>
        </div>
      )}

      {rival && temaRival && (
        <FaixaTime nome={rival.teamName} theme={temaRival} detalhe={`${rival.members.filter((m) => m.is_titular).length} em ${local}`} />
      )}

      {/* O desenho é sempre colorido: textos dos jogadores ficam claros em qualquer tema. */}
      <div className={`tema-escuro relative overflow-hidden ${dividida ? 'aspect-[5/8]' : 'aspect-[3/4]'} ${showBench && !dividida ? 'border-b border-white/10' : ''}`}>
        <Fundo tipo={tipo} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.10),_transparent_58%)]" />

        {!dividida && (
          <>
            <div className={`absolute left-4 top-4 h-16 w-16 rounded-full blur-2xl ${theme.accent}`} />
            <div className="absolute bottom-5 right-5 h-20 w-20 rounded-full bg-black/20 blur-3xl" />
          </>
        )}

        {rival === null && (
          <p className="absolute inset-x-6 top-[22%] rounded-2xl border border-dashed border-white/40 bg-slate-950/25 px-4 py-4 text-center text-sm font-semibold text-white/85 backdrop-blur-sm">
            Aguardando um time adversário
          </p>
        )}

        <Vagas
          members={members}
          formation={formation}
          theme={theme}
          espelharTopo={!dividida && side === 'right'}
          espelharLados={false}
          onSlotClick={onSlotClick}
          gols={gols}
          IconePonto={IconePonto}
        />
        {rival && temaRival && (
          <Vagas
            members={rival.members}
            formation={rival.formation}
            theme={temaRival}
            espelharTopo
            espelharLados
            onSlotClick={rival.onSlotClick}
            gols={gols}
            IconePonto={IconePonto}
          />
        )}
      </div>

      {dividida && <FaixaTime nome={teamName} theme={theme} detalhe={`${titulares.length} em ${local}`} />}

      {showBench && (
        <div className="divide-y divide-white/10 border-t border-white/10">
          <Banco
            members={members}
            theme={theme}
            titulo={dividida ? teamName : undefined}
            onSlotClick={onSlotClick}
            gols={gols}
            IconePonto={IconePonto}
          />
          {rival && temaRival && (
            <Banco
              members={rival.members}
              theme={temaRival}
              titulo={rival.teamName}
              onSlotClick={rival.onSlotClick}
              gols={gols}
              IconePonto={IconePonto}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Uma bolinha por gol no canto da foto; a partir de 4 mostra o número.
function BolinhasGol({ quantidade, Icone }: { quantidade: number; Icone: ComponentType<{ size?: number; className?: string }> }) {
  if (quantidade <= 0) return null
  const visiveis = Math.min(quantidade, 3)
  return (
    <span className="absolute -right-2 -top-2 flex items-center" aria-label={`${quantidade} gol${quantidade > 1 ? 's' : ''}`}>
      {Array.from({ length: visiveis }).map((_, i) => (
        <span
          key={i}
          className={`flex h-5 w-5 items-center justify-center rounded-full bg-branco text-slate-900 shadow-md ring-1 ring-black/10 ${i > 0 ? '-ml-2' : ''}`}
        >
          <Icone size={13} />
        </span>
      ))}
      {quantidade > 3 && (
        <span className="-ml-1 rounded-full bg-emerald-500 px-1 text-[9px] font-black text-branco shadow-md">{quantidade}</span>
      )}
    </span>
  )
}

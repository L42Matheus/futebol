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
}

export default function SoccerField({
  teamName,
  members,
  formation,
  color = 'green',
  side = 'left',
  onSlotClick,
  showBench = true
}: SoccerFieldProps) {
  // Separa titulares e reservas
  const titulares = members.filter(m => m.is_titular)
  const reservas = members.filter(m => !m.is_titular)

  // Mapeia jogadores por slot (usando posicao_escalacao como slot id)
  const playersBySlot: Record<string, TeamMember> = {}
  titulares.forEach((member, index) => {
    // Se o jogador tem posição definida, usa ela
    if (member.posicao_escalacao) {
      // Procura um slot com esse id ou label
      const slot = formation.positions.find(
        p => p.id === member.posicao_escalacao || p.label === member.posicao_escalacao?.toUpperCase()
      )
      if (slot && !playersBySlot[slot.id]) {
        playersBySlot[slot.id] = member
        return
      }
    }
    // Senão, coloca no primeiro slot disponível
    for (const slot of formation.positions) {
      if (!playersBySlot[slot.id]) {
        playersBySlot[slot.id] = member
        break
      }
    }
  })

  // Cor do time
  const colorClasses = {
    green: 'from-emerald-600 to-emerald-500',
    blue: 'from-blue-600 to-blue-500',
    red: 'from-red-600 to-red-500',
  }

  // Inverte posições se for o lado direito (time adversário)
  const getTop = (top: string) => {
    if (side === 'right') {
      const value = parseInt(top)
      return `${100 - value}%`
    }
    return top
  }

  return (
    <div className="flex flex-col">
      {/* Nome do time */}
      <div className={`text-center py-2 px-4 rounded-t-xl bg-gradient-to-r ${colorClasses[color]} text-white font-bold`}>
        {teamName}
      </div>

      {/* Campo */}
      <div className="relative bg-gradient-to-b from-green-600 to-green-500 rounded-b-xl aspect-[3/4] border-4 border-green-700 overflow-hidden">
        {/* Linhas do campo */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 130" preserveAspectRatio="none">
          {/* Linha central */}
          <line x1="0" y1="65" x2="100" y2="65" stroke="white" strokeWidth="0.5" opacity="0.5" />
          {/* Círculo central */}
          <circle cx="50" cy="65" r="12" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
          {/* Área grande (gol de baixo) */}
          <rect x="20" y="105" width="60" height="20" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
          {/* Área pequena (gol de baixo) */}
          <rect x="35" y="115" width="30" height="10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
          {/* Área grande (gol de cima) */}
          <rect x="20" y="5" width="60" height="20" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
          {/* Área pequena (gol de cima) */}
          <rect x="35" y="5" width="30" height="10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
        </svg>

        {/* Slots de posição */}
        {formation.positions.map((slot) => {
          const player = playersBySlot[slot.id]

          return (
            <div
              key={slot.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{
                top: getTop(slot.top),
                left: slot.left,
              }}
            >
              {player ? (
                <button
                  onClick={() => onSlotClick?.(slot, player)}
                  className="flex flex-col items-center group"
                >
                  <div className="relative">
                    <Avatar
                      src={player.atleta.foto_url}
                      name={player.atleta.apelido || player.atleta.nome}
                      size="sm"
                      className="ring-2 ring-white shadow-lg group-hover:ring-yellow-400 transition-all"
                    />
                    {player.atleta.numero_camisa && (
                      <span className="absolute -bottom-1 -right-1 bg-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center text-gray-800 shadow">
                        {player.atleta.numero_camisa}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-white font-medium mt-1 drop-shadow-md max-w-[60px] truncate">
                    {player.atleta.apelido || player.atleta.nome.split(' ')[0]}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => onSlotClick?.(slot, undefined)}
                  className="flex flex-col items-center opacity-50 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/70 flex items-center justify-center bg-black/10">
                    <span className="text-[8px] text-white font-bold">{slot.label}</span>
                  </div>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Banco de reservas */}
      {showBench && (
        <div className="mt-3 p-3 bg-gray-100 rounded-xl">
          <p className="text-xs text-gray-500 font-medium mb-2">Banco ({reservas.length})</p>
          <div className="flex flex-wrap gap-2">
            {reservas.length === 0 ? (
              <span className="text-xs text-gray-400">Nenhum reserva</span>
            ) : (
              reservas.map(member => (
                <button
                  key={member.id}
                  onClick={() => onSlotClick?.({ id: 'bench', label: 'BANCO', top: '0', left: '0' }, member)}
                  className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <Avatar
                    src={member.atleta.foto_url}
                    name={member.atleta.apelido || member.atleta.nome}
                    size="xs"
                  />
                  <span className="text-xs text-gray-700">
                    {member.atleta.apelido || member.atleta.nome.split(' ')[0]}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

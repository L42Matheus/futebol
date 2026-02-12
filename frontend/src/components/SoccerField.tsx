import Avatar from './Avatar'

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
  color?: 'green' | 'blue' | 'red'
  side?: 'left' | 'right'
  onPlayerClick?: (member: TeamMember) => void
  showBench?: boolean
}

// Mapeamento de posições para coordenadas no campo (em %)
const positionCoords: Record<string, { top: string; slots: { left: string }[] }> = {
  goleiro: { top: '85%', slots: [{ left: '50%' }] },
  zagueiro: { top: '70%', slots: [{ left: '30%' }, { left: '50%' }, { left: '70%' }] },
  lateral: { top: '55%', slots: [{ left: '15%' }, { left: '85%' }] },
  volante: { top: '50%', slots: [{ left: '35%' }, { left: '65%' }] },
  meia: { top: '35%', slots: [{ left: '25%' }, { left: '50%' }, { left: '75%' }] },
  atacante: { top: '15%', slots: [{ left: '35%' }, { left: '65%' }] },
  ponta: { top: '20%', slots: [{ left: '15%' }, { left: '85%' }] },
}

const posicaoLabels: Record<string, string> = {
  goleiro: 'GOL',
  zagueiro: 'ZAG',
  lateral: 'LAT',
  volante: 'VOL',
  meia: 'MEI',
  atacante: 'ATA',
  ponta: 'PON',
}

export default function SoccerField({
  teamName,
  members,
  color = 'green',
  side = 'left',
  onPlayerClick,
  showBench = true
}: SoccerFieldProps) {
  // Separa titulares e reservas
  const titulares = members.filter(m => m.is_titular)
  const reservas = members.filter(m => !m.is_titular)

  // Agrupa titulares por posição
  const playersByPosition: Record<string, TeamMember[]> = {}
  titulares.forEach(member => {
    const pos = member.posicao_escalacao || member.atleta.posicao
    if (!playersByPosition[pos]) {
      playersByPosition[pos] = []
    }
    playersByPosition[pos].push(member)
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

        {/* Jogadores no campo */}
        {Object.entries(positionCoords).map(([posicao, coords]) => {
          const playersInPosition = playersByPosition[posicao] || []
          const slots = coords.slots

          return slots.map((slot, slotIndex) => {
            const player = playersInPosition[slotIndex]

            return (
              <div
                key={`${posicao}-${slotIndex}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{
                  top: getTop(coords.top),
                  left: slot.left,
                }}
              >
                {player ? (
                  <button
                    onClick={() => onPlayerClick?.(player)}
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
                  <div className="flex flex-col items-center opacity-40">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center">
                      <span className="text-[8px] text-white/70">{posicaoLabels[posicao]}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
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
                  onClick={() => onPlayerClick?.(member)}
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

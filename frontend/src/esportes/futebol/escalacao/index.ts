import type { EscalacaoEsporte } from '../../escalacao/tipos'
import CampoFutebol from './Campo'
import { getFormations, getPlayerCount, type GameType } from './formations'

const DESCRICOES: Record<GameType, string> = {
  campo: 'Escalação completa com 11 jogadores e banco amplo.',
  society: 'Campo reduzido, de 5 a 8 por time.',
  futsal: 'Quadra curta, cinco peças e rotações rápidas.',
}

export const escalacaoFutebol: EscalacaoEsporte = {
  formacoes: (tipo, tamanho) => getFormations(tipo as GameType, tamanho),
  jogadoresPorTime: (tipo, tamanho) => getPlayerCount(tipo as GameType, tamanho),
  Fundo: CampoFutebol,
  local: 'campo',
  descricao: (tipo) => DESCRICOES[tipo as GameType] ?? '',
}

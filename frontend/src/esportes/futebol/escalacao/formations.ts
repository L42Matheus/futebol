// Configurações de formações por tipo de jogo

export type GameType = 'campo' | 'society' | 'futsal'

export interface PositionSlot {
  id: string
  label: string
  top: string
  left: string
}

export interface Formation {
  id: string
  name: string
  positions: PositionSlot[]
}

// ========== CAMPO (11 jogadores) ==========
const campo_4_3_3: Formation = {
  id: '4-3-3',
  name: '4-3-3',
  positions: [
    { id: 'gol', label: 'GOL', top: '90%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '75%', left: '30%' },
    { id: 'zag2', label: 'ZAG', top: '75%', left: '70%' },
    { id: 'lat1', label: 'LAT', top: '70%', left: '10%' },
    { id: 'lat2', label: 'LAT', top: '70%', left: '90%' },
    { id: 'vol1', label: 'VOL', top: '50%', left: '30%' },
    { id: 'vol2', label: 'VOL', top: '50%', left: '50%' },
    { id: 'vol3', label: 'VOL', top: '50%', left: '70%' },
    { id: 'ata1', label: 'PON', top: '25%', left: '15%' },
    { id: 'ata2', label: 'ATA', top: '20%', left: '50%' },
    { id: 'ata3', label: 'PON', top: '25%', left: '85%' },
  ]
}

const campo_4_4_2: Formation = {
  id: '4-4-2',
  name: '4-4-2',
  positions: [
    { id: 'gol', label: 'GOL', top: '90%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '75%', left: '30%' },
    { id: 'zag2', label: 'ZAG', top: '75%', left: '70%' },
    { id: 'lat1', label: 'LAT', top: '70%', left: '10%' },
    { id: 'lat2', label: 'LAT', top: '70%', left: '90%' },
    { id: 'mei1', label: 'MEI', top: '50%', left: '15%' },
    { id: 'mei2', label: 'MEI', top: '50%', left: '38%' },
    { id: 'mei3', label: 'MEI', top: '50%', left: '62%' },
    { id: 'mei4', label: 'MEI', top: '50%', left: '85%' },
    { id: 'ata1', label: 'ATA', top: '22%', left: '35%' },
    { id: 'ata2', label: 'ATA', top: '22%', left: '65%' },
  ]
}

const campo_3_5_2: Formation = {
  id: '3-5-2',
  name: '3-5-2',
  positions: [
    { id: 'gol', label: 'GOL', top: '90%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '75%', left: '25%' },
    { id: 'zag2', label: 'ZAG', top: '75%', left: '50%' },
    { id: 'zag3', label: 'ZAG', top: '75%', left: '75%' },
    { id: 'mei1', label: 'LAT', top: '55%', left: '10%' },
    { id: 'mei2', label: 'VOL', top: '55%', left: '30%' },
    { id: 'mei3', label: 'MEI', top: '50%', left: '50%' },
    { id: 'mei4', label: 'VOL', top: '55%', left: '70%' },
    { id: 'mei5', label: 'LAT', top: '55%', left: '90%' },
    { id: 'ata1', label: 'ATA', top: '22%', left: '35%' },
    { id: 'ata2', label: 'ATA', top: '22%', left: '65%' },
  ]
}

const campo_4_2_3_1: Formation = {
  id: '4-2-3-1',
  name: '4-2-3-1',
  positions: [
    { id: 'gol', label: 'GOL', top: '90%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '75%', left: '30%' },
    { id: 'zag2', label: 'ZAG', top: '75%', left: '70%' },
    { id: 'lat1', label: 'LAT', top: '70%', left: '10%' },
    { id: 'lat2', label: 'LAT', top: '70%', left: '90%' },
    { id: 'vol1', label: 'VOL', top: '55%', left: '35%' },
    { id: 'vol2', label: 'VOL', top: '55%', left: '65%' },
    { id: 'mei1', label: 'PON', top: '38%', left: '15%' },
    { id: 'mei2', label: 'MEI', top: '35%', left: '50%' },
    { id: 'mei3', label: 'PON', top: '38%', left: '85%' },
    { id: 'ata1', label: 'ATA', top: '18%', left: '50%' },
  ]
}

// ========== SOCIETY (7 jogadores) ==========
const society_3_2_1: Formation = {
  id: '3-2-1',
  name: '3-2-1',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '70%', left: '20%' },
    { id: 'zag2', label: 'ZAG', top: '70%', left: '50%' },
    { id: 'zag3', label: 'ZAG', top: '70%', left: '80%' },
    { id: 'mei1', label: 'MEI', top: '45%', left: '30%' },
    { id: 'mei2', label: 'MEI', top: '45%', left: '70%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '50%' },
  ]
}

const society_2_3_1: Formation = {
  id: '2-3-1',
  name: '2-3-1',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '70%', left: '30%' },
    { id: 'zag2', label: 'ZAG', top: '70%', left: '70%' },
    { id: 'mei1', label: 'MEI', top: '45%', left: '20%' },
    { id: 'mei2', label: 'MEI', top: '45%', left: '50%' },
    { id: 'mei3', label: 'MEI', top: '45%', left: '80%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '50%' },
  ]
}

const society_2_2_2: Formation = {
  id: '2-2-2',
  name: '2-2-2',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '70%', left: '30%' },
    { id: 'zag2', label: 'ZAG', top: '70%', left: '70%' },
    { id: 'mei1', label: 'MEI', top: '45%', left: '30%' },
    { id: 'mei2', label: 'MEI', top: '45%', left: '70%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '30%' },
    { id: 'ata2', label: 'ATA', top: '20%', left: '70%' },
  ]
}

const society_1_3_2: Formation = {
  id: '1-3-2',
  name: '1-3-2',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '70%', left: '50%' },
    { id: 'mei1', label: 'MEI', top: '45%', left: '20%' },
    { id: 'mei2', label: 'MEI', top: '45%', left: '50%' },
    { id: 'mei3', label: 'MEI', top: '45%', left: '80%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '35%' },
    { id: 'ata2', label: 'ATA', top: '20%', left: '65%' },
  ]
}

// ========== SOCIETY 5v5 ==========
const society5_2_1_1: Formation = {
  id: '2-1-1',
  name: '2-1-1',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '65%', left: '30%' },
    { id: 'zag2', label: 'ZAG', top: '65%', left: '70%' },
    { id: 'mei1', label: 'MEI', top: '42%', left: '50%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '50%' },
  ]
}

const society5_1_2_1: Formation = {
  id: '1-2-1',
  name: '1-2-1',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '65%', left: '50%' },
    { id: 'mei1', label: 'MEI', top: '42%', left: '30%' },
    { id: 'mei2', label: 'MEI', top: '42%', left: '70%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '50%' },
  ]
}

// ========== SOCIETY 6v6 ==========
const society6_2_2_1: Formation = {
  id: '2-2-1',
  name: '2-2-1',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '68%', left: '30%' },
    { id: 'zag2', label: 'ZAG', top: '68%', left: '70%' },
    { id: 'mei1', label: 'MEI', top: '43%', left: '30%' },
    { id: 'mei2', label: 'MEI', top: '43%', left: '70%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '50%' },
  ]
}

const society6_3_2: Formation = {
  id: '3-2',
  name: '3-2',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '65%', left: '22%' },
    { id: 'zag2', label: 'ZAG', top: '65%', left: '50%' },
    { id: 'zag3', label: 'ZAG', top: '65%', left: '78%' },
    { id: 'ata1', label: 'ATA', top: '25%', left: '35%' },
    { id: 'ata2', label: 'ATA', top: '25%', left: '65%' },
  ]
}

const society6_2_3: Formation = {
  id: '2-3',
  name: '2-3',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '65%', left: '30%' },
    { id: 'zag2', label: 'ZAG', top: '65%', left: '70%' },
    { id: 'mei1', label: 'MEI', top: '38%', left: '22%' },
    { id: 'ata1', label: 'ATA', top: '25%', left: '50%' },
    { id: 'mei2', label: 'MEI', top: '38%', left: '78%' },
  ]
}

// ========== SOCIETY 8v8 ==========
const society8_3_3_1: Formation = {
  id: '3-3-1',
  name: '3-3-1',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '70%', left: '22%' },
    { id: 'zag2', label: 'ZAG', top: '70%', left: '50%' },
    { id: 'zag3', label: 'ZAG', top: '70%', left: '78%' },
    { id: 'mei1', label: 'MEI', top: '45%', left: '22%' },
    { id: 'mei2', label: 'MEI', top: '45%', left: '50%' },
    { id: 'mei3', label: 'MEI', top: '45%', left: '78%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '50%' },
  ]
}

const society8_3_2_2: Formation = {
  id: '3-2-2',
  name: '3-2-2',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '70%', left: '22%' },
    { id: 'zag2', label: 'ZAG', top: '70%', left: '50%' },
    { id: 'zag3', label: 'ZAG', top: '70%', left: '78%' },
    { id: 'mei1', label: 'MEI', top: '45%', left: '30%' },
    { id: 'mei2', label: 'MEI', top: '45%', left: '70%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '30%' },
    { id: 'ata2', label: 'ATA', top: '20%', left: '70%' },
  ]
}

const society8_2_3_2: Formation = {
  id: '2-3-2',
  name: '2-3-2',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'zag1', label: 'ZAG', top: '70%', left: '30%' },
    { id: 'zag2', label: 'ZAG', top: '70%', left: '70%' },
    { id: 'mei1', label: 'MEI', top: '45%', left: '20%' },
    { id: 'mei2', label: 'MEI', top: '45%', left: '50%' },
    { id: 'mei3', label: 'MEI', top: '45%', left: '80%' },
    { id: 'ata1', label: 'ATA', top: '20%', left: '32%' },
    { id: 'ata2', label: 'ATA', top: '20%', left: '68%' },
  ]
}

// ========== FUTSAL (5 jogadores) ==========
const futsal_2_2: Formation = {
  id: '2-2',
  name: '2-2',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'fix1', label: 'FIX', top: '60%', left: '30%' },
    { id: 'fix2', label: 'FIX', top: '60%', left: '70%' },
    { id: 'ala1', label: 'ALA', top: '30%', left: '30%' },
    { id: 'ala2', label: 'ALA', top: '30%', left: '70%' },
  ]
}

const futsal_1_2_1: Formation = {
  id: '1-2-1',
  name: '1-2-1 (Quadrado)',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'fix1', label: 'FIX', top: '65%', left: '50%' },
    { id: 'ala1', label: 'ALA', top: '45%', left: '25%' },
    { id: 'ala2', label: 'ALA', top: '45%', left: '75%' },
    { id: 'piv1', label: 'PIV', top: '22%', left: '50%' },
  ]
}

const futsal_3_1: Formation = {
  id: '3-1',
  name: '3-1',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'fix1', label: 'FIX', top: '60%', left: '20%' },
    { id: 'fix2', label: 'FIX', top: '60%', left: '50%' },
    { id: 'fix3', label: 'FIX', top: '60%', left: '80%' },
    { id: 'piv1', label: 'PIV', top: '25%', left: '50%' },
  ]
}

const futsal_4_0: Formation = {
  id: '4-0',
  name: '4-0 (Sem pivô)',
  positions: [
    { id: 'gol', label: 'GOL', top: '88%', left: '50%' },
    { id: 'fix1', label: 'FIX', top: '55%', left: '20%' },
    { id: 'fix2', label: 'FIX', top: '55%', left: '80%' },
    { id: 'ala1', label: 'ALA', top: '30%', left: '30%' },
    { id: 'ala2', label: 'ALA', top: '30%', left: '70%' },
  ]
}

// Tamanhos suportados por tipo (atletas em campo por time)
export const SUPPORTED_SIZES: Record<GameType, number[]> = {
  campo: [11],
  society: [5, 6, 7, 8],
  futsal: [5],
}

export const DEFAULT_SIZE: Record<GameType, number> = {
  campo: 11,
  society: 7,
  futsal: 5,
}

// Formações organizadas por tipo e tamanho (atletas em campo, sem reservas)
const formationsByTypeAndSize: Record<GameType, Record<number, Formation[]>> = {
  campo: {
    11: [campo_4_3_3, campo_4_4_2, campo_3_5_2, campo_4_2_3_1],
  },
  society: {
    5: [society5_2_1_1, society5_1_2_1],
    6: [society6_2_2_1, society6_3_2, society6_2_3],
    7: [society_3_2_1, society_2_3_1, society_2_2_2, society_1_3_2],
    8: [society8_3_3_1, society8_3_2_2, society8_2_3_2],
  },
  futsal: {
    5: [futsal_2_2, futsal_1_2_1, futsal_3_1, futsal_4_0],
  },
}

function resolveSize(gameType: GameType, size?: number | null): number {
  const supported = SUPPORTED_SIZES[gameType]
  if (size && supported.includes(size)) return size
  return DEFAULT_SIZE[gameType]
}

// Retorna formações disponíveis para o tipo + tamanho da escalação
export function getFormations(gameType: GameType, size?: number | null): Formation[] {
  const resolved = resolveSize(gameType, size)
  return formationsByTypeAndSize[gameType][resolved] ?? []
}

// Compat: alguns chamadores antigos esperam um array direto por tipo
export const formationsByType: Record<GameType, Formation[]> = {
  campo: formationsByTypeAndSize.campo[11],
  society: formationsByTypeAndSize.society[7],
  futsal: formationsByTypeAndSize.futsal[5],
}

// Formação padrão por tipo + tamanho
export function getDefaultFormationId(gameType: GameType, size?: number | null): string {
  const formations = getFormations(gameType, size)
  return formations[0]?.id ?? ''
}

export const defaultFormation: Record<GameType, string> = {
  campo: '4-3-3',
  society: '3-2-1',
  futsal: '2-2',
}

// Quantos jogadores em campo (por time) para o tipo e tamanho escolhidos
export function getPlayerCount(gameType: GameType, size?: number | null): number {
  return resolveSize(gameType, size)
}

export const playerCount: Record<GameType, number> = DEFAULT_SIZE

// Helper para obter uma formação específica
export function getFormation(
  gameType: GameType,
  formationId: string,
  size?: number | null,
): Formation | undefined {
  return getFormations(gameType, size).find(f => f.id === formationId)
}

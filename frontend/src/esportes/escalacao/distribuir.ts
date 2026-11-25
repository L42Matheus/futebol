import type { Formation } from './tipos'

// Siglas dos slots que servem para cada posição do atleta, da melhor para a pior.
// Cada racha tem um esporte só, então siglas repetidas entre esportes (ALA, PON, PIV) não se misturam.
const PREFERENCIAS: Record<string, string[]> = {
  // Futebol
  goleiro: ['GOL'],
  zagueiro: ['ZAG', 'FIX', 'DEF', 'LAT', 'VOL'],
  lateral: ['LAT', 'ALA', 'ZAG', 'DEF', 'MEI'],
  volante: ['VOL', 'MEI', 'FIX', 'DEF', 'ZAG'],
  meia: ['MEI', 'VOL', 'ALA', 'PON', 'ATA'],
  atacante: ['ATA', 'PON', 'PIV', 'MEI', 'ALA'],
  ponta: ['PON', 'ALA', 'ATA', 'MEI', 'LAT'],
  // Basquete
  armador: ['ARM', 'AA'],
  ala_armador: ['AA', 'ARM', 'ALA'],
  ala: ['ALA', 'AA', 'AP'],
  ala_pivo: ['AP', 'PIV', 'ALA'],
  pivo: ['PIV', 'AP'],
  // Vôlei
  levantador: ['LEV'],
  oposto: ['OPO', 'PON'],
  ponteiro: ['PON', 'OPO'],
  central: ['CEN'],
  libero: ['CEN', 'PON'],
}

// Sem goleiro no time, alguém vai pro gol, mas só depois de todas as outras vagas.
const POR_ULTIMO = new Set(['GOL'])

interface Titular {
  posicao_escalacao?: string | null
  atleta?: { posicao?: string | null } | null
}

// Coloca cada titular em um slot da formação.
// 1º quem já tem slot escolhido na escalação; 2º pela posição do atleta, em rodadas
// (todos tentam a 1ª opção antes de alguém ficar com a 2ª); 3º o resto nas vagas livres.
export function distribuirNosSlots<T extends Titular>(titulares: T[], formation: Formation): Record<string, T> {
  const porSlot: Record<string, T> = {}
  const livre = (id: string) => !porSlot[id]
  let pendentes: T[] = []

  for (const membro of titulares) {
    const escolhido = membro.posicao_escalacao
    const slot = escolhido
      ? formation.positions.find((p) => livre(p.id) && (p.id === escolhido || p.label === escolhido.toUpperCase()))
      : undefined
    if (slot) porSlot[slot.id] = membro
    else pendentes.push(membro)
  }

  const preferencias = (membro: T) =>
    PREFERENCIAS[(membro.posicao_escalacao || '').toLowerCase()] ??
    PREFERENCIAS[(membro.atleta?.posicao || '').toLowerCase()] ??
    []
  const rodadas = Math.max(0, ...pendentes.map((m) => preferencias(m).length))
  for (let rodada = 0; rodada < rodadas; rodada++) {
    pendentes = pendentes.filter((membro) => {
      const sigla = preferencias(membro)[rodada]
      const slot = sigla && formation.positions.find((p) => livre(p.id) && p.label === sigla)
      if (!slot) return true
      porSlot[slot.id] = membro
      return false
    })
  }

  const vagas = [
    ...formation.positions.filter((p) => !POR_ULTIMO.has(p.label)),
    ...formation.positions.filter((p) => POR_ULTIMO.has(p.label)),
  ]
  for (const membro of pendentes) {
    const slot = vagas.find((p) => livre(p.id))
    if (!slot) break
    porSlot[slot.id] = membro
  }
  return porSlot
}

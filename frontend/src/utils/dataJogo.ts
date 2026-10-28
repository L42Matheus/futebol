// data_hora do jogo vem sem fuso, no horário do racha ("2026-10-28T20:00:00").
// Monta a data local sem converter, para o horário aparecer igual em todas as telas.
export function parseDataJogo(dataHora: string): Date {
  const texto = String(dataHora)
  const [datePart, timePart] = texto.includes('T') ? texto.split('T') : texto.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = (timePart || '00:00').split(':').map(Number)
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0)
}

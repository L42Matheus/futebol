/**
 * Formats a date value to Brazilian format (dd/mm/yyyy).
 * Accepts a Date object, ISO string, or already-formatted string.
 */
export function formatDateBR(value: Date | string | null | undefined): string {
  if (!value) return ''

  if (value instanceof Date && !isNaN(value.getTime())) {
    const dd = String(value.getDate()).padStart(2, '0')
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const yyyy = value.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  if (typeof value === 'string') {
    if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return value
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [yyyy, mm, dd] = value.split('T')[0].split('-')
      return `${dd}/${mm}/${yyyy}`
    }
  }

  return value as string
}

/**
 * Formats a value in cents to BRL currency string.
 */
export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

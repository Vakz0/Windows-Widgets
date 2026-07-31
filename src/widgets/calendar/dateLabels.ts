export function monthShort(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'short' })
}

export function monthLong(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'long' })
}

export function monthTitleOf(date: Date): string {
  return `${monthLong(date)} ${date.getFullYear()}`
}

/** Numéro du jour, avec le mois affiché pour le 1er (« 1 août »). */
export function dayLabel(date: Date): string {
  if (date.getDate() === 1) return `1 ${monthShort(date)}`
  return String(date.getDate())
}

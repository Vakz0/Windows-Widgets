/** Local calendar day helpers (no I/O). */

export function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** YYYY-MM-DD in local timezone. */
export function toIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Alias kept for activity/focus call sites. */
export function todayKey(d: Date = new Date()): string {
  return toIsoDate(d)
}

export function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + deltaDays)
  return toIsoDate(d)
}

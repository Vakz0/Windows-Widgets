import type { ActivityCategory, ActivityDaySummary } from '../../vite-env'
import { shiftDate, todayKey } from '../../../shared/dates'
import { errMessage } from '../../../shared/errors'

export { todayKey, shiftDate, errMessage }

export const CATEGORY_ORDER: ActivityCategory[] = [
  'work',
  'entertainment',
  'communication',
  'system',
  'other',
  'afk',
]

export const EDITABLE_CATEGORIES: ActivityCategory[] = [
  'work',
  'entertainment',
  'communication',
  'system',
  'other',
]

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  work: 'Travail',
  entertainment: 'Divertissement',
  communication: 'Communication',
  system: 'Système',
  other: 'Autre',
  afk: 'AFK',
}

export const AFK_PRESETS = [
  { sec: 60, label: '1 min' },
  { sec: 120, label: '2 min' },
  { sec: 180, label: '3 min' },
  { sec: 300, label: '5 min' },
  { sec: 600, label: '10 min' },
] as const

export function formatDayTitle(date: string, today: string): string {
  if (date === today) return 'Aujourd’hui'
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, '0')}`
}

export function formatShortDuration(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMin = Math.max(1, Math.round(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m}m`
  return `${h}h${String(m).padStart(2, '0')}`
}

export function emptySummary(date = todayKey()): ActivityDaySummary {
  return {
    date,
    totalMs: 0,
    byCategory: {
      work: 0,
      entertainment: 0,
      communication: 0,
      system: 0,
      other: 0,
      afk: 0,
    },
    topApps: [],
    topSites: [],
    topProjects: [],
    paused: false,
    tracking: false,
    quality: {
      otherShare: 0,
      lowConfidenceShare: 0,
      unknownAppCount: 0,
      feedbackCountToday: 0,
    },
    current: null,
    urlHelperAvailable: true,
    mediaKeepAwake: false,
    topWatch: [],
    focusSession: null,
    topTasks: [],
  }
}


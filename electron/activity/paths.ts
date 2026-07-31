import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export function activityDir(): string {
  return path.join(app.getPath('userData'), 'activity')
}

export function daysDir(): string {
  return path.join(activityDir(), 'days')
}

export function settingsPath(): string {
  return path.join(activityDir(), 'settings.json')
}

export function rulesPath(): string {
  return path.join(activityDir(), 'rules.json')
}

export function feedbackPath(): string {
  return path.join(activityDir(), 'feedback.jsonl')
}

export function dayFile(date: string): string {
  return path.join(daysDir(), `${date}.jsonl`)
}

export function bridgeMetaPath(): string {
  return path.join(activityDir(), 'media-bridge.json')
}

export function watchPath(date: string): string {
  return path.join(daysDir(), `${date}.watch.json`)
}

export function focusSessionPath(): string {
  return path.join(activityDir(), 'focus-session.json')
}

export function focusJournalPath(): string {
  return path.join(activityDir(), 'focus-journal.jsonl')
}

export function ensureDirs(): void {
  fs.mkdirSync(daysDir(), { recursive: true })
}

export function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function listDayFilesInRange(from: string, to: string): Promise<string[]> {
  ensureDirs()
  const dir = daysDir()
  try {
    await fsp.access(dir)
  } catch {
    return []
  }
  const keys = new Set<string>()
  for (const f of await fsp.readdir(dir)) {
    const jsonl = f.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/)
    if (jsonl) keys.add(jsonl[1])
    const watch = f.match(/^(\d{4}-\d{2}-\d{2})\.watch\.json$/)
    if (watch) keys.add(watch[1])
  }
  return [...keys].filter((d) => d >= from && d <= to).sort()
}

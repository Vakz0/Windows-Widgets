import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import { isDayKey, todayKey } from '../../shared/dates'

export { isDayKey, todayKey }

export function activityDir(): string {
  return path.join(app.getPath('userData'), 'activity')
}

export function daysDir(): string {
  return path.join(activityDir(), 'days')
}

/** Resolve `segments` under `baseDir`, rejecting `..` and escapes outside the base. */
export function resolveWithin(baseDir: string, ...segments: string[]): string {
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..' || seg.includes('\0') || /[/\\]/.test(seg)) {
      throw new Error(`Invalid path segment: ${seg}`)
    }
  }
  const base = path.resolve(baseDir)
  const resolved = path.resolve(base, ...segments)
  const rel = path.relative(base, resolved)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path escapes base directory: ${resolved}`)
  }
  return resolved
}

/** Ensure an already-built path stays inside `baseDir`. */
export function assertWithin(baseDir: string, candidate: string): string {
  const base = path.resolve(baseDir)
  const resolved = path.resolve(candidate)
  const rel = path.relative(base, resolved)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path escapes base directory: ${resolved}`)
  }
  return resolved
}

export function settingsPath(): string {
  return resolveWithin(activityDir(), 'settings.json')
}

export function rulesPath(): string {
  return resolveWithin(activityDir(), 'rules.json')
}

export function feedbackPath(): string {
  return resolveWithin(activityDir(), 'feedback.jsonl')
}

export function dayFile(date: string): string {
  if (!isDayKey(date)) throw new Error(`Invalid day key: ${date}`)
  return resolveWithin(daysDir(), `${date}.jsonl`)
}

export function bridgeMetaPath(): string {
  return resolveWithin(activityDir(), 'media-bridge.json')
}

export function watchPath(date: string): string {
  if (!isDayKey(date)) throw new Error(`Invalid day key: ${date}`)
  return resolveWithin(daysDir(), `${date}.watch.json`)
}

export function focusSessionPath(): string {
  return resolveWithin(activityDir(), 'focus-session.json')
}

export function focusJournalPath(): string {
  return resolveWithin(activityDir(), 'focus-journal.jsonl')
}

export function ensureDirs(): void {
  fs.mkdirSync(daysDir(), { recursive: true })
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

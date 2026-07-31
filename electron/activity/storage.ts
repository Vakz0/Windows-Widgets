import fs from 'node:fs'
import fsp from 'node:fs/promises'
import type {
  ActivityFeedbackEntry,
  ActivityRules,
  ActivitySegment,
  ActivitySettings,
} from '../../shared/types'
import { rebuildCompiledPatterns, type CompiledTitlePattern } from './classifier'
import { DEFAULT_RULES, DEFAULT_SETTINGS } from './defaults'
import {
  dayFile,
  ensureDirs,
  feedbackPath,
  rulesPath,
  settingsPath,
  todayKey,
} from './paths'

let stateLoaded = false
let settings: ActivitySettings = { ...DEFAULT_SETTINGS }
let rules: ActivityRules = structuredClone(DEFAULT_RULES)
let compiledTitlePatterns: CompiledTitlePattern[] = []

/** In-memory day file cache — invalidate on write (poll path must not re-read JSONL every 2s). */
let dayCacheKey: string | null = null
let dayCacheSegments: ActivitySegment[] = []
let feedbackCountCache: { date: string; count: number } | null = null

function loadJsonFile<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return structuredClone(fallback)
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<T>
    return { ...structuredClone(fallback), ...raw } as T
  } catch (err) {
    console.debug('loadJsonFile: using fallback', err)
    return structuredClone(fallback)
  }
}

export async function saveJsonFile(file: string, data: unknown): Promise<void> {
  ensureDirs()
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export function mergeRules(raw: Partial<ActivityRules>): ActivityRules {
  return {
    appDefaults: { ...DEFAULT_RULES.appDefaults, ...(raw.appDefaults ?? {}) },
    titlePatterns:
      Array.isArray(raw.titlePatterns) && raw.titlePatterns.length
        ? raw.titlePatterns
        : DEFAULT_RULES.titlePatterns,
    userAppOverrides: { ...(raw.userAppOverrides ?? {}) },
    userDomainOverrides: { ...(raw.userDomainOverrides ?? {}) },
    ignoredApps: Array.isArray(raw.ignoredApps)
      ? raw.ignoredApps
      : [...(DEFAULT_RULES.ignoredApps ?? [])],
  }
}

function syncCompiledPatterns(): void {
  compiledTitlePatterns = rebuildCompiledPatterns(rules)
}

export async function loadActivityState(force = false): Promise<void> {
  if (stateLoaded && !force) return
  ensureDirs()
  settings = loadJsonFile(settingsPath(), DEFAULT_SETTINGS)
  rules = mergeRules(loadJsonFile(rulesPath(), DEFAULT_RULES))
  syncCompiledPatterns()
  if (!fs.existsSync(rulesPath())) {
    await saveJsonFile(rulesPath(), rules)
  }
  if (!fs.existsSync(settingsPath())) {
    await saveJsonFile(settingsPath(), settings)
  }
  stateLoaded = true
}

export function getSettings(): ActivitySettings {
  return settings
}

export function setSettings(next: ActivitySettings): void {
  settings = next
}

export function getRules(): ActivityRules {
  return rules
}

export function setRules(next: ActivityRules): void {
  rules = next
  syncCompiledPatterns()
}

export function getCompiledTitlePatterns(): CompiledTitlePattern[] {
  return compiledTitlePatterns
}

export async function saveSettings(): Promise<void> {
  await saveJsonFile(settingsPath(), settings)
}

export async function saveRules(): Promise<void> {
  await saveJsonFile(rulesPath(), rules)
  syncCompiledPatterns()
}

export function invalidateDayCache(date?: string): void {
  if (!date || date === dayCacheKey) {
    dayCacheKey = null
    dayCacheSegments = []
  }
}

export function clearStorageCaches(): void {
  dayCacheKey = null
  dayCacheSegments = []
  feedbackCountCache = null
}

export async function appendSegment(segment: ActivitySegment): Promise<void> {
  const start = new Date(segment.start)
  const end = new Date(segment.end)
  if (!(end.getTime() > start.getTime())) return

  ensureDirs()
  let cursor = start
  while (cursor < end) {
    const day = todayKey(cursor)
    const nextMidnight = new Date(cursor)
    nextMidnight.setHours(24, 0, 0, 0)
    const sliceEnd = end < nextMidnight ? end : nextMidnight
    const slice: ActivitySegment = {
      ...segment,
      start: cursor.toISOString(),
      end: sliceEnd.toISOString(),
    }
    await fsp.appendFile(dayFile(day), `${JSON.stringify(slice)}\n`, 'utf8')
    if (dayCacheKey === day) {
      dayCacheSegments.push(slice)
    } else {
      invalidateDayCache(day)
    }
    cursor = sliceEnd
  }
}

export async function readDaySegments(date: string): Promise<ActivitySegment[]> {
  if (dayCacheKey === date) return dayCacheSegments

  const file = dayFile(date)
  const out: ActivitySegment[] = []
  try {
    await fsp.access(file)
    for (const line of (await fsp.readFile(file, 'utf8')).split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        out.push(JSON.parse(trimmed) as ActivitySegment)
      } catch (err) {
        console.debug('readDaySegments: skip bad line', err)
      }
    }
  } catch {
    // file absent
  }
  dayCacheKey = date
  dayCacheSegments = out
  return out
}

export async function readFeedbackEntries(): Promise<ActivityFeedbackEntry[]> {
  const file = feedbackPath()
  try {
    await fsp.access(file)
  } catch {
    return []
  }
  const out: ActivityFeedbackEntry[] = []
  for (const line of (await fsp.readFile(file, 'utf8')).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      out.push(JSON.parse(trimmed) as ActivityFeedbackEntry)
    } catch (err) {
      console.debug('readFeedbackEntries: skip bad line', err)
    }
  }
  return out
}

export async function appendFeedback(entry: ActivityFeedbackEntry): Promise<void> {
  ensureDirs()
  await fsp.appendFile(feedbackPath(), `${JSON.stringify(entry)}\n`, 'utf8')
  const day = entry.at.slice(0, 10)
  if (feedbackCountCache?.date === day) {
    feedbackCountCache = { date: day, count: feedbackCountCache.count + 1 }
  } else {
    feedbackCountCache = null
  }
}

/** Sync cache read for summary builders — call warmFeedbackCount first on cold cache. */
export function countFeedbackOnDay(date: string): number {
  if (feedbackCountCache?.date === date) return feedbackCountCache.count
  return 0
}

/** Warm the sync feedback-count cache used by buildSummary. */
export async function warmFeedbackCount(date: string): Promise<number> {
  if (feedbackCountCache?.date === date) return feedbackCountCache.count
  const count = (await readFeedbackEntries()).filter((e) => e.at.slice(0, 10) === date).length
  feedbackCountCache = { date, count }
  return count
}

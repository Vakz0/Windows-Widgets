import fs from 'node:fs'
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
  } catch {
    return structuredClone(fallback)
  }
}

export function saveJsonFile(file: string, data: unknown): void {
  ensureDirs()
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
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

export function loadActivityState(force = false): void {
  if (stateLoaded && !force) return
  ensureDirs()
  settings = loadJsonFile(settingsPath(), DEFAULT_SETTINGS)
  rules = mergeRules(loadJsonFile(rulesPath(), DEFAULT_RULES))
  syncCompiledPatterns()
  if (!fs.existsSync(rulesPath())) {
    saveJsonFile(rulesPath(), rules)
  }
  if (!fs.existsSync(settingsPath())) {
    saveJsonFile(settingsPath(), settings)
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

export function saveSettings(): void {
  saveJsonFile(settingsPath(), settings)
}

export function saveRules(): void {
  saveJsonFile(rulesPath(), rules)
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

export function appendSegment(segment: ActivitySegment): void {
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
    fs.appendFileSync(dayFile(day), `${JSON.stringify(slice)}\n`, 'utf8')
    if (dayCacheKey === day) {
      dayCacheSegments.push(slice)
    } else {
      invalidateDayCache(day)
    }
    cursor = sliceEnd
  }
}

export function readDaySegments(date: string): ActivitySegment[] {
  if (dayCacheKey === date) return dayCacheSegments

  const file = dayFile(date)
  const out: ActivitySegment[] = []
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        out.push(JSON.parse(trimmed) as ActivitySegment)
      } catch {
        /* skip bad line */
      }
    }
  }
  dayCacheKey = date
  dayCacheSegments = out
  return out
}

export function readFeedbackEntries(): ActivityFeedbackEntry[] {
  const file = feedbackPath()
  if (!fs.existsSync(file)) return []
  const out: ActivityFeedbackEntry[] = []
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      out.push(JSON.parse(trimmed) as ActivityFeedbackEntry)
    } catch {
      /* skip */
    }
  }
  return out
}

export function appendFeedback(entry: ActivityFeedbackEntry): void {
  ensureDirs()
  fs.appendFileSync(feedbackPath(), `${JSON.stringify(entry)}\n`, 'utf8')
  const day = entry.at.slice(0, 10)
  if (feedbackCountCache?.date === day) {
    feedbackCountCache = { date: day, count: feedbackCountCache.count + 1 }
  } else {
    feedbackCountCache = null
  }
}

export function countFeedbackOnDay(date: string): number {
  if (feedbackCountCache?.date === date) return feedbackCountCache.count
  const count = readFeedbackEntries().filter((e) => e.at.slice(0, 10) === date).length
  feedbackCountCache = { date, count }
  return count
}

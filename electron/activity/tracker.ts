import fsp from 'node:fs/promises'
import path from 'node:path'
import { shell } from 'electron'
import type { ActivityDaySummary, ActivityRules, ActivitySettings } from '../../shared/types'
import {
  clearFocusJournalFile,
  ensureFocusSessionLoaded,
  getFocusSession,
  stopFocusSession,
} from '../focusSession'
import {
  invalidateWatchCache,
  isMediaKeepAwakeActive,
  getTopWatch,
  setMediaWatchListener,
  startMediaBridge,
  stopMediaBridge,
} from '../activityMediaBridge'
import { isActiveUrlHelperAvailable } from '../activityContext'
import { buildSummary, withPendingCurrent, type SummaryDeps } from './aggregator'
import { CATEGORIES, FOCUS_OFF_PROJECT_DWELL_MAX_SEC, FOCUS_OFF_PROJECT_DWELL_MIN_SEC, POLL_MS } from './defaults'
import { setExportHooks } from './export'
import { setFeedbackHooks } from './feedback'
import {
  daysDir,
  ensureDirs,
  feedbackPath,
  isDayKey,
  rulesPath,
  todayKey,
} from './paths'
import {
  clearPendingAndSession,
  closeOpenSegment,
  getOpenSegment,
  getPendingSwitch,
  liveOpenSegment,
  pollOnce,
  resetPollSessionState,
  setPollNotify,
  setPollRunning,
} from './poll'
import {
  clearStorageCaches,
  getRules,
  getSettings,
  loadActivityState,
  readDaySegments,
  countFeedbackOnDay,
  warmFeedbackCount,
  saveJsonFile,
  saveSettings,
  setSettings,
} from './storage'

let pollTimer: NodeJS.Timeout | null = null
let running = false
let lastSummary: ActivityDaySummary | null = null
let onUpdated: ((summary: ActivityDaySummary) => void) | null = null
let wired = false

function startPollLoop(): void {
  if (pollTimer) return
  void pollOnce()
  pollTimer = setInterval(() => {
    void pollOnce()
  }, POLL_MS)
}

function stopPollLoop(): void {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

function summaryDeps(): SummaryDeps {
  return {
    settings: getSettings(),
    running,
    userDomainOverrides: getRules().userDomainOverrides,
    countFeedbackOnDay,
    getTopWatch,
    getFocusSession,
    isMediaKeepAwakeActive,
    isActiveUrlHelperAvailable,
  }
}

async function emitSummary(): Promise<void> {
  const key = todayKey()
  await warmFeedbackCount(key)
  const pending = getPendingSwitch()?.segment ?? null
  lastSummary = withPendingCurrent(
    buildSummary(key, await readDaySegments(key), liveOpenSegment(), summaryDeps()),
    pending,
  )
  onUpdated?.(lastSummary)
}

function ensureWired(): void {
  if (wired) return
  setPollNotify(() => {
    void emitSummary()
  })
  setFeedbackHooks({
    emitSummary,
    getActivitySummary,
    getLastSummary: () => lastSummary,
  })
  setExportHooks({
    summaryDeps,
  })
  wired = true
}

export function setActivityUpdatedListener(
  cb: ((summary: ActivityDaySummary) => void) | null,
): void {
  onUpdated = cb
}

export async function startActivityTracker(): Promise<void> {
  ensureWired()
  if (running) return
  await loadActivityState()
  await ensureFocusSessionLoaded()
  running = true
  setPollRunning(true)
  setMediaWatchListener(() => {
    void emitSummary()
  })
  startMediaBridge()
  if (!getSettings().paused) {
    startPollLoop()
  }
  void emitSummary()
}

export function stopActivityTracker(): void {
  if (!running) return
  clearPendingAndSession()
  void closeOpenSegment()
  stopPollLoop()
  running = false
  setPollRunning(false)
  setMediaWatchListener(null)
  stopMediaBridge()
  void emitSummary()
}

export function isActivityTrackerRunning(): boolean {
  return running
}

export async function getActivitySummary(date?: string): Promise<ActivityDaySummary> {
  ensureWired()
  await loadActivityState()
  await ensureFocusSessionLoaded()
  const key = date && isDayKey(date) ? date : todayKey()
  await warmFeedbackCount(key)
  const live =
    running && !getSettings().paused && key === todayKey() ? liveOpenSegment() : null
  let summary = buildSummary(key, await readDaySegments(key), live, summaryDeps())
  if (key === todayKey()) {
    summary = withPendingCurrent(summary, getPendingSwitch()?.segment ?? null)
    lastSummary = summary
  }
  return summary
}

/** Contexte focus courant pour initialiser l’allowlist d’une session. */
export function getActivityFocusSeed(): {
  apps: string[]
  domains: string[]
  ideProjects: string[]
} {
  const live = liveOpenSegment() ?? getOpenSegment()
  const apps: string[] = []
  const domains: string[] = []
  const ideProjects: string[] = []
  if (live && !live.ignored && live.category !== 'afk') {
    if (live.app) apps.push(live.app)
    if (live.domain) domains.push(live.domain)
    if (live.projectName) ideProjects.push(live.projectName)
  }
  return { apps, domains, ideProjects }
}

/** Force un refresh du résumé (ex. changement de session focus). */
export function refreshActivitySummary(): void {
  if (running) void emitSummary()
}

export async function getActivitySettings(): Promise<ActivitySettings> {
  await loadActivityState()
  return { ...getSettings() }
}

export async function updateActivitySettings(patch: Partial<ActivitySettings>): Promise<ActivitySettings> {
  ensureWired()
  await loadActivityState()
  const settings = { ...getSettings() }
  const wasPaused = settings.paused
  if (typeof patch.paused === 'boolean') settings.paused = patch.paused
  if (typeof patch.storeTitles === 'boolean') settings.storeTitles = patch.storeTitles
  if (typeof patch.idleThresholdSec === 'number' && patch.idleThresholdSec >= 30) {
    settings.idleThresholdSec = Math.round(patch.idleThresholdSec)
  }
  if (
    patch.browserDetail === 'domain' ||
    patch.browserDetail === 'url' ||
    patch.browserDetail === 'off'
  ) {
    settings.browserDetail = patch.browserDetail
  }
  if (typeof patch.parseIdeTitles === 'boolean') {
    settings.parseIdeTitles = patch.parseIdeTitles
  }
  if (
    typeof patch.focusOffProjectDwellSec === 'number' &&
    patch.focusOffProjectDwellSec >= FOCUS_OFF_PROJECT_DWELL_MIN_SEC &&
    patch.focusOffProjectDwellSec <= FOCUS_OFF_PROJECT_DWELL_MAX_SEC
  ) {
    settings.focusOffProjectDwellSec = Math.round(patch.focusOffProjectDwellSec)
  }
  setSettings(settings)
  await saveSettings()

  if (running) {
    if (settings.paused && !wasPaused) {
      await closeOpenSegment()
      stopPollLoop()
      clearPendingAndSession()
    } else if (!settings.paused && wasPaused) {
      startPollLoop()
    }
  }
  await emitSummary()
  return { ...getSettings() }
}

export async function getActivityRules(): Promise<ActivityRules> {
  await loadActivityState()
  return structuredClone(getRules())
}

export async function openActivityRulesFile(): Promise<void> {
  await loadActivityState()
  try {
    await fsp.access(rulesPath())
  } catch {
    await saveJsonFile(rulesPath(), getRules())
  }
  await shell.openPath(rulesPath())
}

export async function reloadActivityRules(): Promise<ActivityRules> {
  await loadActivityState(true)
  return structuredClone(getRules())
}

export function handleActivitySuspend(): void {
  if (!running || getSettings().paused) return
  clearPendingAndSession()
  void closeOpenSegment()
  void emitSummary()
}

export function handleActivityResume(): void {
  if (!running || getSettings().paused) return
  void pollOnce()
}

/** Efface l’historique (jours + feedback). Conserve settings et rules. */
export async function clearActivityData(): Promise<{
  ok: boolean
  message: string
  summary: ActivityDaySummary
}> {
  ensureWired()
  await loadActivityState()
  // Ne pas flusher le segment ouvert — on jette l’historique en cours aussi.
  resetPollSessionState()
  clearStorageCaches()
  invalidateWatchCache()

  let removed = 0
  try {
    ensureDirs()
    try {
      const names = await fsp.readdir(daysDir())
      for (const name of names) {
        if (!name.endsWith('.jsonl') && !name.endsWith('.watch.json')) continue
        await fsp.unlink(path.join(daysDir(), name))
        removed += 1
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code
      if (code !== 'ENOENT') throw err
    }
    try {
      await fsp.unlink(feedbackPath())
      removed += 1
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code
      if (code !== 'ENOENT') throw err
    }
    await clearFocusJournalFile()
    await stopFocusSession()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Échec de la suppression.'
    await emitSummary()
    return {
      ok: false,
      message,
      summary: lastSummary ?? (await getActivitySummary()),
    }
  }

  await emitSummary()
  return {
    ok: true,
    message:
      removed > 0
        ? 'Historique d’activité effacé (règles conservées).'
        : 'Aucune donnée à effacer.',
    summary: lastSummary ?? (await getActivitySummary()),
  }
}

// Wire poll/feedback/export hooks as soon as the module loads (IPC may run before start).
ensureWired()

export { CATEGORIES }

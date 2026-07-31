import { createHash, randomUUID } from 'node:crypto'
import { powerMonitor } from 'electron'
import type {
  ActivityCategory,
  ActivityCategorySource,
  ActivityConfidence,
  ActivityContextKind,
  ActivitySegment,
} from '../../shared/types'
import {
  BROWSER_APPS,
  domainFromBrowserTitle,
  fetchBrowserUrl,
  parseIdeOrChatTitle,
} from '../activityContext'
import {
  ensureFocusSessionLoaded,
  evaluateFocusGuard,
  getFocusAttribution,
} from '../focusSession'
import { isMediaKeepAwakeActive } from '../activityMediaBridge'
import { classify, isIgnoredApp, type ClassifyResult } from './classifier'
import { DEFAULT_RULES, FLUSH_EVERY_POLLS, FOCUS_DWELL_MS } from './defaults'
import { normalizeAppKey } from './normalize'
import {
  appendSegment,
  getCompiledTitlePatterns,
  getRules,
  getSettings,
} from './storage'
import { sameFocus, shouldPersistSegment } from './segmentUtils'
import { getForeground } from './win32'

let openSegment: ActivitySegment | null = null
let pollsSinceFlush = 0
let lastApp: string | null = null
let currentSessionId: string | null = null
let pollInFlight = false
/** Candidate focus awaiting FOCUS_DWELL_MS before replacing openSegment. */
let pendingSwitch: { sinceMs: number; segment: ActivitySegment } | null = null

let running = false
let notifySummary: () => void = () => {}

export function setPollRunning(value: boolean): void {
  running = value
}

export function setPollNotify(fn: () => void): void {
  notifySummary = fn
}

export function getOpenSegment(): ActivitySegment | null {
  return openSegment
}

export function getPendingSwitch(): { sinceMs: number; segment: ActivitySegment } | null {
  return pendingSwitch
}

export function resetPollSessionState(): void {
  pendingSwitch = null
  openSegment = null
  pollsSinceFlush = 0
  lastApp = null
  currentSessionId = null
}

export function clearPendingAndSession(): void {
  pendingSwitch = null
  currentSessionId = null
}

function shortTitleHash(title: string): string {
  return createHash('sha256').update(title).digest('hex').slice(0, 12)
}

export function liveOpenSegment(): ActivitySegment | null {
  const settings = getSettings()
  if (!openSegment || settings.paused) return null
  return { ...openSegment, end: new Date().toISOString() }
}

export async function closeOpenSegment(end = new Date()): Promise<void> {
  if (!openSegment) return
  openSegment.end = end.toISOString()
  if (shouldPersistSegment(openSegment)) await appendSegment(openSegment)
  if (!openSegment.ignored) lastApp = openSegment.app
  openSegment = null
  pollsSinceFlush = 0
}

export function applyFocusAttribution(seg: ActivitySegment): ActivitySegment {
  const attr = getFocusAttribution()
  if (!attr || seg.ignored || seg.category === 'afk') {
    return {
      ...seg,
      focusSessionId: null,
      notionTaskId: null,
      notionTaskTitle: null,
    }
  }
  return {
    ...seg,
    focusSessionId: attr.focusSessionId,
    notionTaskId: attr.notionTaskId,
    notionTaskTitle: attr.notionTaskTitle,
  }
}

function makeSegment(opts: {
  now: Date
  app: string
  title: string | null
  titleHash: string | null
  exeDir: string | null
  idleSec: number
  classified: ClassifyResult
  prevApp: string | null
  sessionId: string | null
  domain: string | null
  urlPath: string | null
  contextKind: ActivityContextKind | null
  fileName: string | null
  projectName: string | null
  ignored: boolean
}): ActivitySegment {
  return applyFocusAttribution({
    start: opts.now.toISOString(),
    end: opts.now.toISOString(),
    app: opts.app,
    title: opts.title,
    category: opts.classified.category,
    categorySource: opts.classified.source,
    matchedPattern: opts.classified.matchedPattern,
    idleSec: opts.idleSec,
    prevApp: opts.prevApp,
    sessionId: opts.sessionId,
    exeDir: opts.exeDir,
    titleHash: opts.titleHash,
    confidence: opts.classified.confidence,
    domain: opts.domain,
    urlPath: opts.urlPath,
    contextKind: opts.contextKind,
    fileName: opts.fileName,
    projectName: opts.projectName,
    ignored: opts.ignored,
  })
}

type PollSample = {
  idle: boolean
  app: string
  title: string | null
  domain: string | null
  projectName: string | null
  ignored: boolean
  next: ActivitySegment
}

/** Idle / foreground / URL / IDE / classify → candidate segment fields. */
async function resolvePollSample(now: Date): Promise<PollSample> {
  const settings = getSettings()
  let idleSec = 0
  try {
    idleSec = powerMonitor.getSystemIdleTime()
  } catch {
    idleSec = 0
  }
  // Extension media bridge: active playback suppresses AFK despite system idle.
  const systemIdle = idleSec >= settings.idleThresholdSec
  const idle = systemIdle && !isMediaKeepAwakeActive()

  let app = 'unknown'
  let rawTitle = ''
  let exeDir: string | null = null
  let ignored = false
  const rules = getRules()
  if (!idle) {
    const fg = getForeground()
    if (fg) {
      app = normalizeAppKey(fg.app)
      rawTitle = fg.title || ''
      exeDir = fg.exeDir
      ignored =
        fg.isLatticeWindow ||
        isIgnoredApp(app, rules, DEFAULT_RULES.ignoredApps ?? [])
    }
  } else {
    app = 'afk'
    pendingSwitch = null
  }

  const title = settings.storeTitles && !idle ? rawTitle || null : null
  const titleHash =
    !settings.storeTitles && rawTitle && !idle ? shortTitleHash(rawTitle) : null

  let domain: string | null = null
  let urlPath: string | null = null
  let contextKind: ActivityContextKind | null = null
  let fileName: string | null = null
  let projectName: string | null = null

  if (!idle && !ignored) {
    if (BROWSER_APPS.has(app) && settings.browserDetail !== 'off') {
      const browser = await fetchBrowserUrl(app, settings.browserDetail)
      domain = browser.domain
      urlPath = browser.urlPath
      if (!domain) {
        const fromTitle = domainFromBrowserTitle(rawTitle || null, settings.browserDetail)
        domain = fromTitle.domain
        urlPath = fromTitle.urlPath
      }
      contextKind = 'browser'
    } else {
      const parsed = parseIdeOrChatTitle(app, rawTitle || null, settings.parseIdeTitles)
      contextKind = parsed.contextKind
      fileName = parsed.fileName
      projectName = parsed.projectName
    }
  }

  const classified = ignored
    ? {
        category: 'system' as ActivityCategory,
        source: 'app' as ActivityCategorySource,
        matchedPattern: 'ignored',
        confidence: 'high' as ActivityConfidence,
      }
    : classify(
        app,
        settings.storeTitles ? title : rawTitle || null,
        idle,
        domain,
        rules,
        getCompiledTitlePatterns(),
      )

  if (idle) {
    currentSessionId = null
  } else if (!ignored && !currentSessionId) {
    currentSessionId = randomUUID()
  }

  let prevForNext: string | null = null
  if (lastApp && lastApp !== app) prevForNext = lastApp
  else if (openSegment && openSegment.app !== app) prevForNext = openSegment.app

  let segmentTitle: string | null = title
  if (ignored) segmentTitle = settings.storeTitles ? 'Lattice' : null

  const next = makeSegment({
    now,
    app,
    title: segmentTitle,
    titleHash,
    exeDir,
    idleSec,
    classified,
    prevApp: prevForNext ?? openSegment?.prevApp ?? null,
    sessionId: idle || ignored ? null : currentSessionId,
    domain,
    urlPath,
    contextKind: ignored ? null : contextKind,
    fileName: ignored ? null : fileName,
    projectName: ignored ? null : projectName,
    ignored,
  })

  return { idle, app, title: next.title, domain, projectName, ignored, next }
}

export async function pollOnce(): Promise<void> {
  const settings = getSettings()
  if (!running || settings.paused || pollInFlight) return
  pollInFlight = true
  try {
    await ensureFocusSessionLoaded()
    const now = new Date()
    const nowMs = now.getTime()
    const sample = await resolvePollSample(now)
    const { idle, app, domain, projectName, ignored, next } = sample

    const guard = await evaluateFocusGuard({
      nowMs,
      app,
      title: next.title,
      domain,
      projectName,
      ignored,
      idle,
      dwellSec: settings.focusOffProjectDwellSec,
    })
    if (guard.interrupted) {
      pendingSwitch = null
      await closeOpenSegment(now)
      openSegment = applyFocusAttribution({
        ...next,
        start: now.toISOString(),
        end: now.toISOString(),
        prevApp: lastApp && lastApp !== next.app ? lastApp : null,
      })
      notifySummary()
      return
    }

    if (!openSegment) {
      openSegment = next
      pendingSwitch = null
      notifySummary()
      return
    }

    if (sameFocus(openSegment, next)) {
      pendingSwitch = null
      // Re-tag if focus session started/stopped mid-segment.
      const retagged = applyFocusAttribution({
        ...openSegment,
        end: now.toISOString(),
      })
      const attrChanged =
        (openSegment.notionTaskId ?? null) !== (retagged.notionTaskId ?? null) ||
        (openSegment.focusSessionId ?? null) !== (retagged.focusSessionId ?? null)
      if (attrChanged) {
        await closeOpenSegment(now)
        openSegment = {
          ...retagged,
          start: now.toISOString(),
          end: now.toISOString(),
        }
        pollsSinceFlush = 0
        notifySummary()
        return
      }
      openSegment = retagged
      pollsSinceFlush += 1
      if (pollsSinceFlush >= FLUSH_EVERY_POLLS) {
        const snap = { ...openSegment }
        if (shouldPersistSegment(snap)) await appendSegment(snap)
        openSegment = {
          ...openSegment,
          start: now.toISOString(),
          end: now.toISOString(),
        }
        pollsSinceFlush = 0
      }
      notifySummary()
      return
    }

    // Immediate switch for AFK transitions (enter/leave idle).
    if (idle || openSegment.category === 'afk') {
      pendingSwitch = null
      await closeOpenSegment(now)
      openSegment = {
        ...next,
        prevApp: lastApp && lastApp !== next.app ? lastApp : null,
      }
      notifySummary()
      return
    }

    if (pendingSwitch && sameFocus(pendingSwitch.segment, next)) {
      pendingSwitch.segment = { ...next, start: pendingSwitch.segment.start }
      if (nowMs - pendingSwitch.sinceMs >= FOCUS_DWELL_MS) {
        await closeOpenSegment(now)
        openSegment = {
          ...pendingSwitch.segment,
          start: now.toISOString(),
          end: now.toISOString(),
          prevApp: lastApp && lastApp !== next.app ? lastApp : null,
        }
        pendingSwitch = null
        notifySummary()
        return
      }
      // Keep accruing time on the previous stable focus.
      openSegment.end = now.toISOString()
      notifySummary()
      return
    }

    // New candidate — start dwell clock; do not close previous yet.
    pendingSwitch = {
      sinceMs: nowMs,
      segment: next,
    }
    openSegment.end = now.toISOString()
    notifySummary()
  } finally {
    pollInFlight = false
  }
}

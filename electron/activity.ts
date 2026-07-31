/**
 * Activity tracker — Solution B (app + window title) with enriched signals + local feedback.
 * Local JSONL history under userData/activity/.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { app, BrowserWindow, dialog, powerMonitor, shell } from 'electron'
import koffi from 'koffi'
import type {
  ActivityAppBreakdown,
  ActivityCategory,
  ActivityCategorySource,
  ActivityConfidence,
  ActivityContextKind,
  ActivityCorrectionPayload,
  ActivityCorrectionResult,
  ActivityCorrectionScope,
  ActivityCurrentFocus,
  ActivityDaySummary,
  ActivityExportFormat,
  ActivityFeedbackEntry,
  ActivityProjectBreakdown,
  ActivityQualityMetrics,
  ActivityRules,
  ActivitySegment,
  ActivitySettings,
  ActivitySiteBreakdown,
  ActivityTaskBreakdown,
} from '../shared/types'
import {
  clearFocusJournalFile,
  evaluateFocusGuard,
  getFocusAttribution,
  getFocusSession,
  readFocusJournalInRange,
  stopFocusSession,
} from './focusSession'
import {
  invalidateWatchCache,
  isMediaKeepAwakeActive,
  getTopWatch,
  readWatchMap,
  setMediaWatchListener,
  startMediaBridge,
  stopMediaBridge,
} from './activityMediaBridge'
import {
  BROWSER_APPS,
  categoryFromDomain,
  domainFromBrowserTitle,
  fetchBrowserUrl,
  isActiveUrlHelperAvailable,
  normalizeDomain,
  parseIdeOrChatTitle,
} from './activityContext'

const POLL_MS = 2_000
const FLUSH_EVERY_POLLS = 15
/** Focus must stay stable this long before we commit an app switch. */
const FOCUS_DWELL_MS = 3_000
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

const CATEGORIES: ActivityCategory[] = [
  'work',
  'entertainment',
  'communication',
  'system',
  'other',
  'afk',
]

const DEFAULT_SETTINGS: ActivitySettings = {
  paused: false,
  storeTitles: true,
  idleThresholdSec: 180,
  browserDetail: 'domain',
  parseIdeTitles: true,
  focusOffProjectDwellSec: 8,
}

const DEFAULT_RULES: ActivityRules = {
  appDefaults: {
    code: 'work',
    cursor: 'work',
    devenv: 'work',
    idea64: 'work',
    'windows terminal': 'work',
    windowsterminal: 'work',
    powershell: 'work',
    pwsh: 'work',
    cmd: 'work',
    notion: 'work',
    figma: 'work',
    blender: 'work',
    excel: 'work',
    winword: 'work',
    powerpnt: 'work',
    spotify: 'entertainment',
    steam: 'entertainment',
    epicgameslauncher: 'entertainment',
    discord: 'communication',
    slack: 'communication',
    teams: 'communication',
    msteams: 'communication',
    outlook: 'communication',
    hxoutlook: 'communication',
    explorer: 'system',
    searchhost: 'system',
    startmenuexperiencehost: 'system',
    shellhost: 'system',
    applicationframehost: 'system',
    systemsettings: 'system',
    taskmgr: 'system',
  },
  titlePatterns: [
    { pattern: 'youtube|netflix|twitch|disney\\+|prime video|spotify', category: 'entertainment' },
    { pattern: 'facebook|instagram|tiktok|reddit|twitter|x\\.com', category: 'entertainment' },
    {
      pattern: 'github|gitlab|stackoverflow|notion|localhost|docs\\.google|jira|linear\\.app|figma',
      category: 'work',
    },
    { pattern: 'outlook|gmail|mail\\.google|teams|slack|discord', category: 'communication' },
  ],
  userAppOverrides: {},
  ignoredApps: ['lattice', 'lattice-desk'],
}

type ForegroundInfo = {
  app: string
  title: string
  exeDir: string | null
  exePath: string | null
  pid: number
  hwndAddr: number | null
  isLatticeWindow: boolean
}

type ClassifyResult = {
  category: ActivityCategory
  source: ActivityCategorySource
  matchedPattern: string | null
  confidence: ActivityConfidence
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NativeFn = (...args: any[]) => any

let GetForegroundWindow: NativeFn | null = null
let GetWindowTextW: NativeFn | null = null
let GetWindowThreadProcessId: NativeFn | null = null
let OpenProcess: NativeFn | null = null
let CloseHandle: NativeFn | null = null
let QueryFullProcessImageNameW: NativeFn | null = null
let win32Ready = false
let win32Failed = false

let pollTimer: NodeJS.Timeout | null = null
let running = false
let stateLoaded = false
let settings: ActivitySettings = { ...DEFAULT_SETTINGS }
let rules: ActivityRules = structuredClone(DEFAULT_RULES)
let compiledTitlePatterns: { re: RegExp; category: ActivityCategory; pattern: string }[] = []
let openSegment: ActivitySegment | null = null
let pollsSinceFlush = 0
let lastSummary: ActivityDaySummary | null = null
let onUpdated: ((summary: ActivityDaySummary) => void) | null = null
let lastApp: string | null = null
let currentSessionId: string | null = null
let pollInFlight = false
/** Candidate focus awaiting FOCUS_DWELL_MS before replacing openSegment. */
let pendingSwitch: { sinceMs: number; segment: ActivitySegment } | null = null

/** In-memory day file cache — invalidate on write (poll path must not re-read JSONL every 2s). */
let dayCacheKey: string | null = null
let dayCacheSegments: ActivitySegment[] = []
let feedbackCountCache: { date: string; count: number } | null = null

function activityDir(): string {
  return path.join(app.getPath('userData'), 'activity')
}

function daysDir(): string {
  return path.join(activityDir(), 'days')
}

function settingsPath(): string {
  return path.join(activityDir(), 'settings.json')
}

function rulesPath(): string {
  return path.join(activityDir(), 'rules.json')
}

function feedbackPath(): string {
  return path.join(activityDir(), 'feedback.jsonl')
}

function dayFile(date: string): string {
  return path.join(daysDir(), `${date}.jsonl`)
}

function ensureDirs(): void {
  fs.mkdirSync(daysDir(), { recursive: true })
}

function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyByCategory(): Record<ActivityCategory, number> {
  return {
    work: 0,
    entertainment: 0,
    communication: 0,
    system: 0,
    other: 0,
    afk: 0,
  }
}

function shortTitleHash(title: string): string {
  return createHash('sha1').update(title).digest('hex').slice(0, 12)
}

function parentDirName(fullPath: string): string | null {
  const parent = path.dirname(fullPath)
  const base = path.basename(parent)
  return base && base !== '.' && base !== '\\' && base !== '/' ? base : null
}

function initWin32(): boolean {
  if (win32Ready) return true
  if (win32Failed) return false
  try {
    const user32 = koffi.load('user32.dll')
    const kernel32 = koffi.load('kernel32.dll')
    GetForegroundWindow = user32.func('void * __stdcall GetForegroundWindow()')
    GetWindowTextW = user32.func(
      'int __stdcall GetWindowTextW(void *hWnd, void *lpString, int nMaxCount)',
    )
    GetWindowThreadProcessId = user32.func(
      'uint32 __stdcall GetWindowThreadProcessId(void *hWnd, _Out_ uint32 *lpdwProcessId)',
    )
    OpenProcess = kernel32.func(
      'void * __stdcall OpenProcess(uint32 dwDesiredAccess, int bInheritHandle, uint32 dwProcessId)',
    )
    CloseHandle = kernel32.func('int __stdcall CloseHandle(void *hObject)')
    QueryFullProcessImageNameW = kernel32.func(
      'int __stdcall QueryFullProcessImageNameW(void *hProcess, uint32 dwFlags, void *lpExeName, _Inout_ uint32 *lpdwSize)',
    )
    win32Ready = true
    return true
  } catch (err) {
    console.error('Activity tracker: Win32 init failed', err)
    win32Failed = true
    return false
  }
}

function readWideString(buf: Buffer, charCount: number): string {
  if (charCount <= 0) return ''
  return buf.toString('utf16le', 0, charCount * 2).replace(/\0+$/, '')
}

function hwndAddress(hwnd: unknown): number | null {
  if (hwnd == null) return null
  try {
    return Number(koffi.address(hwnd as never))
  } catch {
    return null
  }
}

function nativeHandleAddress(win: BrowserWindow): number | null {
  try {
    const buf = win.getNativeWindowHandle()
    if (buf.length >= 8) return Number(buf.readBigUInt64LE(0))
    if (buf.length >= 4) return buf.readUInt32LE(0)
  } catch {
    /* ignore */
  }
  return null
}

function isLatticeHwnd(hwndAddr: number | null): boolean {
  if (hwndAddr == null || hwndAddr === 0) return false
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    const h = nativeHandleAddress(win)
    if (h != null && h === hwndAddr) return true
  }
  return false
}

function isSelfExe(exePath: string | null, pid: number): boolean {
  if (pid > 0 && pid === process.pid) return true
  if (!exePath) return false
  try {
    const ours = path.normalize(app.getPath('exe')).toLowerCase()
    const theirs = path.normalize(exePath).toLowerCase()
    if (ours && theirs === ours) {
      // In production the packaged exe is unique. In dev both are electron.exe —
      // HWND check is the reliable signal; treat path match as soft hint only if not electron.
      const base = path.basename(theirs, path.extname(theirs))
      if (base !== 'electron') return true
    }
  } catch {
    /* ignore */
  }
  return false
}

function isIgnoredApp(appKey: string): boolean {
  const list = rules.ignoredApps ?? DEFAULT_RULES.ignoredApps ?? []
  return list.some((name) => normalizeAppKey(name) === appKey)
}

function getForeground(): ForegroundInfo | null {
  if (!initWin32()) return null
  try {
    const hwnd = GetForegroundWindow!()
    if (!hwnd) return null
    const hwndAddr = hwndAddress(hwnd)
    const latticeHwnd = isLatticeHwnd(hwndAddr)

    const titleBuf = Buffer.alloc(512 * 2)
    const titleLen = GetWindowTextW!(hwnd, titleBuf, 512) as number
    const title = readWideString(titleBuf, titleLen)

    const pidOut = [0]
    GetWindowThreadProcessId!(hwnd, pidOut)
    const pid = pidOut[0]
    if (!pid) {
      return {
        app: 'unknown',
        title,
        exeDir: null,
        exePath: null,
        pid: 0,
        hwndAddr,
        isLatticeWindow: latticeHwnd,
      }
    }

    const handle = OpenProcess!(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid)
    if (!handle) {
      return {
        app: `pid-${pid}`,
        title,
        exeDir: null,
        exePath: null,
        pid,
        hwndAddr,
        isLatticeWindow: latticeHwnd || isSelfExe(null, pid),
      }
    }

    try {
      const nameBuf = Buffer.alloc(520 * 2)
      const sizeOut = [520]
      const ok = QueryFullProcessImageNameW!(handle, 0, nameBuf, sizeOut) as number
      if (!ok) {
        return {
          app: `pid-${pid}`,
          title,
          exeDir: null,
          exePath: null,
          pid,
          hwndAddr,
          isLatticeWindow: latticeHwnd || isSelfExe(null, pid),
        }
      }
      const fullPath = readWideString(nameBuf, sizeOut[0])
      const base = path.basename(fullPath, path.extname(fullPath)).toLowerCase()
      return {
        app: base || `pid-${pid}`,
        title,
        exeDir: parentDirName(fullPath),
        exePath: fullPath,
        pid,
        hwndAddr,
        isLatticeWindow: latticeHwnd || isSelfExe(fullPath, pid),
      }
    } finally {
      CloseHandle!(handle)
    }
  } catch (err) {
    console.error('Activity tracker: foreground read failed', err)
    return null
  }
}

function normalizeAppKey(app: string): string {
  return app.trim().toLowerCase().replace(/\.exe$/i, '')
}

function classify(
  app: string,
  title: string | null,
  idle: boolean,
  domain: string | null,
): ClassifyResult {
  if (idle) {
    return {
      category: 'afk',
      source: 'idle',
      matchedPattern: null,
      confidence: 'high',
    }
  }

  const key = normalizeAppKey(app)
  const titleLower = (title ?? '').toLowerCase()
  const userHit = rules.userAppOverrides?.[key]
  if (userHit) {
    return {
      category: userHit,
      source: 'user',
      matchedPattern: null,
      confidence: 'high',
    }
  }

  const fromDomain = categoryFromDomain(domain, rules.userDomainOverrides)
  if (fromDomain) {
    return {
      category: fromDomain.category,
      source: rules.userDomainOverrides?.[fromDomain.matched]
        ? 'user'
        : 'domain',
      matchedPattern: fromDomain.matched,
      confidence: 'high',
    }
  }

  for (const rule of compiledTitlePatterns) {
    if (rule.re.test(titleLower)) {
      return {
        category: rule.category,
        source: 'title',
        matchedPattern: rule.pattern,
        confidence: 'high',
      }
    }
  }

  const fromApp = rules.appDefaults[key]
  if (fromApp) {
    return {
      category: fromApp,
      source: 'app',
      matchedPattern: null,
      confidence: 'medium',
    }
  }

  return {
    category: 'other',
    source: 'fallback',
    matchedPattern: null,
    confidence: 'low',
  }
}

function loadJsonFile<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return structuredClone(fallback)
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<T>
    return { ...structuredClone(fallback), ...raw } as T
  } catch {
    return structuredClone(fallback)
  }
}

function saveJsonFile(file: string, data: unknown): void {
  ensureDirs()
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function mergeRules(raw: Partial<ActivityRules>): ActivityRules {
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

function rebuildCompiledPatterns(): void {
  compiledTitlePatterns = []
  for (const rule of rules.titlePatterns) {
    try {
      compiledTitlePatterns.push({
        re: new RegExp(rule.pattern, 'i'),
        category: rule.category,
        pattern: rule.pattern,
      })
    } catch {
      /* skip invalid pattern */
    }
  }
}

function invalidateDayCache(date?: string): void {
  if (!date || date === dayCacheKey) {
    dayCacheKey = null
    dayCacheSegments = []
  }
}

export function loadActivityState(force = false): void {
  if (stateLoaded && !force) return
  ensureDirs()
  settings = loadJsonFile(settingsPath(), DEFAULT_SETTINGS)
  rules = mergeRules(loadJsonFile(rulesPath(), DEFAULT_RULES))
  rebuildCompiledPatterns()
  if (!fs.existsSync(rulesPath())) {
    saveJsonFile(rulesPath(), rules)
  }
  if (!fs.existsSync(settingsPath())) {
    saveJsonFile(settingsPath(), settings)
  }
  stateLoaded = true
}

function appendSegment(segment: ActivitySegment): void {
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

function readDaySegments(date: string): ActivitySegment[] {
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

function segmentMs(s: ActivitySegment): number {
  return Math.max(0, new Date(s.end).getTime() - new Date(s.start).getTime())
}

function readFeedbackEntries(): ActivityFeedbackEntry[] {
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

function countFeedbackOnDay(date: string): number {
  if (feedbackCountCache?.date === date) return feedbackCountCache.count
  const count = readFeedbackEntries().filter((e) => e.at.slice(0, 10) === date).length
  feedbackCountCache = { date, count }
  return count
}

function isCountable(seg: ActivitySegment): boolean {
  return seg.category !== 'afk' && !seg.ignored
}

function buildQuality(segments: ActivitySegment[], date: string): ActivityQualityMetrics {
  let activeMs = 0
  let otherMs = 0
  let lowMs = 0
  const unknown = new Set<string>()

  for (const seg of segments) {
    const ms = segmentMs(seg)
    if (ms <= 0 || !isCountable(seg)) continue
    activeMs += ms
    if (seg.category === 'other') otherMs += ms
    const conf = seg.confidence ?? (seg.category === 'other' ? 'low' : 'medium')
    if (conf === 'low') lowMs += ms
    if (
      seg.app === 'unknown' ||
      seg.app.startsWith('pid-') ||
      (seg.category === 'other' && (seg.categorySource ?? 'fallback') === 'fallback')
    ) {
      unknown.add(seg.app)
    }
  }

  return {
    otherShare: activeMs > 0 ? otherMs / activeMs : 0,
    lowConfidenceShare: activeMs > 0 ? lowMs / activeMs : 0,
    unknownAppCount: unknown.size,
    feedbackCountToday: countFeedbackOnDay(date),
  }
}

function buildCurrent(live: ActivitySegment | null): ActivityCurrentFocus | null {
  if (!live || live.category === 'afk') return null
  return {
    app: live.app,
    title: live.title,
    category: live.category,
    confidence: live.confidence ?? 'medium',
    categorySource: live.categorySource ?? 'fallback',
    domain: live.domain ?? null,
    fileName: live.fileName ?? null,
    projectName: live.projectName ?? null,
    contextKind: live.contextKind ?? null,
    ignored: Boolean(live.ignored),
  }
}

function buildSummary(date: string, live?: ActivitySegment | null): ActivityDaySummary {
  // Copy so pushing `live` does not mutate the day cache.
  const segments = [...readDaySegments(date)]
  if (live && todayKey(new Date(live.start)) === date) {
    segments.push(live)
  }

  const byCategory = emptyByCategory()
  const appMs = new Map<
    string,
    { ms: number; category: ActivityCategory; confidence: ActivityConfidence }
  >()
  const siteMs = new Map<string, { ms: number; category: ActivityCategory }>()
  const projectMs = new Map<string, number>()
  const taskMs = new Map<string, { title: string; ms: number }>()
  let totalMs = 0

  for (const seg of segments) {
    const ms = segmentMs(seg)
    if (ms <= 0) continue
    if (seg.category === 'afk') {
      byCategory.afk += ms
      continue
    }
    if (seg.ignored) continue
    totalMs += ms
    byCategory[seg.category] = (byCategory[seg.category] ?? 0) + ms
    const prev = appMs.get(seg.app) ?? {
      ms: 0,
      category: seg.category,
      confidence: seg.confidence ?? 'medium',
    }
    prev.ms += ms
    prev.category = seg.category
    prev.confidence = seg.confidence ?? prev.confidence
    appMs.set(seg.app, prev)

    if (seg.domain) {
      const s = siteMs.get(seg.domain) ?? { ms: 0, category: seg.category }
      s.ms += ms
      s.category = seg.category
      siteMs.set(seg.domain, s)
    }
    if (seg.projectName) {
      projectMs.set(seg.projectName, (projectMs.get(seg.projectName) ?? 0) + ms)
    }
    if (seg.notionTaskId) {
      const t = taskMs.get(seg.notionTaskId) ?? {
        title: seg.notionTaskTitle || 'Sans titre',
        ms: 0,
      }
      t.ms += ms
      if (seg.notionTaskTitle) t.title = seg.notionTaskTitle
      taskMs.set(seg.notionTaskId, t)
    }
  }

  const topApps: ActivityAppBreakdown[] = [...appMs.entries()]
    .map(([appName, v]) => ({
      app: appName,
      ms: v.ms,
      category: v.category,
      confidence: v.confidence,
    }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 8)

  const topSites: ActivitySiteBreakdown[] = [...siteMs.entries()]
    .map(([domain, v]) => ({ domain, ms: v.ms, category: v.category }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6)

  const topProjects: ActivityProjectBreakdown[] = [...projectMs.entries()]
    .map(([projectName, ms]) => ({ projectName, ms }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6)

  const topTasks: ActivityTaskBreakdown[] = [...taskMs.entries()]
    .map(([notionTaskId, v]) => ({
      notionTaskId,
      title: v.title,
      ms: v.ms,
    }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 8)

  const topWatch = getTopWatch(date, 8, rules.userDomainOverrides)

  return {
    date,
    totalMs,
    byCategory,
    topApps,
    topSites,
    topProjects,
    paused: settings.paused,
    tracking: running && !settings.paused,
    quality: buildQuality(segments, date),
    current: buildCurrent(live ?? null),
    urlHelperAvailable: isActiveUrlHelperAvailable(),
    mediaKeepAwake: isMediaKeepAwakeActive(),
    topWatch,
    focusSession: getFocusSession(),
    topTasks,
  }
}

function liveOpenSegment(): ActivitySegment | null {
  if (!openSegment || settings.paused) return null
  return { ...openSegment, end: new Date().toISOString() }
}

function withPendingCurrent(summary: ActivityDaySummary): ActivityDaySummary {
  if (!pendingSwitch) return summary
  return {
    ...summary,
    current: buildCurrent({
      ...pendingSwitch.segment,
      end: new Date().toISOString(),
    }),
  }
}

function emitSummary(): void {
  lastSummary = withPendingCurrent(buildSummary(todayKey(), liveOpenSegment()))
  onUpdated?.(lastSummary)
}

function shouldPersistSegment(seg: ActivitySegment): boolean {
  return !seg.ignored || segmentMs(seg) >= 1_000
}

function closeOpenSegment(end = new Date()): void {
  if (!openSegment) return
  openSegment.end = end.toISOString()
  if (shouldPersistSegment(openSegment)) appendSegment(openSegment)
  if (!openSegment.ignored) lastApp = openSegment.app
  openSegment = null
  pollsSinceFlush = 0
}

function sameFocus(a: ActivitySegment, b: ActivitySegment): boolean {
  return (
    a.app === b.app &&
    a.title === b.title &&
    a.category === b.category &&
    Boolean(a.ignored) === Boolean(b.ignored) &&
    (a.titleHash ?? null) === (b.titleHash ?? null) &&
    (a.domain ?? null) === (b.domain ?? null) &&
    (a.fileName ?? null) === (b.fileName ?? null) &&
    (a.projectName ?? null) === (b.projectName ?? null)
  )
}

function applyFocusAttribution(seg: ActivitySegment): ActivitySegment {
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

async function pollOnce(): Promise<void> {
  if (!running || settings.paused || pollInFlight) return
  pollInFlight = true
  try {
    const now = new Date()
    const nowMs = now.getTime()
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
    if (!idle) {
      const fg = getForeground()
      if (fg) {
        app = normalizeAppKey(fg.app)
        rawTitle = fg.title || ''
        exeDir = fg.exeDir
        ignored = fg.isLatticeWindow || isIgnoredApp(app)
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
        )

    if (idle) {
      currentSessionId = null
    } else if (!ignored && !currentSessionId) {
      currentSessionId = randomUUID()
    }

    const prevForNext =
      lastApp && lastApp !== app
        ? lastApp
        : openSegment && openSegment.app !== app
          ? openSegment.app
          : null
    const next = makeSegment({
      now,
      app,
      title: ignored ? (settings.storeTitles ? 'Lattice' : null) : title,
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

    const guard = evaluateFocusGuard({
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
      closeOpenSegment(now)
      openSegment = applyFocusAttribution({
        ...next,
        start: now.toISOString(),
        end: now.toISOString(),
        prevApp: lastApp && lastApp !== next.app ? lastApp : null,
      })
      emitSummary()
      return
    }

    if (!openSegment) {
      openSegment = next
      pendingSwitch = null
      emitSummary()
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
        closeOpenSegment(now)
        openSegment = {
          ...retagged,
          start: now.toISOString(),
          end: now.toISOString(),
        }
        pollsSinceFlush = 0
        emitSummary()
        return
      }
      openSegment = retagged
      pollsSinceFlush += 1
      if (pollsSinceFlush >= FLUSH_EVERY_POLLS) {
        const snap = { ...openSegment }
        if (shouldPersistSegment(snap)) appendSegment(snap)
        openSegment = {
          ...openSegment,
          start: now.toISOString(),
          end: now.toISOString(),
        }
        pollsSinceFlush = 0
      }
      emitSummary()
      return
    }

    // Immediate switch for AFK transitions (enter/leave idle).
    if (idle || openSegment.category === 'afk') {
      pendingSwitch = null
      closeOpenSegment(now)
      openSegment = {
        ...next,
        prevApp: lastApp && lastApp !== next.app ? lastApp : null,
      }
      emitSummary()
      return
    }

    if (pendingSwitch && sameFocus(pendingSwitch.segment, next)) {
      pendingSwitch.segment = { ...next, start: pendingSwitch.segment.start }
      if (nowMs - pendingSwitch.sinceMs >= FOCUS_DWELL_MS) {
        closeOpenSegment(now)
        openSegment = {
          ...pendingSwitch.segment,
          start: now.toISOString(),
          end: now.toISOString(),
          prevApp: lastApp && lastApp !== next.app ? lastApp : null,
        }
        pendingSwitch = null
        emitSummary()
        return
      }
      // Keep accruing time on the previous stable focus.
      openSegment.end = now.toISOString()
      emitSummary()
      return
    }

    // New candidate — start dwell clock; do not close previous yet.
    pendingSwitch = {
      sinceMs: nowMs,
      segment: next,
    }
    openSegment.end = now.toISOString()
    emitSummary()
  } finally {
    pollInFlight = false
  }
}

export function setActivityUpdatedListener(
  cb: ((summary: ActivityDaySummary) => void) | null,
): void {
  onUpdated = cb
}

export function startActivityTracker(): void {
  if (running) return
  loadActivityState()
  running = true
  setMediaWatchListener(() => emitSummary())
  startMediaBridge()
  if (!settings.paused) {
    void pollOnce()
    pollTimer = setInterval(() => {
      void pollOnce()
    }, POLL_MS)
  }
  emitSummary()
}

export function stopActivityTracker(): void {
  if (!running) return
  pendingSwitch = null
  closeOpenSegment()
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  running = false
  currentSessionId = null
  setMediaWatchListener(null)
  stopMediaBridge()
  emitSummary()
}

export function isActivityTrackerRunning(): boolean {
  return running
}

export function getActivitySummary(date?: string): ActivityDaySummary {
  loadActivityState()
  const key = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKey()
  const live =
    running && !settings.paused && key === todayKey() ? liveOpenSegment() : null
  lastSummary = buildSummary(key, live)
  if (key === todayKey()) lastSummary = withPendingCurrent(lastSummary)
  return lastSummary
}

/** Contexte focus courant pour initialiser l’allowlist d’une session. */
export function getActivityFocusSeed(): {
  apps: string[]
  domains: string[]
  ideProjects: string[]
} {
  const live = liveOpenSegment() ?? openSegment
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
  if (running) emitSummary()
}

export function getActivitySettings(): ActivitySettings {
  loadActivityState()
  return { ...settings }
}

export function updateActivitySettings(
  patch: Partial<ActivitySettings>,
): ActivitySettings {
  loadActivityState()
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
    patch.focusOffProjectDwellSec >= 3 &&
    patch.focusOffProjectDwellSec <= 120
  ) {
    settings.focusOffProjectDwellSec = Math.round(patch.focusOffProjectDwellSec)
  }
  saveJsonFile(settingsPath(), settings)

  if (running) {
    if (settings.paused && !wasPaused) {
      closeOpenSegment()
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      currentSessionId = null
    } else if (!settings.paused && wasPaused) {
      void pollOnce()
      if (!pollTimer) {
        pollTimer = setInterval(() => {
          void pollOnce()
        }, POLL_MS)
      }
    }
  }
  emitSummary()
  return { ...settings }
}

export function getActivityRules(): ActivityRules {
  loadActivityState()
  return structuredClone(rules)
}

export async function openActivityRulesFile(): Promise<void> {
  loadActivityState()
  if (!fs.existsSync(rulesPath())) {
    saveJsonFile(rulesPath(), rules)
  }
  await shell.openPath(rulesPath())
}

export function reloadActivityRules(): ActivityRules {
  loadActivityState(true)
  return structuredClone(rules)
}

function escapeRegexToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Extract a stable token from a title for a title-scope rule (domain-like or significant word). */
function titlePatternFromSample(titleSample: string): string | null {
  const trimmed = titleSample.trim()
  if (!trimmed) return null
  const domain = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z]{2,})+)/i,
  )
  if (domain?.[1]) return escapeRegexToken(domain[1].toLowerCase())
  const beforeDash = trimmed.split(/\s[-–—|]\s/)[0]?.trim()
  if (beforeDash && beforeDash.length >= 3 && beforeDash.length <= 48) {
    return escapeRegexToken(beforeDash.slice(0, 48))
  }
  const word = trimmed.match(/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 ._-]{2,31}/)
  return word ? escapeRegexToken(word[0].trim()) : null
}

function appendFeedback(entry: ActivityFeedbackEntry): void {
  ensureDirs()
  fs.appendFileSync(feedbackPath(), `${JSON.stringify(entry)}\n`, 'utf8')
  const day = entry.at.slice(0, 10)
  if (feedbackCountCache?.date === day) {
    feedbackCountCache = { date: day, count: feedbackCountCache.count + 1 }
  } else {
    feedbackCountCache = null
  }
}

export function correctActivityCategory(
  payload: ActivityCorrectionPayload,
): ActivityCorrectionResult {
  loadActivityState()
  const scope: ActivityCorrectionScope =
    payload.scope === 'title' || payload.scope === 'domain' ? payload.scope : 'app'

  if (!CATEGORIES.includes(payload.category) || payload.category === 'afk') {
    return { ok: false, message: 'Catégorie invalide.' }
  }

  if (scope === 'domain') {
    const domainKey = normalizeDomain(payload.domain || '')
    if (!domainKey) {
      return { ok: false, message: 'Domaine invalide.' }
    }

    const from =
      openSegment?.domain && normalizeDomain(openSegment.domain) === domainKey
        ? openSegment.category
        : rules.userDomainOverrides?.[domainKey] ??
          categoryFromDomain(domainKey)?.category ??
          'other'

    appendFeedback({
      at: new Date().toISOString(),
      app: normalizeAppKey(payload.app || openSegment?.app || 'browser'),
      titleSample: domainKey,
      from,
      to: payload.category,
      scope: 'domain',
      durationMsHint:
        openSegment?.domain && normalizeDomain(openSegment.domain) === domainKey
          ? segmentMs({ ...openSegment, end: new Date().toISOString() })
          : 0,
    })

    rules.userDomainOverrides = {
      ...(rules.userDomainOverrides ?? {}),
      [domainKey]: payload.category,
    }
    saveJsonFile(rulesPath(), rules)

    if (openSegment?.domain && normalizeDomain(openSegment.domain) === domainKey) {
      openSegment.category = payload.category
      openSegment.categorySource = 'user'
      openSegment.confidence = 'high'
      openSegment.matchedPattern = domainKey
    }

    emitSummary()
    return {
      ok: true,
      message: `« ${domainKey} » → ${payload.category}`,
      summary: lastSummary ?? getActivitySummary(),
      rules: structuredClone(rules),
    }
  }

  const appKey = normalizeAppKey(payload.app || '')
  if (!appKey || appKey === 'afk') {
    return { ok: false, message: 'Application invalide.' }
  }

  const from =
    openSegment && openSegment.app === appKey
      ? openSegment.category
      : rules.userAppOverrides?.[appKey] ??
        rules.appDefaults[appKey] ??
        'other'

  const titleSample =
    typeof payload.titleSample === 'string'
      ? payload.titleSample
      : openSegment?.app === appKey
        ? openSegment.title
        : null

  let durationMsHint = 0
  if (openSegment && openSegment.app === appKey) {
    durationMsHint = segmentMs({
      ...openSegment,
      end: new Date().toISOString(),
    })
  }

  appendFeedback({
    at: new Date().toISOString(),
    app: appKey,
    titleSample,
    from,
    to: payload.category,
    scope,
    durationMsHint,
  })

  if (scope === 'app') {
    rules.userAppOverrides = {
      ...(rules.userAppOverrides ?? {}),
      [appKey]: payload.category,
    }
    rules.appDefaults = {
      ...rules.appDefaults,
      [appKey]: payload.category,
    }
  } else {
    const pattern = titlePatternFromSample(titleSample ?? '')
    if (!pattern) {
      return {
        ok: false,
        message: 'Impossible de dériver un motif depuis le titre.',
      }
    }
    const exists = rules.titlePatterns.some(
      (p) => p.pattern === pattern && p.category === payload.category,
    )
    if (!exists) {
      rules.titlePatterns = [
        { pattern, category: payload.category },
        ...rules.titlePatterns,
      ]
    }
  }

  saveJsonFile(rulesPath(), rules)
  rebuildCompiledPatterns()

  if (openSegment && openSegment.app === appKey) {
    openSegment.category = payload.category
    openSegment.categorySource = 'user'
    openSegment.confidence = 'high'
    if (scope === 'title') {
      openSegment.matchedPattern = rules.titlePatterns[0]?.pattern ?? null
    } else {
      openSegment.matchedPattern = null
    }
  }

  emitSummary()
  return {
    ok: true,
    message:
      scope === 'app'
        ? `« ${appKey} » → ${payload.category}`
        : `Motif titre ajouté → ${payload.category}`,
    summary: lastSummary ?? getActivitySummary(),
    rules: structuredClone(rules),
  }
}

function listDayFilesInRange(from: string, to: string): string[] {
  ensureDirs()
  if (!fs.existsSync(daysDir())) return []
  const keys = new Set<string>()
  for (const f of fs.readdirSync(daysDir())) {
    const jsonl = f.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/)
    if (jsonl) keys.add(jsonl[1])
    const watch = f.match(/^(\d{4}-\d{2}-\d{2})\.watch\.json$/)
    if (watch) keys.add(watch[1])
  }
  return [...keys].filter((d) => d >= from && d <= to).sort()
}

function buildTransitions(
  segments: ActivitySegment[],
): { from: string; to: string; count: number }[] {
  const map = new Map<string, number>()
  for (const seg of segments) {
    if (!seg.prevApp || seg.prevApp === seg.app || seg.category === 'afk') continue
    const key = `${seg.prevApp}\t${seg.app}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split('\t')
      return { from, to, count }
    })
    .sort((a, b) => b.count - a.count)
}

export async function exportActivity(opts: {
  format: ActivityExportFormat
  from?: string
  to?: string
}): Promise<{ ok: boolean; path?: string; message?: string }> {
  const from = opts.from && /^\d{4}-\d{2}-\d{2}$/.test(opts.from) ? opts.from : todayKey()
  const to = opts.to && /^\d{4}-\d{2}-\d{2}$/.test(opts.to) ? opts.to : from
  const dates = listDayFilesInRange(from, to)
  const segments: ActivitySegment[] = []
  for (const d of dates) {
    segments.push(...readDaySegments(d))
  }
  const live = liveOpenSegment()
  if (live) {
    const liveDay = todayKey(new Date(live.start))
    if (liveDay >= from && liveDay <= to) segments.push(live)
  }

  const feedback = readFeedbackEntries().filter((e) => {
    const day = e.at.slice(0, 10)
    return day >= from && day <= to
  })
  const focusJournal = readFocusJournalInRange(from, to)

  const defaultName =
    opts.format === 'csv'
      ? `lattice-activity-${from}_${to}.csv`
      : `lattice-activity-${from}_${to}.json`

  const result = await dialog.showSaveDialog({
    title: 'Exporter l’activité',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters:
      opts.format === 'csv'
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : [{ name: 'JSON', extensions: ['json'] }],
  })
  if (result.canceled || !result.filePath) {
    return { ok: false, message: 'Export annulé.' }
  }

  try {
    if (opts.format === 'json') {
      const payload = {
        from,
        to,
        exportedAt: new Date().toISOString(),
        segments,
        feedback,
        focusJournal,
        transitions: buildTransitions(segments),
        summaries: dates.map((d) => buildSummary(d)),
        watchByDay: Object.fromEntries(dates.map((d) => [d, readWatchMap(d)])),
      }
      fs.writeFileSync(result.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    } else {
      const header = [
        'start',
        'end',
        'app',
        'title',
        'category',
        'durationMs',
        'categorySource',
        'matchedPattern',
        'confidence',
        'idleSec',
        'prevApp',
        'sessionId',
        'exeDir',
        'titleHash',
        'domain',
        'urlPath',
        'contextKind',
        'fileName',
        'projectName',
        'ignored',
        'focusSessionId',
        'notionTaskId',
        'notionTaskTitle',
      ].join(',')
      const rows = segments.map((s) => {
        const title = (s.title ?? '').replace(/"/g, '""')
        const taskTitle = (s.notionTaskTitle ?? '').replace(/"/g, '""')
        return [
          s.start,
          s.end,
          s.app,
          `"${title}"`,
          s.category,
          String(segmentMs(s)),
          s.categorySource ?? '',
          s.matchedPattern ?? '',
          s.confidence ?? '',
          s.idleSec != null ? String(s.idleSec) : '',
          s.prevApp ?? '',
          s.sessionId ?? '',
          s.exeDir ?? '',
          s.titleHash ?? '',
          s.domain ?? '',
          s.urlPath ?? '',
          s.contextKind ?? '',
          s.fileName ?? '',
          s.projectName ?? '',
          s.ignored ? '1' : '0',
          s.focusSessionId ?? '',
          s.notionTaskId ?? '',
          `"${taskTitle}"`,
        ].join(',')
      })
      const watchHeader = 'date,domain,watchMs,kind'
      const watchRows: string[] = []
      for (const d of dates) {
        for (const [domain, ms] of Object.entries(readWatchMap(d))) {
          watchRows.push([d, domain, String(ms), 'watch'].join(','))
        }
      }
      fs.writeFileSync(
        result.filePath,
        `${[header, ...rows].join('\n')}\n\n${[watchHeader, ...watchRows].join('\n')}\n`,
        'utf8',
      )
    }
    return { ok: true, path: result.filePath }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Échec de l’export.',
    }
  }
}

export function handleActivitySuspend(): void {
  if (!running || settings.paused) return
  pendingSwitch = null
  closeOpenSegment()
  currentSessionId = null
  emitSummary()
}

export function handleActivityResume(): void {
  if (!running || settings.paused) return
  void pollOnce()
}

/** Efface l’historique (jours + feedback). Conserve settings et rules. */
export function clearActivityData(): {
  ok: boolean
  message: string
  summary: ActivityDaySummary
} {
  loadActivityState()
  // Ne pas flusher le segment ouvert — on jette l’historique en cours aussi.
  pendingSwitch = null
  openSegment = null
  pollsSinceFlush = 0
  lastApp = null
  currentSessionId = null
  dayCacheKey = null
  dayCacheSegments = []
  feedbackCountCache = null
  invalidateWatchCache()

  let removed = 0
  try {
    ensureDirs()
    if (fs.existsSync(daysDir())) {
      for (const name of fs.readdirSync(daysDir())) {
        if (!name.endsWith('.jsonl') && !name.endsWith('.watch.json')) continue
        fs.unlinkSync(path.join(daysDir(), name))
        removed += 1
      }
    }
    if (fs.existsSync(feedbackPath())) {
      fs.unlinkSync(feedbackPath())
      removed += 1
    }
    clearFocusJournalFile()
    stopFocusSession()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Échec de la suppression.'
    emitSummary()
    return {
      ok: false,
      message,
      summary: lastSummary ?? getActivitySummary(),
    }
  }

  emitSummary()
  return {
    ok: true,
    message:
      removed > 0
        ? 'Historique d’activité effacé (règles conservées).'
        : 'Aucune donnée à effacer.',
    summary: lastSummary ?? getActivitySummary(),
  }
}

export { CATEGORIES }

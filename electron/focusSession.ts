/**
 * Focus sessions linked to a Notion task + off-allowlist interrupt journal.
 * State under userData/activity/ (focus-session.json, focus-journal.jsonl).
 */
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import type {
  FocusAllowlist,
  FocusInterruptAction,
  FocusInterruptContext,
  FocusJournalEntry,
  FocusSession,
  ResolveFocusInterruptPayload,
  StartFocusSessionPayload,
} from '../shared/types'
import { normalizeDomain } from './activityContext'
import {
  activityDir,
  focusJournalPath,
  focusSessionPath,
  isDayKey,
  todayKey,
} from './activity/paths'
import { normalizeAppKey } from './activity/normalize'

const DEFAULT_APPS = ['cursor', 'code', 'code - insiders', 'notion', 'windowsterminal', 'powershell', 'pwsh']

type FocusChangedListener = (session: FocusSession | null) => void
type FocusInterruptListener = (ctx: FocusInterruptContext) => void

let session: FocusSession | null = null
let pendingInterrupt: FocusInterruptContext | null = null
let offProjectSinceMs: number | null = null
let stateLoaded = false
let onChanged: FocusChangedListener | null = null
let onInterrupt: FocusInterruptListener | null = null

function ensureDirs(): void {
  fs.mkdirSync(activityDir(), { recursive: true })
}

function normalizeProject(name: string): string {
  return name.trim().toLowerCase()
}

function uniqNormalized(values: string[], normalize: (v: string) => string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of values) {
    if (typeof raw !== 'string') continue
    const n = normalize(raw)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

function sanitizeAllowlist(raw?: Partial<FocusAllowlist> | null): FocusAllowlist {
  return {
    apps: uniqNormalized([...(raw?.apps ?? [])], normalizeAppKey),
    domains: uniqNormalized([...(raw?.domains ?? [])], normalizeDomain),
    ideProjects: uniqNormalized([...(raw?.ideProjects ?? [])], normalizeProject),
  }
}

function defaultAllowlist(seed?: Partial<FocusAllowlist>): FocusAllowlist {
  return sanitizeAllowlist({
    apps: [...DEFAULT_APPS, ...(seed?.apps ?? [])],
    domains: [...(seed?.domains ?? [])],
    ideProjects: [...(seed?.ideProjects ?? [])],
  })
}

function domainMatches(allowed: string[], domain: string | null): boolean {
  if (!domain) return false
  const d = normalizeDomain(domain)
  return allowed.some((a) => d === a || d.endsWith(`.${a}`))
}

export function isOnFocusAllowlist(
  allowlist: FocusAllowlist,
  sample: { app: string; domain: string | null; projectName: string | null },
): boolean {
  const appKey = normalizeAppKey(sample.app)
  if (allowlist.apps.includes(appKey)) return true
  if (sample.projectName && allowlist.ideProjects.includes(normalizeProject(sample.projectName))) {
    return true
  }
  if (domainMatches(allowlist.domains, sample.domain)) return true
  return false
}

function emitChanged(): void {
  onChanged?.(session ? structuredClone(session) : null)
}

function persistSession(): void {
  ensureDirs()
  if (!session) {
    if (fs.existsSync(focusSessionPath())) {
      try {
        fs.unlinkSync(focusSessionPath())
      } catch {
        /* ignore */
      }
    }
    return
  }
  fs.writeFileSync(focusSessionPath(), `${JSON.stringify(session, null, 2)}\n`, 'utf8')
}

function loadPersistedSession(): void {
  if (stateLoaded) return
  stateLoaded = true
  try {
    if (!fs.existsSync(focusSessionPath())) return
    const raw = JSON.parse(fs.readFileSync(focusSessionPath(), 'utf8')) as Partial<FocusSession>
    if (!raw?.id || !raw.notionTaskId || !raw.startedAt) return
    session = {
      id: String(raw.id),
      notionTaskId: String(raw.notionTaskId),
      notionTaskTitle: String(raw.notionTaskTitle ?? 'Sans titre'),
      databaseId: String(raw.databaseId ?? ''),
      startedAt: String(raw.startedAt),
      status: raw.status === 'paused' || raw.status === 'interrupted' ? raw.status : 'active',
      allowlist: sanitizeAllowlist(raw.allowlist),
    }
    // Don't auto-reopen an interrupt modal after restart — resume as paused if interrupted.
    if (session.status === 'interrupted') {
      session.status = 'paused'
      persistSession()
    }
  } catch {
    session = null
  }
}

export function setFocusSessionListeners(opts: {
  onChanged?: FocusChangedListener | null
  onInterrupt?: FocusInterruptListener | null
}): void {
  if ('onChanged' in opts) onChanged = opts.onChanged ?? null
  if ('onInterrupt' in opts) onInterrupt = opts.onInterrupt ?? null
}

export function getFocusSession(): FocusSession | null {
  loadPersistedSession()
  return session ? structuredClone(session) : null
}

export function getPendingFocusInterrupt(): FocusInterruptContext | null {
  return pendingInterrupt ? structuredClone(pendingInterrupt) : null
}

/** Attribution for activity segments — only while session is actively guarded. */
export function getFocusAttribution(): {
  focusSessionId: string
  notionTaskId: string
  notionTaskTitle: string
} | null {
  loadPersistedSession()
  if (!session || session.status !== 'active') return null
  return {
    focusSessionId: session.id,
    notionTaskId: session.notionTaskId,
    notionTaskTitle: session.notionTaskTitle,
  }
}

export function startFocusSession(payload: StartFocusSessionPayload): {
  ok: boolean
  session?: FocusSession
  message?: string
} {
  loadPersistedSession()
  if (!payload?.notionTaskId || !payload.notionTaskTitle) {
    return { ok: false, message: 'Tâche Notion invalide.' }
  }
  pendingInterrupt = null
  offProjectSinceMs = null
  session = {
    id: randomUUID(),
    notionTaskId: payload.notionTaskId,
    notionTaskTitle: payload.notionTaskTitle.trim() || 'Sans titre',
    databaseId: payload.databaseId ?? '',
    startedAt: new Date().toISOString(),
    status: 'active',
    allowlist: defaultAllowlist(payload.seedAllowlist),
  }
  persistSession()
  emitChanged()
  return { ok: true, session: structuredClone(session) }
}

export function stopFocusSession(): FocusSession | null {
  loadPersistedSession()
  session = null
  pendingInterrupt = null
  offProjectSinceMs = null
  persistSession()
  emitChanged()
  return null
}

export function pauseFocusSession(): FocusSession | null {
  loadPersistedSession()
  if (!session) return null
  session = { ...session, status: 'paused' }
  pendingInterrupt = null
  offProjectSinceMs = null
  persistSession()
  emitChanged()
  return structuredClone(session)
}

export function resumeFocusSession(): FocusSession | null {
  loadPersistedSession()
  if (!session) return null
  session = { ...session, status: 'active' }
  pendingInterrupt = null
  offProjectSinceMs = null
  persistSession()
  emitChanged()
  return structuredClone(session)
}

export function updateFocusAllowlist(patch: Partial<FocusAllowlist>): FocusSession | null {
  loadPersistedSession()
  if (!session) return null
  session = {
    ...session,
    allowlist: sanitizeAllowlist({
      apps: patch.apps ?? session.allowlist.apps,
      domains: patch.domains ?? session.allowlist.domains,
      ideProjects: patch.ideProjects ?? session.allowlist.ideProjects,
    }),
  }
  persistSession()
  emitChanged()
  return structuredClone(session)
}

function appendJournal(entry: FocusJournalEntry): void {
  ensureDirs()
  fs.appendFileSync(focusJournalPath(), `${JSON.stringify(entry)}\n`, 'utf8')
}

export function getFocusJournal(date?: string): FocusJournalEntry[] {
  const key = date && isDayKey(date) ? date : todayKey()

  if (!fs.existsSync(focusJournalPath())) return []
  const out: FocusJournalEntry[] = []
  for (const line of fs.readFileSync(focusJournalPath(), 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed) as FocusJournalEntry
      if (entry.ts?.slice(0, 10) === key) out.push(entry)
    } catch {
      /* skip */
    }
  }
  return out
}

export function readFocusJournalInRange(from: string, to: string): FocusJournalEntry[] {
  if (!fs.existsSync(focusJournalPath())) return []
  const out: FocusJournalEntry[] = []
  for (const line of fs.readFileSync(focusJournalPath(), 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed) as FocusJournalEntry
      const day = entry.ts?.slice(0, 10)
      if (day && day >= from && day <= to) out.push(entry)
    } catch {
      /* skip */
    }
  }
  return out
}

export function clearFocusJournalFile(): void {
  if (fs.existsSync(focusJournalPath())) {
    try {
      fs.unlinkSync(focusJournalPath())
    } catch {
      /* ignore */
    }
  }
}

function beginInterrupt(sample: {
  app: string
  title: string | null
  domain: string | null
  projectName: string | null
}): boolean {
  if (!session || session.status !== 'active' || pendingInterrupt) return false
  pendingInterrupt = {
    app: sample.app,
    title: sample.title,
    domain: sample.domain,
    projectName: sample.projectName,
    notionTaskId: session.notionTaskId,
    notionTaskTitle: session.notionTaskTitle,
    sessionId: session.id,
  }
  session = { ...session, status: 'interrupted' }
  offProjectSinceMs = null
  persistSession()
  emitChanged()
  onInterrupt?.(structuredClone(pendingInterrupt))
  return true
}

/**
 * Called from the activity poll with the current stable focus sample.
 * Returns true when an interrupt was just triggered (caller should close on-task segment).
 */
export function evaluateFocusGuard(sample: {
  nowMs: number
  app: string
  title: string | null
  domain: string | null
  projectName: string | null
  ignored: boolean
  idle: boolean
  dwellSec: number
}): { interrupted: boolean } {
  loadPersistedSession()
  if (!session || session.status !== 'active') {
    offProjectSinceMs = null
    return { interrupted: false }
  }
  if (sample.idle || sample.ignored || sample.app === 'afk') {
    offProjectSinceMs = null
    return { interrupted: false }
  }
  if (
    isOnFocusAllowlist(session.allowlist, {
      app: sample.app,
      domain: sample.domain,
      projectName: sample.projectName,
    })
  ) {
    offProjectSinceMs = null
    return { interrupted: false }
  }

  const dwellMs = Math.max(3, sample.dwellSec) * 1000
  if (offProjectSinceMs == null) {
    offProjectSinceMs = sample.nowMs
    return { interrupted: false }
  }
  if (sample.nowMs - offProjectSinceMs < dwellMs) {
    return { interrupted: false }
  }
  const triggered = beginInterrupt(sample)
  return { interrupted: triggered }
}

export function resolveFocusInterrupt(payload: ResolveFocusInterruptPayload): {
  ok: boolean
  session: FocusSession | null
  message?: string
} {
  loadPersistedSession()
  if (!session) {
    return { ok: false, session: null, message: 'Aucune session focus.' }
  }
  if (!pendingInterrupt && session.status !== 'interrupted') {
    return { ok: false, session: structuredClone(session), message: 'Aucune interruption en cours.' }
  }

  const action: FocusInterruptAction =
    payload.action === 'allow_once' ||
    payload.action === 'pause' ||
    payload.action === 'stop' ||
    payload.action === 'resume'
      ? payload.action
      : 'resume'

  const ctx = pendingInterrupt ?? {
    app: 'unknown',
    title: null,
    domain: null,
    projectName: null,
    notionTaskId: session.notionTaskId,
    notionTaskTitle: session.notionTaskTitle,
    sessionId: session.id,
  }

  appendJournal({
    ts: new Date().toISOString(),
    sessionId: session.id,
    notionTaskId: session.notionTaskId,
    app: ctx.app,
    title: ctx.title,
    domain: ctx.domain,
    projectName: ctx.projectName,
    note: (payload.note ?? '').trim(),
    action,
  })

  pendingInterrupt = null
  offProjectSinceMs = null

  if (action === 'stop') {
    session = null
    persistSession()
    emitChanged()
    return { ok: true, session: null }
  }

  if (action === 'pause') {
    session = { ...session, status: 'paused' }
    persistSession()
    emitChanged()
    return { ok: true, session: structuredClone(session) }
  }

  if (action === 'allow_once') {
    const apps = [...session.allowlist.apps]
    const domains = [...session.allowlist.domains]
    const ideProjects = [...session.allowlist.ideProjects]
    const appKey = normalizeAppKey(ctx.app)
    if (appKey && appKey !== 'unknown' && !apps.includes(appKey)) apps.push(appKey)
    if (ctx.domain) {
      const d = normalizeDomain(ctx.domain)
      if (d && !domains.includes(d)) domains.push(d)
    }
    if (ctx.projectName) {
      const p = normalizeProject(ctx.projectName)
      if (p && !ideProjects.includes(p)) ideProjects.push(p)
    }
    session = {
      ...session,
      status: 'active',
      allowlist: { apps, domains, ideProjects },
    }
    persistSession()
    emitChanged()
    return { ok: true, session: structuredClone(session) }
  }

  // resume
  session = { ...session, status: 'active' }
  persistSession()
  emitChanged()
  return { ok: true, session: structuredClone(session) }
}

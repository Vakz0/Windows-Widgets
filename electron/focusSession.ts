/**
 * Focus sessions linked to a Notion task + off-allowlist interrupt journal.
 * State under userData/activity/ (focus-session.json, focus-journal.jsonl).
 */
import fs from 'node:fs'
<<<<<<< HEAD
import fsp from 'node:fs/promises'
=======
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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

<<<<<<< HEAD
function isOnFocusAllowlist(
=======
export function isOnFocusAllowlist(
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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

<<<<<<< HEAD
async function persistSession(): Promise<void> {
  ensureDirs()
  const file = focusSessionPath()
  if (!session) {
    try {
      await fsp.access(file)
      try {
        await fsp.unlink(file)
      } catch (err) {
        console.debug('persistSession: unlink ignored', err)
      }
    } catch {
      // file absent
    }
    return
  }
  await fsp.writeFile(file, `${JSON.stringify(session, null, 2)}\n`, 'utf8')
}

async function loadPersistedSession(): Promise<void> {
  if (stateLoaded) return
  stateLoaded = true
  try {
    const file = focusSessionPath()
    try {
      await fsp.access(file)
    } catch {
      return
    }
    const raw = JSON.parse(await fsp.readFile(file, 'utf8')) as Partial<FocusSession>
=======
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
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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
<<<<<<< HEAD
      await persistSession()
    }
  } catch (err) {
    console.debug('loadPersistedSession: ignored', err)
=======
      persistSession()
    }
  } catch {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    session = null
  }
}

<<<<<<< HEAD
/** Ensure persisted focus state is loaded (idempotent). */
export async function ensureFocusSessionLoaded(): Promise<void> {
  await loadPersistedSession()
}

=======
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
export function setFocusSessionListeners(opts: {
  onChanged?: FocusChangedListener | null
  onInterrupt?: FocusInterruptListener | null
}): void {
  if ('onChanged' in opts) onChanged = opts.onChanged ?? null
  if ('onInterrupt' in opts) onInterrupt = opts.onInterrupt ?? null
}

<<<<<<< HEAD
/** In-memory snapshot (no I/O). Call ensureFocusSessionLoaded() first when needed. */
export function getFocusSession(): FocusSession | null {
=======
export function getFocusSession(): FocusSession | null {
  loadPersistedSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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
<<<<<<< HEAD
=======
  loadPersistedSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  if (!session || session.status !== 'active') return null
  return {
    focusSessionId: session.id,
    notionTaskId: session.notionTaskId,
    notionTaskTitle: session.notionTaskTitle,
  }
}

<<<<<<< HEAD
export async function startFocusSession(payload: StartFocusSessionPayload): Promise<{
  ok: boolean
  session?: FocusSession
  message?: string
}> {
  await loadPersistedSession()
=======
export function startFocusSession(payload: StartFocusSessionPayload): {
  ok: boolean
  session?: FocusSession
  message?: string
} {
  loadPersistedSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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
<<<<<<< HEAD
  await persistSession()
=======
  persistSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  emitChanged()
  return { ok: true, session: structuredClone(session) }
}

<<<<<<< HEAD
export async function stopFocusSession(): Promise<FocusSession | null> {
  await loadPersistedSession()
  session = null
  pendingInterrupt = null
  offProjectSinceMs = null
  await persistSession()
=======
export function stopFocusSession(): FocusSession | null {
  loadPersistedSession()
  session = null
  pendingInterrupt = null
  offProjectSinceMs = null
  persistSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  emitChanged()
  return null
}

<<<<<<< HEAD
export async function pauseFocusSession(): Promise<FocusSession | null> {
  await loadPersistedSession()
=======
export function pauseFocusSession(): FocusSession | null {
  loadPersistedSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  if (!session) return null
  session = { ...session, status: 'paused' }
  pendingInterrupt = null
  offProjectSinceMs = null
<<<<<<< HEAD
  await persistSession()
=======
  persistSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  emitChanged()
  return structuredClone(session)
}

<<<<<<< HEAD
export async function resumeFocusSession(): Promise<FocusSession | null> {
  await loadPersistedSession()
=======
export function resumeFocusSession(): FocusSession | null {
  loadPersistedSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  if (!session) return null
  session = { ...session, status: 'active' }
  pendingInterrupt = null
  offProjectSinceMs = null
<<<<<<< HEAD
  await persistSession()
=======
  persistSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  emitChanged()
  return structuredClone(session)
}

<<<<<<< HEAD
export async function updateFocusAllowlist(patch: Partial<FocusAllowlist>): Promise<FocusSession | null> {
  await loadPersistedSession()
=======
export function updateFocusAllowlist(patch: Partial<FocusAllowlist>): FocusSession | null {
  loadPersistedSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  if (!session) return null
  session = {
    ...session,
    allowlist: sanitizeAllowlist({
      apps: patch.apps ?? session.allowlist.apps,
      domains: patch.domains ?? session.allowlist.domains,
      ideProjects: patch.ideProjects ?? session.allowlist.ideProjects,
    }),
  }
<<<<<<< HEAD
  await persistSession()
=======
  persistSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  emitChanged()
  return structuredClone(session)
}

<<<<<<< HEAD
async function appendJournal(entry: FocusJournalEntry): Promise<void> {
  ensureDirs()
  await fsp.appendFile(focusJournalPath(), `${JSON.stringify(entry)}\n`, 'utf8')
}

export async function getFocusJournal(date?: string): Promise<FocusJournalEntry[]> {
  const key = date && isDayKey(date) ? date : todayKey()
  const file = focusJournalPath()
  try {
    await fsp.access(file)
  } catch {
    return []
  }
  const out: FocusJournalEntry[] = []
  for (const line of (await fsp.readFile(file, 'utf8')).split(/\r?\n/)) {
=======
function appendJournal(entry: FocusJournalEntry): void {
  ensureDirs()
  fs.appendFileSync(focusJournalPath(), `${JSON.stringify(entry)}\n`, 'utf8')
}

export function getFocusJournal(date?: string): FocusJournalEntry[] {
  const key = date && isDayKey(date) ? date : todayKey()

  if (!fs.existsSync(focusJournalPath())) return []
  const out: FocusJournalEntry[] = []
  for (const line of fs.readFileSync(focusJournalPath(), 'utf8').split(/\r?\n/)) {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed) as FocusJournalEntry
      if (entry.ts?.slice(0, 10) === key) out.push(entry)
<<<<<<< HEAD
    } catch (err) {
      console.debug('getFocusJournal: skip bad line', err)
=======
    } catch {
      /* skip */
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    }
  }
  return out
}

<<<<<<< HEAD
export async function readFocusJournalInRange(from: string, to: string): Promise<FocusJournalEntry[]> {
  const file = focusJournalPath()
  try {
    await fsp.access(file)
  } catch {
    return []
  }
  const out: FocusJournalEntry[] = []
  for (const line of (await fsp.readFile(file, 'utf8')).split(/\r?\n/)) {
=======
export function readFocusJournalInRange(from: string, to: string): FocusJournalEntry[] {
  if (!fs.existsSync(focusJournalPath())) return []
  const out: FocusJournalEntry[] = []
  for (const line of fs.readFileSync(focusJournalPath(), 'utf8').split(/\r?\n/)) {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed) as FocusJournalEntry
      const day = entry.ts?.slice(0, 10)
      if (day && day >= from && day <= to) out.push(entry)
<<<<<<< HEAD
    } catch (err) {
      console.debug('readFocusJournalInRange: skip bad line', err)
=======
    } catch {
      /* skip */
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    }
  }
  return out
}

<<<<<<< HEAD
export async function clearFocusJournalFile(): Promise<void> {
  const file = focusJournalPath()
  try {
    await fsp.access(file)
    try {
      await fsp.unlink(file)
    } catch (err) {
      console.debug('clearFocusJournalFile: unlink ignored', err)
    }
  } catch {
    // absent
  }
}

async function beginInterrupt(sample: {
=======
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
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  app: string
  title: string | null
  domain: string | null
  projectName: string | null
<<<<<<< HEAD
}): Promise<boolean> {
=======
}): boolean {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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
<<<<<<< HEAD
  await persistSession()
=======
  persistSession()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  emitChanged()
  onInterrupt?.(structuredClone(pendingInterrupt))
  return true
}

<<<<<<< HEAD
/** Pure check: dwell elapsed off-allowlist while session is actively guarded. */
function shouldBeginInterrupt(
  activeSession: FocusSession,
  sample: {
    nowMs: number
    app: string
    domain: string | null
    projectName: string | null
    ignored: boolean
    idle: boolean
    dwellSec: number
  },
  offSince: number | null,
): { begin: boolean; nextOffSince: number | null } {
  if (activeSession.status !== 'active') {
    return { begin: false, nextOffSince: null }
  }
  if (sample.idle || sample.ignored || sample.app === 'afk') {
    return { begin: false, nextOffSince: null }
  }
  if (
    isOnFocusAllowlist(activeSession.allowlist, {
      app: sample.app,
      domain: sample.domain,
      projectName: sample.projectName,
    })
  ) {
    return { begin: false, nextOffSince: null }
  }

  const dwellMs = Math.max(3, sample.dwellSec) * 1000
  if (offSince === null || offSince === undefined) {
    return { begin: false, nextOffSince: sample.nowMs }
  }
  if (sample.nowMs - offSince < dwellMs) {
    return { begin: false, nextOffSince: offSince }
  }
  return { begin: true, nextOffSince: offSince }
}

=======
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
/**
 * Called from the activity poll with the current stable focus sample.
 * Returns true when an interrupt was just triggered (caller should close on-task segment).
 */
<<<<<<< HEAD
export async function evaluateFocusGuard(sample: {
=======
export function evaluateFocusGuard(sample: {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  nowMs: number
  app: string
  title: string | null
  domain: string | null
  projectName: string | null
  ignored: boolean
  idle: boolean
  dwellSec: number
<<<<<<< HEAD
}): Promise<{ interrupted: boolean }> {
  await loadPersistedSession()
  if (!session) {
    offProjectSinceMs = null
    return { interrupted: false }
  }
  const decision = shouldBeginInterrupt(session, sample, offProjectSinceMs)
  offProjectSinceMs = decision.nextOffSince
  if (!decision.begin) return { interrupted: false }
  const triggered = await beginInterrupt(sample)
  return { interrupted: triggered }
}

function applyInterruptAction(
  current: FocusSession,
  action: FocusInterruptAction,
  ctx: FocusInterruptContext,
): FocusSession | null {
  if (action === 'stop') {
    return null
  }

  if (action === 'pause') {
    return { ...current, status: 'paused' }
  }

  if (action === 'allow_once') {
    const apps = [...current.allowlist.apps]
    const domains = [...current.allowlist.domains]
    const ideProjects = [...current.allowlist.ideProjects]
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
    return {
      ...current,
      status: 'active',
      allowlist: { apps, domains, ideProjects },
    }
  }

  // resume
  return { ...current, status: 'active' }
}

export async function resolveFocusInterrupt(payload: ResolveFocusInterruptPayload): Promise<{
  ok: boolean
  session: FocusSession | null
  message?: string
}> {
  await loadPersistedSession()
=======
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
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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

<<<<<<< HEAD
  await appendJournal({
=======
  appendJournal({
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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

<<<<<<< HEAD
  session = applyInterruptAction(session, action, ctx)
  await persistSession()
  emitChanged()
  return { ok: true, session: session ? structuredClone(session) : null }
=======
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
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
}

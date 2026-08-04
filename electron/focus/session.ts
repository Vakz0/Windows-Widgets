/**
 * Focus sessions linked to a Notion task + off-allowlist interrupt journal.
 */
import { randomUUID } from 'node:crypto'
import type {
  FocusAllowlist,
  FocusInterruptAction,
  FocusInterruptContext,
  FocusSession,
  ResolveFocusInterruptPayload,
  StartFocusSessionPayload,
} from '../../shared/types'
import { sanitizeFocusAllowlist } from '../activity/focusAllowlist'
import { applyInterruptAction, shouldBeginInterrupt } from './guard'
import {
  appendFocusJournal,
  clearFocusJournalFile,
  getFocusJournal,
  readFocusJournalInRange,
  readFocusSessionFile,
  writeFocusSessionFile,
} from './persist'

export { clearFocusJournalFile, getFocusJournal, readFocusJournalInRange }

const DEFAULT_APPS = ['cursor', 'code', 'code - insiders', 'notion', 'windowsterminal', 'powershell', 'pwsh']

type FocusChangedListener = (session: FocusSession | null) => void
type FocusInterruptListener = (ctx: FocusInterruptContext) => void

let session: FocusSession | null = null
let pendingInterrupt: FocusInterruptContext | null = null
let offProjectSinceMs: number | null = null
let stateLoaded = false
let onChanged: FocusChangedListener | null = null
let onInterrupt: FocusInterruptListener | null = null

function defaultAllowlist(seed?: Partial<FocusAllowlist>): FocusAllowlist {
  return sanitizeFocusAllowlist({
    apps: [...DEFAULT_APPS, ...(seed?.apps ?? [])],
    domains: [...(seed?.domains ?? [])],
    ideProjects: [...(seed?.ideProjects ?? [])],
    urls: [...(seed?.urls ?? [])],
  })
}

function emitChanged(): void {
  onChanged?.(session ? structuredClone(session) : null)
}

async function persistSession(): Promise<void> {
  await writeFocusSessionFile(session)
}

async function loadPersistedSession(): Promise<void> {
  if (stateLoaded) return
  stateLoaded = true
  const loaded = await readFocusSessionFile()
  if (!loaded) {
    session = null
    return
  }
  session = loaded
  // Don't auto-reopen an interrupt modal after restart — resume as paused if interrupted.
  if (session.status === 'interrupted') {
    session = { ...session, status: 'paused' }
    await persistSession()
  }
}

/** Ensure persisted focus state is loaded (idempotent). */
export async function ensureFocusSessionLoaded(): Promise<void> {
  await loadPersistedSession()
}

export function setFocusSessionListeners(opts: {
  onChanged?: FocusChangedListener | null
  onInterrupt?: FocusInterruptListener | null
}): void {
  if ('onChanged' in opts) onChanged = opts.onChanged ?? null
  if ('onInterrupt' in opts) onInterrupt = opts.onInterrupt ?? null
}

/** In-memory snapshot (no I/O). Call ensureFocusSessionLoaded() first when needed. */
export function getFocusSession(): FocusSession | null {
  return session ? structuredClone(session) : null
}

/** True when a focus session exists (no clone). */
export function hasFocusSession(): boolean {
  return session != null
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
  if (!session || session.status !== 'active') return null
  return {
    focusSessionId: session.id,
    notionTaskId: session.notionTaskId,
    notionTaskTitle: session.notionTaskTitle,
  }
}

export async function startFocusSession(payload: StartFocusSessionPayload): Promise<{
  ok: boolean
  session?: FocusSession
  message?: string
}> {
  await loadPersistedSession()
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
  await persistSession()
  emitChanged()
  return { ok: true, session: structuredClone(session) }
}

export async function stopFocusSession(): Promise<FocusSession | null> {
  await loadPersistedSession()
  session = null
  pendingInterrupt = null
  offProjectSinceMs = null
  await persistSession()
  emitChanged()
  return null
}

export async function pauseFocusSession(): Promise<FocusSession | null> {
  await loadPersistedSession()
  if (!session) return null
  session = { ...session, status: 'paused' }
  pendingInterrupt = null
  offProjectSinceMs = null
  await persistSession()
  emitChanged()
  return structuredClone(session)
}

export async function resumeFocusSession(): Promise<FocusSession | null> {
  await loadPersistedSession()
  if (!session) return null
  session = { ...session, status: 'active' }
  pendingInterrupt = null
  offProjectSinceMs = null
  await persistSession()
  emitChanged()
  return structuredClone(session)
}

export async function updateFocusAllowlist(patch: Partial<FocusAllowlist>): Promise<FocusSession | null> {
  await loadPersistedSession()
  if (!session) return null
  session = {
    ...session,
    allowlist: sanitizeFocusAllowlist({
      apps: patch.apps ?? session.allowlist.apps,
      domains: patch.domains ?? session.allowlist.domains,
      ideProjects: patch.ideProjects ?? session.allowlist.ideProjects,
      urls: patch.urls ?? session.allowlist.urls,
    }),
  }
  await persistSession()
  emitChanged()
  return structuredClone(session)
}

async function beginInterrupt(sample: {
  app: string
  title: string | null
  domain: string | null
  urlPath: string | null
  projectName: string | null
}): Promise<boolean> {
  if (!session || session.status !== 'active' || pendingInterrupt) return false
  pendingInterrupt = {
    app: sample.app,
    title: sample.title,
    domain: sample.domain,
    urlPath: sample.urlPath,
    projectName: sample.projectName,
    notionTaskId: session.notionTaskId,
    notionTaskTitle: session.notionTaskTitle,
    sessionId: session.id,
  }
  session = { ...session, status: 'interrupted' }
  offProjectSinceMs = null
  await persistSession()
  emitChanged()
  onInterrupt?.(structuredClone(pendingInterrupt))
  return true
}

/**
 * Called from the activity poll with the current stable focus sample.
 * Returns true when an interrupt was just triggered (caller should close on-task segment).
 */
export async function evaluateFocusGuard(sample: {
  nowMs: number
  app: string
  title: string | null
  domain: string | null
  urlPath: string | null
  projectName: string | null
  ignored: boolean
  idle: boolean
  dwellSec: number
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

export async function resolveFocusInterrupt(payload: ResolveFocusInterruptPayload): Promise<{
  ok: boolean
  session: FocusSession | null
  message?: string
}> {
  await loadPersistedSession()
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

  const note = (payload.note ?? '').trim()
  if (action !== 'resume' && !note) {
    return {
      ok: false,
      session: structuredClone(session),
      message: 'Une raison est obligatoire pour cette action.',
    }
  }

  const ctx = pendingInterrupt ?? {
    app: 'unknown',
    title: null,
    domain: null,
    urlPath: null,
    projectName: null,
    notionTaskId: session.notionTaskId,
    notionTaskTitle: session.notionTaskTitle,
    sessionId: session.id,
  }

  await appendFocusJournal({
    ts: new Date().toISOString(),
    sessionId: session.id,
    notionTaskId: session.notionTaskId,
    app: ctx.app,
    title: ctx.title,
    domain: ctx.domain,
    projectName: ctx.projectName,
    note,
    action,
  })

  pendingInterrupt = null
  offProjectSinceMs = null

  session = applyInterruptAction(session, action, ctx)
  await persistSession()
  emitChanged()
  return { ok: true, session: session ? structuredClone(session) : null }
}

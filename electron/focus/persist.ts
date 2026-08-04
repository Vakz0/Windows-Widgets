/**
 * Focus session + journal persistence under userData/activity/.
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import type { FocusJournalEntry, FocusSession } from '../../shared/types'
import { sanitizeFocusAllowlist } from '../activity/focusAllowlist'
import {
  activityDir,
  assertWithin,
  focusJournalPath,
  focusSessionPath,
  isDayKey,
  todayKey,
} from '../activity/paths'

export function ensureFocusDirs(): void {
  fs.mkdirSync(activityDir(), { recursive: true })
}

export async function writeFocusSessionFile(session: FocusSession | null): Promise<void> {
  ensureFocusDirs()
  const file = assertWithin(activityDir(), focusSessionPath())
  if (!session) {
    try {
      await fsp.access(file)
      try {
        await fsp.unlink(file)
      } catch (err) {
        console.debug('writeFocusSessionFile: unlink ignored', err)
      }
    } catch {
      // file absent
    }
    return
  }
  await fsp.writeFile(file, `${JSON.stringify(session, null, 2)}\n`, 'utf8')
}

export async function readFocusSessionFile(): Promise<FocusSession | null> {
  try {
    const file = assertWithin(activityDir(), focusSessionPath())
    try {
      await fsp.access(file)
    } catch {
      return null
    }
    const raw = JSON.parse(await fsp.readFile(file, 'utf8')) as Partial<FocusSession>
    if (!raw?.id || !raw.notionTaskId || !raw.startedAt) return null
    const session: FocusSession = {
      id: String(raw.id),
      notionTaskId: String(raw.notionTaskId),
      notionTaskTitle: String(raw.notionTaskTitle ?? 'Sans titre'),
      databaseId: String(raw.databaseId ?? ''),
      startedAt: String(raw.startedAt),
      status: raw.status === 'paused' || raw.status === 'interrupted' ? raw.status : 'active',
      allowlist: sanitizeFocusAllowlist(raw.allowlist),
    }
    return session
  } catch (err) {
    console.debug('readFocusSessionFile: ignored', err)
    return null
  }
}

export async function appendFocusJournal(entry: FocusJournalEntry): Promise<void> {
  ensureFocusDirs()
  await fsp.appendFile(
    assertWithin(activityDir(), focusJournalPath()),
    `${JSON.stringify(entry)}\n`,
    'utf8',
  )
}

export async function getFocusJournal(date?: string): Promise<FocusJournalEntry[]> {
  const key = date && isDayKey(date) ? date : todayKey()
  const file = assertWithin(activityDir(), focusJournalPath())
  try {
    await fsp.access(file)
  } catch {
    return []
  }
  const out: FocusJournalEntry[] = []
  for (const line of (await fsp.readFile(file, 'utf8')).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed) as FocusJournalEntry
      if (entry.ts?.slice(0, 10) === key) out.push(entry)
    } catch (err) {
      console.debug('getFocusJournal: skip bad line', err)
    }
  }
  return out
}

export async function readFocusJournalInRange(from: string, to: string): Promise<FocusJournalEntry[]> {
  const file = assertWithin(activityDir(), focusJournalPath())
  try {
    await fsp.access(file)
  } catch {
    return []
  }
  const out: FocusJournalEntry[] = []
  for (const line of (await fsp.readFile(file, 'utf8')).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed) as FocusJournalEntry
      const day = entry.ts?.slice(0, 10)
      if (day && day >= from && day <= to) out.push(entry)
    } catch (err) {
      console.debug('readFocusJournalInRange: skip bad line', err)
    }
  }
  return out
}

export async function clearFocusJournalFile(): Promise<void> {
  const file = assertWithin(activityDir(), focusJournalPath())
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

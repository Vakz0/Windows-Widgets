import { describe, expect, it } from 'vitest'
import type { FocusInterruptContext, FocusSession } from '../../shared/types'
import { sanitizeFocusAllowlist } from '../activity/focusAllowlist'
import { applyInterruptAction, shouldBeginInterrupt } from './guard'

function session(partial?: Partial<FocusSession>): FocusSession {
  return {
    id: 's1',
    notionTaskId: 't1',
    notionTaskTitle: 'Task',
    databaseId: 'db',
    startedAt: new Date().toISOString(),
    status: 'active',
    allowlist: sanitizeFocusAllowlist({ apps: ['cursor'], domains: [], ideProjects: [], urls: [] }),
    ...partial,
  }
}

const baseSample = {
  nowMs: 10_000,
  app: 'spotify',
  title: null as string | null,
  domain: null as string | null,
  urlPath: null as string | null,
  projectName: null as string | null,
  ignored: false,
  idle: false,
  dwellSec: 8,
}

describe('shouldBeginInterrupt', () => {
  it('ignores paused sessions', () => {
    const result = shouldBeginInterrupt(session({ status: 'paused' }), baseSample, null)
    expect(result).toEqual({ begin: false, nextOffSince: null })
  })

  it('ignores idle / afk / ignored samples', () => {
    expect(shouldBeginInterrupt(session(), { ...baseSample, idle: true }, null).begin).toBe(false)
    expect(shouldBeginInterrupt(session(), { ...baseSample, ignored: true }, null).begin).toBe(false)
    expect(shouldBeginInterrupt(session(), { ...baseSample, app: 'afk' }, null).begin).toBe(false)
  })

  it('resets dwell when on allowlist', () => {
    const result = shouldBeginInterrupt(
      session(),
      { ...baseSample, app: 'cursor' },
      1000,
    )
    expect(result).toEqual({ begin: false, nextOffSince: null })
  })

  it('starts dwell timer then triggers after threshold', () => {
    const first = shouldBeginInterrupt(session(), baseSample, null)
    expect(first.begin).toBe(false)
    expect(first.nextOffSince).toBe(10_000)

    const early = shouldBeginInterrupt(session(), { ...baseSample, nowMs: 15_000 }, first.nextOffSince)
    expect(early.begin).toBe(false)

    const late = shouldBeginInterrupt(session(), { ...baseSample, nowMs: 19_000 }, first.nextOffSince)
    expect(late.begin).toBe(true)
  })
})

describe('applyInterruptAction', () => {
  const ctx: FocusInterruptContext = {
    app: 'notepad',
    title: null,
    domain: 'example.com',
    urlPath: null,
    projectName: null,
    notionTaskId: 't1',
    notionTaskTitle: 'Task',
    sessionId: 's1',
  }

  it('stops and pauses', () => {
    expect(applyInterruptAction(session(), 'stop', ctx)).toBeNull()
    expect(applyInterruptAction(session(), 'pause', ctx)?.status).toBe('paused')
    expect(applyInterruptAction(session(), 'resume', ctx)?.status).toBe('active')
  })

  it('allow_once adds non-browser app and domain', () => {
    const next = applyInterruptAction(session(), 'allow_once', ctx)
    expect(next?.status).toBe('active')
    expect(next?.allowlist.apps).toContain('notepad')
    expect(next?.allowlist.domains).toContain('example.com')
  })

  it('allow_once does not add whole browser app', () => {
    const next = applyInterruptAction(session(), 'allow_once', { ...ctx, app: 'chrome', domain: null })
    expect(next?.allowlist.apps).not.toContain('chrome')
  })
})

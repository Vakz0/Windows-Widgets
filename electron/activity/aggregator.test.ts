import { describe, expect, it } from 'vitest'
import type { ActivitySegment } from '../../shared/types'
import { buildSummary, buildTransitions } from './aggregator'
import { DEFAULT_SETTINGS } from './defaults'

function seg(partial: Partial<ActivitySegment> & Pick<ActivitySegment, 'app' | 'category'>): ActivitySegment {
  return {
    start: '2026-07-31T10:00:00.000Z',
    end: '2026-07-31T10:01:00.000Z',
    title: null,
    categorySource: 'app',
    matchedPattern: null,
    idleSec: 0,
    prevApp: null,
    sessionId: null,
    exeDir: null,
    titleHash: null,
    confidence: 'medium',
    domain: null,
    urlPath: null,
    contextKind: null,
    fileName: null,
    projectName: null,
    ignored: false,
    ...partial,
  }
}

const deps = {
  settings: { ...DEFAULT_SETTINGS },
  running: true,
  userDomainOverrides: null,
  countFeedbackOnDay: () => 0,
  getTopWatch: () => [],
  getFocusSession: () => null,
  isMediaKeepAwakeActive: () => false,
  isActiveUrlHelperAvailable: () => false,
}

describe('buildSummary', () => {
  it('aggregates countable time and skips ignored/afk from total', () => {
    const segments = [
      seg({ app: 'cursor', category: 'work' }),
      seg({
        app: 'afk',
        category: 'afk',
        start: '2026-07-31T10:01:00.000Z',
        end: '2026-07-31T10:02:00.000Z',
      }),
      seg({
        app: 'lattice',
        category: 'system',
        ignored: true,
        start: '2026-07-31T10:02:00.000Z',
        end: '2026-07-31T10:03:00.000Z',
      }),
    ]
    const summary = buildSummary('2026-07-31', segments, null, deps)
    expect(summary.totalMs).toBe(60_000)
    expect(summary.byCategory.work).toBe(60_000)
    expect(summary.byCategory.afk).toBe(60_000)
    expect(summary.topApps[0]?.app).toBe('cursor')
  })
})

describe('buildTransitions', () => {
  it('counts prevApp → app edges', () => {
    const segments = [
      seg({ app: 'chrome', category: 'work', prevApp: 'cursor' }),
      seg({ app: 'chrome', category: 'work', prevApp: 'cursor' }),
      seg({ app: 'slack', category: 'communication', prevApp: 'chrome' }),
    ]
    const t = buildTransitions(segments)
    expect(t[0]).toEqual({ from: 'cursor', to: 'chrome', count: 2 })
  })
})

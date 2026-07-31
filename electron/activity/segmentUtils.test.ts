import { describe, expect, it } from 'vitest'
import type { ActivitySegment } from '../../shared/types'
import { sameFocus, segmentMs, shouldPersistSegment } from './segmentUtils'

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

describe('sameFocus', () => {
  it('matches identical focus keys', () => {
    const a = seg({ app: 'chrome', category: 'work', title: 'A', domain: 'x.com' })
    const b = seg({ app: 'chrome', category: 'work', title: 'A', domain: 'x.com' })
    expect(sameFocus(a, b)).toBe(true)
  })

  it('differs on domain / file / project', () => {
    const a = seg({ app: 'chrome', category: 'work', domain: 'a.com' })
    const b = seg({ app: 'chrome', category: 'work', domain: 'b.com' })
    expect(sameFocus(a, b)).toBe(false)
  })
})

describe('segmentMs / shouldPersistSegment', () => {
  it('computes duration', () => {
    expect(
      segmentMs(
        seg({
          app: 'x',
          category: 'work',
          start: '2026-07-31T10:00:00.000Z',
          end: '2026-07-31T10:00:05.000Z',
        }),
      ),
    ).toBe(5000)
  })

  it('persists ignored only if >= 1s', () => {
    const short = seg({
      app: 'lattice',
      category: 'system',
      ignored: true,
      start: '2026-07-31T10:00:00.000Z',
      end: '2026-07-31T10:00:00.500Z',
    })
    const long = seg({
      app: 'lattice',
      category: 'system',
      ignored: true,
      start: '2026-07-31T10:00:00.000Z',
      end: '2026-07-31T10:00:01.000Z',
    })
    expect(shouldPersistSegment(short)).toBe(false)
    expect(shouldPersistSegment(long)).toBe(true)
  })
})

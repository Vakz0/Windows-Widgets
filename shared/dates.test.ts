import { describe, expect, it } from 'vitest'
import { extractDatabaseId, extractPageId } from './notionIds'
import { isDayKey, shiftDate, toIsoDate, todayKey } from './dates'
import { errorMessage } from './errors'

describe('shared/dates', () => {
  it('formats and shifts local calendar days', () => {
    expect(toIsoDate(new Date(2026, 7, 4))).toBe('2026-08-04')
    expect(todayKey(new Date(2026, 0, 9))).toBe('2026-01-09')
    expect(isDayKey('2026-08-04')).toBe(true)
    expect(isDayKey('bad')).toBe(false)
    expect(shiftDate('2026-08-04', -1)).toBe('2026-08-03')
  })
})

describe('shared/errors', () => {
  it('normalizes unknown errors', () => {
    expect(errorMessage(new Error('x'), 'fb')).toBe('x')
    expect(errorMessage('y', 'fb')).toBe('y')
    expect(errorMessage({}, 'fb')).toBe('fb')
  })
})

describe('shared/notionIds', () => {
  it('extractDatabaseId and extractPageId share the same parser', () => {
    const raw = 'https://www.notion.so/workspace/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    expect(extractDatabaseId(raw)).toBe(extractPageId(raw))
    expect(extractDatabaseId(raw)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })
})

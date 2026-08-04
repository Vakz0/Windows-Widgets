import { describe, expect, it } from 'vitest'
import { buildPropertyWrite } from './write'

describe('buildPropertyWrite', () => {
  it('builds title / rich_text / date / checkbox', () => {
    expect(buildPropertyWrite('title', 'Hello')).toEqual({
      title: [{ type: 'text', text: { content: 'Hello' } }],
    })
    expect(buildPropertyWrite('rich_text', null)).toEqual({ rich_text: [] })
    expect(buildPropertyWrite('date', '2026-08-04')).toEqual({
      date: { start: '2026-08-04' },
    })
    expect(buildPropertyWrite('date', '')).toEqual({ date: null })
    expect(buildPropertyWrite('checkbox', true)).toEqual({ checkbox: true })
  })

  it('builds select / multi_select / status and clears empties', () => {
    expect(buildPropertyWrite('select', 'A')).toEqual({ select: { name: 'A' } })
    expect(buildPropertyWrite('select', '')).toEqual({ select: null })
    expect(buildPropertyWrite('multi_select', 'B')).toEqual({
      multi_select: [{ name: 'B' }],
    })
    expect(buildPropertyWrite('multi_select', '')).toEqual({ multi_select: [] })
    expect(buildPropertyWrite('status', 'Done')).toEqual({ status: { name: 'Done' } })
    expect(buildPropertyWrite('status', null)).toEqual({ status: null })
  })

  it('returns null for unknown types', () => {
    expect(buildPropertyWrite('number', '1')).toBeNull()
  })
})

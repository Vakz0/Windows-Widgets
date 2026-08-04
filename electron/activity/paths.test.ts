import { describe, expect, it } from 'vitest'
import { resolveWithin, assertWithin } from './paths'

describe('resolveWithin / assertWithin', () => {
  const base = 'C:\\Users\\test\\activity'

  it('joins safe segments', () => {
    expect(resolveWithin(base, 'days', '2026-08-04.jsonl').replace(/\//g, '\\')).toMatch(
      /days\\2026-08-04\.jsonl$/,
    )
  })

  it('rejects traversal and separators in segments', () => {
    expect(() => resolveWithin(base, '..')).toThrow(/Invalid path segment/)
    expect(() => resolveWithin(base, 'a/b')).toThrow(/Invalid path segment/)
    expect(() => resolveWithin(base, 'a\\b')).toThrow(/Invalid path segment/)
  })

  it('assertWithin rejects escape', () => {
    expect(() => assertWithin(base, 'C:\\Users\\other\\secret')).toThrow(/escapes/)
    expect(assertWithin(base, `${base}\\days\\x.jsonl`)).toContain('days')
  })
})

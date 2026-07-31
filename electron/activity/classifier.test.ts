import { describe, expect, it } from 'vitest'
import {
  classify,
  rebuildCompiledPatterns,
  titlePatternFromSample,
} from './classifier'
import { DEFAULT_RULES } from './defaults'

const compiled = rebuildCompiledPatterns(DEFAULT_RULES)

describe('classify', () => {
  it('prioritizes idle as afk', () => {
    const r = classify('chrome', 'YouTube', true, 'youtube.com', DEFAULT_RULES, compiled)
    expect(r.category).toBe('afk')
    expect(r.source).toBe('idle')
  })

  it('prioritizes user app overrides over domain', () => {
    const rules = {
      ...DEFAULT_RULES,
      userAppOverrides: { chrome: 'work' as const },
    }
    const r = classify('chrome', 'YouTube', false, 'youtube.com', rules, compiled)
    expect(r.category).toBe('work')
    expect(r.source).toBe('user')
  })

  it('uses domain before title patterns', () => {
    const r = classify('chrome', 'something', false, 'youtube.com', DEFAULT_RULES, compiled)
    expect(r.category).toBe('entertainment')
    expect(r.source).toBe('domain')
  })

  it('uses title patterns before app defaults', () => {
    const r = classify('unknownapp', 'watching netflix tonight', false, null, DEFAULT_RULES, compiled)
    expect(r.category).toBe('entertainment')
    expect(r.source).toBe('title')
  })

  it('uses app defaults before fallback', () => {
    const r = classify('cursor', 'main.ts — project', false, null, DEFAULT_RULES, compiled)
    expect(r.category).toBe('work')
    expect(r.source).toBe('app')
    expect(r.confidence).toBe('medium')
  })

  it('falls back to other/low', () => {
    const r = classify('weirdapp', 'zzz', false, null, DEFAULT_RULES, compiled)
    expect(r.category).toBe('other')
    expect(r.source).toBe('fallback')
    expect(r.confidence).toBe('low')
  })
})

describe('titlePatternFromSample', () => {
  it('returns null for empty title (blocks title-scope feedback)', () => {
    expect(titlePatternFromSample('')).toBeNull()
    expect(titlePatternFromSample('   ')).toBeNull()
  })

  it('extracts domain-like tokens', () => {
    expect(titlePatternFromSample('https://www.github.com/foo')).toBe('github\\.com')
  })

  it('extracts text before dash separator', () => {
    const p = titlePatternFromSample('MyDoc — Cursor')
    expect(p).toBeTruthy()
    expect(p!.length).toBeGreaterThanOrEqual(3)
  })
})

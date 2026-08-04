import { describe, expect, it } from 'vitest'
import type { FocusAllowlist } from '../../shared/types'
import {
  domainMatches,
  isBrowserApp,
  isOnFocusAllowlist,
  sanitizeFocusAllowlist,
} from './focusAllowlist'

function allowlist(partial: Partial<FocusAllowlist> = {}): FocusAllowlist {
  return sanitizeFocusAllowlist(partial)
}

describe('sanitizeFocusAllowlist', () => {
  it('normalizes apps, domains, projects and dedupes', () => {
    const result = sanitizeFocusAllowlist({
      apps: ['Cursor.EXE', 'cursor', '  '],
      domains: ['WWW.GitHub.com', 'github.com'],
      ideProjects: ['Lattice', 'lattice'],
      urls: ['youtube:AbC', 'YT-TITLE:Hello World'],
    })
    expect(result.apps).toEqual(['cursor'])
    expect(result.domains).toEqual(['github.com'])
    expect(result.ideProjects).toEqual(['lattice'])
    expect(result.urls).toEqual(['youtube:AbC', 'yt-title:hello world'])
  })

  it('returns empty lists for nullish input', () => {
    expect(sanitizeFocusAllowlist(null)).toEqual({
      apps: [],
      domains: [],
      ideProjects: [],
      urls: [],
    })
  })
})

describe('domainMatches', () => {
  it('matches exact and subdomain', () => {
    expect(domainMatches(['github.com'], 'github.com')).toBe(true)
    expect(domainMatches(['github.com'], 'api.github.com')).toBe(true)
    expect(domainMatches(['github.com'], 'gitlab.com')).toBe(false)
    expect(domainMatches(['github.com'], null)).toBe(false)
  })
})

describe('isBrowserApp', () => {
  it('detects known browsers', () => {
    expect(isBrowserApp('chrome')).toBe(true)
    expect(isBrowserApp('msedge.exe')).toBe(true)
    expect(isBrowserApp('cursor')).toBe(false)
  })
})

describe('isOnFocusAllowlist', () => {
  it('matches by app', () => {
    expect(
      isOnFocusAllowlist(allowlist({ apps: ['cursor'] }), {
        app: 'Cursor.exe',
        domain: null,
        projectName: null,
      }),
    ).toBe(true)
  })

  it('matches by IDE project', () => {
    expect(
      isOnFocusAllowlist(allowlist({ ideProjects: ['lattice'] }), {
        app: 'notepad',
        domain: null,
        projectName: 'Lattice',
      }),
    ).toBe(true)
  })

  it('matches by domain when app is not listed', () => {
    expect(
      isOnFocusAllowlist(allowlist({ domains: ['notion.so'] }), {
        app: 'chrome',
        domain: 'www.notion.so',
        projectName: null,
      }),
    ).toBe(true)
  })

  it('rejects when nothing matches', () => {
    expect(
      isOnFocusAllowlist(allowlist({ apps: ['cursor'] }), {
        app: 'spotify',
        domain: 'youtube.com',
        projectName: null,
      }),
    ).toBe(false)
  })
})

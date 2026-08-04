import { describe, expect, it } from 'vitest'
import {
  collectYoutubeAllowlistKeys,
  extractYoutubeVideoId,
  focusUrlAllowlistKey,
  isYoutubeHost,
  normalizeYoutubePageTitle,
  youtubeAllowlistKey,
  youtubeTitleAllowlistKey,
} from '../../shared/youtubeVideo'
import type { FocusAllowlist } from '../../shared/types'
import { isOnFocusAllowlist } from './focusAllowlist'
import { domainFromBrowserTitle } from './context'

describe('extractYoutubeVideoId', () => {
  it('extracts watch?v=', () => {
    expect(extractYoutubeVideoId('youtube.com', '/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYoutubeVideoId('www.youtube.com', '/watch?v=dQw4w9WgXcQ&t=30')).toBe(
      'dQw4w9WgXcQ',
    )
  })

  it('extracts shorts and embed', () => {
    expect(extractYoutubeVideoId('youtube.com', '/shorts/abcDEF12345')).toBe('abcDEF12345')
    expect(extractYoutubeVideoId('youtube.com', '/embed/abcDEF12345')).toBe('abcDEF12345')
  })

  it('extracts youtu.be', () => {
    expect(extractYoutubeVideoId('youtu.be', '/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYoutubeVideoId('youtu.be', '/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for non-video YouTube pages', () => {
    expect(extractYoutubeVideoId('youtube.com', '/')).toBeNull()
    expect(extractYoutubeVideoId('youtube.com', '/results?search_query=test')).toBeNull()
    expect(extractYoutubeVideoId('github.com', '/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('builds allowlist keys', () => {
    expect(youtubeAllowlistKey('dQw4w9WgXcQ')).toBe('youtube:dQw4w9WgXcQ')
    expect(focusUrlAllowlistKey('youtube.com', '/watch?v=dQw4w9WgXcQ')).toBe(
      'youtube:dQw4w9WgXcQ',
    )
    expect(isYoutubeHost('youtube.com')).toBe(true)
    expect(isYoutubeHost('github.com')).toBe(false)
  })
})

describe('youtube title fallback', () => {
  it('detects YouTube window titles', () => {
    expect(
      normalizeYoutubePageTitle(
        "(28) J'AI ACHETÉ UNE MAISON SUR TIKTOK (et je regrette pas) - YouTube - Brave",
      ),
    ).not.toBeNull()
    expect(normalizeYoutubePageTitle('Netflix - Brave')).toBeNull()
  })

  it('normalizes notification badges out of titles', () => {
    expect(
      normalizeYoutubePageTitle(
        "(28) J'AI ACHETÉ UNE MAISON SUR TIKTOK (et je regrette pas) - YouTube - Brave",
      ),
    ).toBe("j'ai acheté une maison sur tiktok (et je regrette pas)")
    expect(
      youtubeTitleAllowlistKey(
        "(29) J'AI ACHETÉ UNE MAISON SUR TIKTOK (et je regrette pas) - YouTube - Brave",
      ),
    ).toBe("yt-title:j'ai acheté une maison sur tiktok (et je regrette pas)")
  })

  it('infers youtube.com from browser title when URL helper is down', () => {
    expect(
      domainFromBrowserTitle(
        "(28) J'AI ACHETÉ UNE MAISON SUR TIKTOK (et je regrette pas) - YouTube - Brave",
        'url',
      ),
    ).toEqual({ domain: 'youtube.com', urlPath: null })
    expect(domainFromBrowserTitle('Netflix - Brave', 'domain')).toEqual({
      domain: 'netflix.com',
      urlPath: null,
    })
  })

  it('allow_once stores title key when URL is missing', () => {
    expect(
      collectYoutubeAllowlistKeys({
        domain: null,
        urlPath: null,
        title:
          "(28) J'AI ACHETÉ UNE MAISON SUR TIKTOK (et je regrette pas) - YouTube - Brave",
      }),
    ).toEqual(["yt-title:j'ai acheté une maison sur tiktok (et je regrette pas)"])
  })
})

describe('focus allowlist url matching', () => {
  const base: FocusAllowlist = {
    apps: ['cursor'],
    domains: [],
    ideProjects: [],
    urls: ['youtube:dQw4w9WgXcQ'],
  }

  it('allows the locked video only', () => {
    expect(
      isOnFocusAllowlist(base, {
        app: 'chrome',
        domain: 'youtube.com',
        urlPath: '/watch?v=dQw4w9WgXcQ',
        projectName: null,
      }),
    ).toBe(true)
    expect(
      isOnFocusAllowlist(base, {
        app: 'chrome',
        domain: 'youtube.com',
        urlPath: '/watch?v=otherVideo1',
        projectName: null,
      }),
    ).toBe(false)
    expect(
      isOnFocusAllowlist(base, {
        app: 'chrome',
        domain: 'youtube.com',
        urlPath: '/',
        projectName: null,
      }),
    ).toBe(false)
  })

  it('allows via title fingerprint when URL path is unavailable', () => {
    const withTitle: FocusAllowlist = {
      ...base,
      urls: ["yt-title:j'ai acheté une maison sur tiktok (et je regrette pas)"],
    }
    expect(
      isOnFocusAllowlist(withTitle, {
        app: 'brave',
        domain: 'youtube.com',
        urlPath: null,
        title:
          "(28) J'AI ACHETÉ UNE MAISON SUR TIKTOK (et je regrette pas) - YouTube - Brave",
        projectName: null,
      }),
    ).toBe(true)
    expect(
      isOnFocusAllowlist(withTitle, {
        app: 'brave',
        domain: 'youtube.com',
        urlPath: null,
        title: 'Another Video - YouTube - Brave',
        projectName: null,
      }),
    ).toBe(false)
  })

  it('still allows whole YouTube when domain is manually allowlisted', () => {
    const withDomain: FocusAllowlist = {
      ...base,
      domains: ['youtube.com'],
      urls: [],
    }
    expect(
      isOnFocusAllowlist(withDomain, {
        app: 'chrome',
        domain: 'youtube.com',
        urlPath: '/watch?v=otherVideo1',
        projectName: null,
      }),
    ).toBe(true)
  })
})

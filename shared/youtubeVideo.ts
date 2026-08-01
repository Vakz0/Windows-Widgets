/**
 * YouTube video ID extraction / allowlist keys for focus sessions.
 */

import { normalizeDomain } from './domain'

const YOUTUBE_HOSTS = new Set(['youtube.com', 'youtu.be', 'youtube-nocookie.com'])

/** YouTube video IDs are typically 11 chars; accept a slightly wider safe set. */
const VIDEO_ID_RE = /^[\w-]{6,20}$/

const YOUTUBE_TITLE_SUFFIX_RE = /\s[-—–]\s*YouTube\s*$/i

export function isYoutubeHost(domain: string | null | undefined): boolean {
  if (!domain) return false
  const d = normalizeDomain(domain)
  return YOUTUBE_HOSTS.has(d) || [...YOUTUBE_HOSTS].some((h) => d.endsWith(`.${h}`))
}

/** Strip " - Brave" / " — Google Chrome" style suffixes. */
export function stripBrowserAppSuffix(title: string): string {
  const m = title.match(
    /^(.+?) (?:—|–|-) (?:Google Chrome|Microsoft Edge|Brave|Mozilla Firefox|Opera|Vivaldi|Arc)$/i,
  )
  return (m?.[1] ?? title).trim()
}

/**
 * Normalize a YouTube tab title for allowlist matching:
 * drop notification badge `(28)` and trailing " - YouTube".
 */
export function normalizeYoutubePageTitle(title: string | null | undefined): string | null {
  if (!title) return null
  let page = stripBrowserAppSuffix(title)
  if (!YOUTUBE_TITLE_SUFFIX_RE.test(page) && !/^YouTube\s*$/i.test(page)) {
    return null
  }
  page = page
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*[-—–]\s*YouTube\s*$/i, '')
    .trim()
    .toLowerCase()
  return page || null
}

function validVideoId(id: string | null | undefined): string | null {
  if (!id) return null
  const trimmed = id.trim()
  return VIDEO_ID_RE.test(trimmed) ? trimmed : null
}

/**
 * Extract a YouTube video ID from domain + urlPath (pathname + search + hash).
 * Supports /watch?v=, /shorts/, /embed/, and youtu.be/ID.
 */
export function extractYoutubeVideoId(
  domain: string | null | undefined,
  urlPath: string | null | undefined,
): string | null {
  if (!domain || !isYoutubeHost(domain) || !urlPath) return null
  const d = normalizeDomain(domain)
  let path = urlPath.trim()
  if (!path.startsWith('/')) path = `/${path}`

  try {
    const u = new URL(path, 'https://example.com')
    if (d === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0] ?? null
      return validVideoId(id)
    }
    const v = u.searchParams.get('v')
    if (v) return validVideoId(v)

    const parts = u.pathname.split('/').filter(Boolean)
    if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
      return validVideoId(parts[1] ?? null)
    }
  } catch {
    // fall through to regex fallbacks
  }

  const watch = path.match(/[?&]v=([\w-]{6,20})/)
  if (watch) return validVideoId(watch[1])
  const shorts = path.match(/\/(?:shorts|embed|live)\/([\w-]{6,20})/)
  if (shorts) return validVideoId(shorts[1])
  if (d === 'youtu.be') {
    const bare = path.match(/^\/([\w-]{6,20})(?:[/?#]|$)/)
    if (bare) return validVideoId(bare[1])
  }
  return null
}

/** Allowlist key for a locked YouTube video (preferred when URL is known). */
export function youtubeAllowlistKey(videoId: string): string {
  return `youtube:${videoId}`
}

/** Fallback allowlist key when only the tab title is known (URL helper unavailable). */
export function youtubeTitleAllowlistKey(title: string | null | undefined): string | null {
  const normalized = normalizeYoutubePageTitle(title)
  return normalized ? `yt-title:${normalized}` : null
}

/** Focus URL allowlist key for the current browser page, if applicable. */
export function focusUrlAllowlistKey(
  domain: string | null | undefined,
  urlPath: string | null | undefined,
): string | null {
  const id = extractYoutubeVideoId(domain, urlPath)
  return id ? youtubeAllowlistKey(id) : null
}

/** YouTube allowlist keys to persist for allow_once (video id and/or title). */
export function collectYoutubeAllowlistKeys(ctx: {
  domain?: string | null
  urlPath?: string | null
  title?: string | null
}): string[] {
  const keys: string[] = []
  const urlKey = focusUrlAllowlistKey(ctx.domain, ctx.urlPath)
  if (urlKey) keys.push(urlKey)
  const titleKey = youtubeTitleAllowlistKey(ctx.title)
  if (titleKey) keys.push(titleKey)
  return keys
}

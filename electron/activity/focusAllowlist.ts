/**
 * Pure focus-session allowlist matching (no I/O).
 */
import type { FocusAllowlist } from '../../shared/types'
import {
  collectYoutubeAllowlistKeys,
  focusUrlAllowlistKey,
  youtubeTitleAllowlistKey,
} from '../../shared/youtubeVideo'
import { BROWSER_APPS, normalizeDomain } from '../activityContext'
import { normalizeAppKey } from './normalize'

function normalizeProject(name: string): string {
  return name.trim().toLowerCase()
}

function uniqNormalized(values: string[], normalize: (v: string) => string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of values) {
    if (typeof raw !== 'string') continue
    const n = normalize(raw)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

function normalizeUrlKey(raw: string): string {
  const trimmed = raw.trim()
  const yt = trimmed.match(/^youtube:(.+)$/i)
  if (yt) return `youtube:${yt[1]}`
  const ytTitle = trimmed.match(/^yt-title:(.+)$/i)
  if (ytTitle) return `yt-title:${ytTitle[1].toLowerCase()}`
  return trimmed.toLowerCase()
}

export function sanitizeFocusAllowlist(raw?: Partial<FocusAllowlist> | null): FocusAllowlist {
  return {
    apps: uniqNormalized([...(raw?.apps ?? [])], normalizeAppKey),
    domains: uniqNormalized([...(raw?.domains ?? [])], normalizeDomain),
    ideProjects: uniqNormalized([...(raw?.ideProjects ?? [])], normalizeProject),
    urls: uniqNormalized([...(raw?.urls ?? [])], normalizeUrlKey),
  }
}

export function domainMatches(allowed: string[], domain: string | null): boolean {
  if (!domain) return false
  const d = normalizeDomain(domain)
  return allowed.some((a) => d === a || d.endsWith(`.${a}`))
}

export function isBrowserApp(app: string): boolean {
  return BROWSER_APPS.has(normalizeAppKey(app))
}

export function isOnFocusAllowlist(
  allowlist: FocusAllowlist,
  sample: {
    app: string
    domain: string | null
    urlPath?: string | null
    title?: string | null
    projectName: string | null
  },
): boolean {
  const appKey = normalizeAppKey(sample.app)
  if (allowlist.apps.includes(appKey)) return true
  if (sample.projectName && allowlist.ideProjects.includes(normalizeProject(sample.projectName))) {
    return true
  }
  const urlKey = focusUrlAllowlistKey(sample.domain, sample.urlPath ?? null)
  if (urlKey && allowlist.urls.includes(urlKey)) return true
  const titleKey = youtubeTitleAllowlistKey(sample.title)
  if (titleKey && allowlist.urls.includes(titleKey)) return true
  if (domainMatches(allowlist.domains, sample.domain)) return true
  return false
}

export { collectYoutubeAllowlistKeys as allowOnceUrlKeys, normalizeProject }

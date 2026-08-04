/**
 * Pure focus-guard decisions (no I/O).
 */
import type {
  FocusInterruptAction,
  FocusInterruptContext,
  FocusSession,
} from '../../shared/types'
import { isYoutubeHost } from '../../shared/youtubeVideo'
import {
  allowOnceUrlKeys,
  isBrowserApp,
  isOnFocusAllowlist,
  normalizeProject,
  sanitizeFocusAllowlist,
} from '../activity/focusAllowlist'
import { normalizeAppKey } from '../activity/normalize'
import { normalizeDomain } from '../activity/context'

/** Pure check: dwell elapsed off-allowlist while session is actively guarded. */
export function shouldBeginInterrupt(
  activeSession: FocusSession,
  sample: {
    nowMs: number
    app: string
    title?: string | null
    domain: string | null
    urlPath: string | null
    projectName: string | null
    ignored: boolean
    idle: boolean
    dwellSec: number
  },
  offSince: number | null,
): { begin: boolean; nextOffSince: number | null } {
  if (activeSession.status !== 'active') {
    return { begin: false, nextOffSince: null }
  }
  if (sample.idle || sample.ignored || sample.app === 'afk') {
    return { begin: false, nextOffSince: null }
  }
  if (
    isOnFocusAllowlist(activeSession.allowlist, {
      app: sample.app,
      domain: sample.domain,
      urlPath: sample.urlPath,
      title: sample.title ?? null,
      projectName: sample.projectName,
    })
  ) {
    return { begin: false, nextOffSince: null }
  }

  const dwellMs = Math.max(3, sample.dwellSec) * 1000
  if (offSince === null || offSince === undefined) {
    return { begin: false, nextOffSince: sample.nowMs }
  }
  if (sample.nowMs - offSince < dwellMs) {
    return { begin: false, nextOffSince: offSince }
  }
  return { begin: true, nextOffSince: offSince }
}

export function applyInterruptAction(
  current: FocusSession,
  action: FocusInterruptAction,
  ctx: FocusInterruptContext,
): FocusSession | null {
  if (action === 'stop') {
    return null
  }

  if (action === 'pause') {
    return { ...current, status: 'paused' }
  }

  if (action === 'allow_once') {
    const apps = [...current.allowlist.apps]
    const domains = [...current.allowlist.domains]
    const ideProjects = [...current.allowlist.ideProjects]
    const urls = [...current.allowlist.urls]
    const urlKeys = allowOnceUrlKeys({
      domain: ctx.domain,
      urlPath: ctx.urlPath,
      title: ctx.title,
    })
    if (urlKeys.length > 0) {
      urls.push(...urlKeys)
    } else {
      const appKey = normalizeAppKey(ctx.app)
      // Never add the whole browser — that would allow all browsing.
      if (appKey && appKey !== 'unknown' && !isBrowserApp(appKey)) {
        apps.push(appKey)
      }
      // Never widen YouTube to the whole domain when we could not lock a video/title.
      if (ctx.domain && !isYoutubeHost(ctx.domain)) {
        domains.push(normalizeDomain(ctx.domain))
      }
      if (ctx.projectName) {
        ideProjects.push(normalizeProject(ctx.projectName))
      }
    }
    return {
      ...current,
      status: 'active',
      allowlist: sanitizeFocusAllowlist({ apps, domains, ideProjects, urls }),
    }
  }

  // resume
  return { ...current, status: 'active' }
}

import type {
  ActivityCorrectionPayload,
  ActivityCorrectionResult,
  ActivityCorrectionScope,
  ActivityDaySummary,
} from '../../shared/types'
import { categoryFromDomain, normalizeDomain } from '../activityContext'
import { titlePatternFromSample } from './classifier'
import { CATEGORIES } from './defaults'
import { normalizeAppKey } from './normalize'
import { getOpenSegment } from './poll'
import { segmentMs } from './segmentUtils'
import {
  appendFeedback,
  getRules,
  loadActivityState,
  saveRules,
  setRules,
} from './storage'

type FeedbackHooks = {
  emitSummary: () => void | Promise<void>
  getActivitySummary: () => ActivityDaySummary | Promise<ActivityDaySummary>
  getLastSummary: () => ActivityDaySummary | null
}

let hooks: FeedbackHooks | null = null

export function setFeedbackHooks(next: FeedbackHooks): void {
  hooks = next
}

function requireHooks(): FeedbackHooks {
  if (!hooks) {
    throw new Error('Activity feedback hooks not initialized')
  }
  return hooks
}

async function resultSummary(h: FeedbackHooks): Promise<ActivityDaySummary> {
  return h.getLastSummary() ?? (await h.getActivitySummary())
}

export async function correctActivityCategory(
  payload: ActivityCorrectionPayload,
): Promise<ActivityCorrectionResult> {
  await loadActivityState()
  const h = requireHooks()
  const scope: ActivityCorrectionScope =
    payload.scope === 'title' || payload.scope === 'domain' ? payload.scope : 'app'

  if (!CATEGORIES.includes(payload.category) || payload.category === 'afk') {
    return { ok: false, message: 'Catégorie invalide.' }
  }

  const openSegment = getOpenSegment()
  let rules = getRules()

  if (scope === 'domain') {
    const domainKey = normalizeDomain(payload.domain || '')
    if (!domainKey) {
      return { ok: false, message: 'Domaine invalide.' }
    }

    const openDomain = openSegment?.domain
      ? normalizeDomain(openSegment.domain)
      : null
    const openMatchesDomain = openDomain === domainKey

    const from = openMatchesDomain && openSegment
      ? openSegment.category
      : rules.userDomainOverrides?.[domainKey] ??
        categoryFromDomain(domainKey)?.category ??
        'other'

    await appendFeedback({
      at: new Date().toISOString(),
      app: normalizeAppKey(payload.app || openSegment?.app || 'browser'),
      titleSample: domainKey,
      from,
      to: payload.category,
      scope: 'domain',
      durationMsHint:
        openMatchesDomain && openSegment
          ? segmentMs({ ...openSegment, end: new Date().toISOString() })
          : 0,
    })

    rules = {
      ...rules,
      userDomainOverrides: {
        ...(rules.userDomainOverrides ?? {}),
        [domainKey]: payload.category,
      },
    }
    setRules(rules)
    await saveRules()

    if (openMatchesDomain && openSegment) {
      openSegment.category = payload.category
      openSegment.categorySource = 'user'
      openSegment.confidence = 'high'
      openSegment.matchedPattern = domainKey
    }

    await h.emitSummary()
    return {
      ok: true,
      message: `« ${domainKey} » → ${payload.category}`,
      summary: await resultSummary(h),
      rules: structuredClone(getRules()),
    }
  }

  const appKey = normalizeAppKey(payload.app || '')
  if (!appKey || appKey === 'afk') {
    return { ok: false, message: 'Application invalide.' }
  }

  const from =
    openSegment && openSegment.app === appKey
      ? openSegment.category
      : rules.userAppOverrides?.[appKey] ??
        rules.appDefaults[appKey] ??
        'other'

  let titleSample: string | null = null
  if (typeof payload.titleSample === 'string') titleSample = payload.titleSample
  else if (openSegment?.app === appKey) titleSample = openSegment.title

  let durationMsHint = 0
  if (openSegment && openSegment.app === appKey) {
    durationMsHint = segmentMs({
      ...openSegment,
      end: new Date().toISOString(),
    })
  }

  // Validate title pattern before writing feedback (avoids orphan feedback rows).
  let titlePattern: string | null = null
  if (scope === 'title') {
    titlePattern = titlePatternFromSample(titleSample ?? '')
    if (!titlePattern) {
      return {
        ok: false,
        message: 'Impossible de dériver un motif depuis le titre.',
      }
    }
  }

  await appendFeedback({
    at: new Date().toISOString(),
    app: appKey,
    titleSample,
    from,
    to: payload.category,
    scope,
    durationMsHint,
  })

  if (scope === 'app') {
    rules = {
      ...rules,
      userAppOverrides: {
        ...(rules.userAppOverrides ?? {}),
        [appKey]: payload.category,
      },
      appDefaults: {
        ...rules.appDefaults,
        [appKey]: payload.category,
      },
    }
  } else {
    const pattern = titlePattern!
    const exists = rules.titlePatterns.some(
      (p) => p.pattern === pattern && p.category === payload.category,
    )
    if (!exists) {
      rules = {
        ...rules,
        titlePatterns: [{ pattern, category: payload.category }, ...rules.titlePatterns],
      }
    }
  }

  setRules(rules)
  await saveRules()

  if (openSegment && openSegment.app === appKey) {
    openSegment.category = payload.category
    openSegment.categorySource = 'user'
    openSegment.confidence = 'high'
    openSegment.matchedPattern = scope === 'title' ? titlePattern : null
  }

  await h.emitSummary()
  return {
    ok: true,
    message:
      scope === 'app'
        ? `« ${appKey} » → ${payload.category}`
        : `Motif titre ajouté → ${payload.category}`,
    summary: await resultSummary(h),
    rules: structuredClone(getRules()),
  }
}

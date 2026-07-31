import type {
  ActivityAppBreakdown,
  ActivityCategory,
  ActivityConfidence,
  ActivityCurrentFocus,
  ActivityDaySummary,
  ActivityProjectBreakdown,
  ActivityQualityMetrics,
  ActivitySegment,
  ActivitySettings,
  ActivitySiteBreakdown,
  ActivityTaskBreakdown,
  FocusSession,
} from '../../shared/types'
import { todayKey } from './paths'
import {
  emptyByCategory,
  isCountable,
  segmentMs,
} from './segmentUtils'

export type SummaryDeps = {
  settings: ActivitySettings
  running: boolean
  userDomainOverrides?: Record<string, ActivityCategory> | null
  countFeedbackOnDay: (date: string) => number
  getTopWatch: (
    date: string,
    limit: number,
    overrides?: Record<string, ActivityCategory> | null,
  ) => ActivitySiteBreakdown[]
  getFocusSession: () => FocusSession | null
  isMediaKeepAwakeActive: () => boolean
  isActiveUrlHelperAvailable: () => boolean
}

export function buildQuality(
  segments: ActivitySegment[],
  date: string,
  countFeedbackOnDay: (date: string) => number,
): ActivityQualityMetrics {
  let activeMs = 0
  let otherMs = 0
  let lowMs = 0
  const unknown = new Set<string>()

  for (const seg of segments) {
    const ms = segmentMs(seg)
    if (ms <= 0 || !isCountable(seg)) continue
    activeMs += ms
    if (seg.category === 'other') otherMs += ms
    const conf = seg.confidence ?? (seg.category === 'other' ? 'low' : 'medium')
    if (conf === 'low') lowMs += ms
    if (
      seg.app === 'unknown' ||
      seg.app.startsWith('pid-') ||
      (seg.category === 'other' && (seg.categorySource ?? 'fallback') === 'fallback')
    ) {
      unknown.add(seg.app)
    }
  }

  return {
    otherShare: activeMs > 0 ? otherMs / activeMs : 0,
    lowConfidenceShare: activeMs > 0 ? lowMs / activeMs : 0,
    unknownAppCount: unknown.size,
    feedbackCountToday: countFeedbackOnDay(date),
  }
}

export function buildCurrent(live: ActivitySegment | null): ActivityCurrentFocus | null {
  if (!live || live.category === 'afk') return null
  return {
    app: live.app,
    title: live.title,
    category: live.category,
    confidence: live.confidence ?? 'medium',
    categorySource: live.categorySource ?? 'fallback',
    domain: live.domain ?? null,
    fileName: live.fileName ?? null,
    projectName: live.projectName ?? null,
    contextKind: live.contextKind ?? null,
    ignored: Boolean(live.ignored),
  }
}

export function buildSummary(
  date: string,
  daySegments: ActivitySegment[],
  live: ActivitySegment | null | undefined,
  deps: SummaryDeps,
): ActivityDaySummary {
  // Copy so pushing `live` does not mutate the day cache.
  const segments = [...daySegments]
  if (live && todayKey(new Date(live.start)) === date) {
    segments.push(live)
  }

  const byCategory = emptyByCategory()
  const appMs = new Map<
    string,
    { ms: number; category: ActivityCategory; confidence: ActivityConfidence }
  >()
  const siteMs = new Map<string, { ms: number; category: ActivityCategory }>()
  const projectMs = new Map<string, number>()
  const taskMs = new Map<string, { title: string; ms: number }>()
  let totalMs = 0

  for (const seg of segments) {
    const ms = segmentMs(seg)
    if (ms <= 0) continue
    if (seg.category === 'afk') {
      byCategory.afk += ms
      continue
    }
    if (seg.ignored) continue
    totalMs += ms
    byCategory[seg.category] = (byCategory[seg.category] ?? 0) + ms
    const prev = appMs.get(seg.app) ?? {
      ms: 0,
      category: seg.category,
      confidence: seg.confidence ?? 'medium',
    }
    prev.ms += ms
    prev.category = seg.category
    prev.confidence = seg.confidence ?? prev.confidence
    appMs.set(seg.app, prev)

    if (seg.domain) {
      const s = siteMs.get(seg.domain) ?? { ms: 0, category: seg.category }
      s.ms += ms
      s.category = seg.category
      siteMs.set(seg.domain, s)
    }
    if (seg.projectName) {
      projectMs.set(seg.projectName, (projectMs.get(seg.projectName) ?? 0) + ms)
    }
    if (seg.notionTaskId) {
      const t = taskMs.get(seg.notionTaskId) ?? {
        title: seg.notionTaskTitle || 'Sans titre',
        ms: 0,
      }
      t.ms += ms
      if (seg.notionTaskTitle) t.title = seg.notionTaskTitle
      taskMs.set(seg.notionTaskId, t)
    }
  }

  const topApps: ActivityAppBreakdown[] = [...appMs.entries()]
    .map(([appName, v]) => ({
      app: appName,
      ms: v.ms,
      category: v.category,
      confidence: v.confidence,
    }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 8)

  const topSites: ActivitySiteBreakdown[] = [...siteMs.entries()]
    .map(([domain, v]) => ({ domain, ms: v.ms, category: v.category }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6)

  const topProjects: ActivityProjectBreakdown[] = [...projectMs.entries()]
    .map(([projectName, ms]) => ({ projectName, ms }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6)

  const topTasks: ActivityTaskBreakdown[] = [...taskMs.entries()]
    .map(([notionTaskId, v]) => ({
      notionTaskId,
      title: v.title,
      ms: v.ms,
    }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 8)

  const topWatch = deps.getTopWatch(date, 8, deps.userDomainOverrides)

  return {
    date,
    totalMs,
    byCategory,
    topApps,
    topSites,
    topProjects,
    paused: deps.settings.paused,
    tracking: deps.running && !deps.settings.paused,
    quality: buildQuality(segments, date, deps.countFeedbackOnDay),
    current: buildCurrent(live ?? null),
    urlHelperAvailable: deps.isActiveUrlHelperAvailable(),
    mediaKeepAwake: deps.isMediaKeepAwakeActive(),
    topWatch,
    focusSession: deps.getFocusSession(),
    topTasks,
  }
}

export function withPendingCurrent(
  summary: ActivityDaySummary,
  pending: ActivitySegment | null,
): ActivityDaySummary {
  if (!pending) return summary
  return {
    ...summary,
    current: buildCurrent({
      ...pending,
      end: new Date().toISOString(),
    }),
  }
}

export function buildTransitions(
  segments: ActivitySegment[],
): { from: string; to: string; count: number }[] {
  const map = new Map<string, number>()
  for (const seg of segments) {
    if (!seg.prevApp || seg.prevApp === seg.app || seg.category === 'afk') continue
    const key = `${seg.prevApp}\t${seg.app}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split('\t')
      return { from, to, count }
    })
    .sort((a, b) => b.count - a.count)
}

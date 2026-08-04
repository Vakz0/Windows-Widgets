/**
 * Notion / system-stats refresh with cache + in-flight guards.
 */
import type { BrowserWindow } from 'electron'
import { isWidgetEnabledInConfig } from '../config'
import { fetchNotionTasks } from '../notion'
import { getSystemStats } from '../system'
import {
  getAllWidgetDefinitionsCached,
} from '../widgets/registry'
import type { AppConfig, NotionTask, SystemStats } from '../../shared/types'
import type { WidgetServiceId } from '../../shared/widget'

export type RefreshDeps = {
  getConfig: () => AppConfig
  windows: Partial<Record<string, BrowserWindow>>
  getTasksCache: () => NotionTask[]
  setTasksCache: (tasks: NotionTask[]) => void
  getStatsCache: () => SystemStats | null
  setStatsCache: (stats: SystemStats | null) => void
  getPowerMode: () => string
  notionIntervalMs: () => number
  onStatsUpdated?: () => void
}

export function createRefreshControllers(deps: RefreshDeps) {
  let notionInFlight = false
  let statsInFlight = false
  let lastNotionAt = 0

  function isEnabled(id: string): boolean {
    return isWidgetEnabledInConfig(deps.getConfig(), id)
  }

  function enabledDefsForService(service: WidgetServiceId) {
    return getAllWidgetDefinitionsCached().filter(
      (d) => isEnabled(d.id) && d.services.includes(service),
    )
  }

  function hasService(service: WidgetServiceId): boolean {
    return enabledDefsForService(service).length > 0
  }

  function notionWidgetIds(): string[] {
    return enabledDefsForService('notion').map((d) => d.id)
  }

  function activityWidgetIds(): string[] {
    return enabledDefsForService('activity-tracker').map((d) => d.id)
  }

  function sendTo(ids: string[], channel: string, payload: unknown): void {
    for (const id of ids) {
      const win = deps.windows[id]
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, payload)
      }
    }
  }

  async function refreshNotion(force = false): Promise<NotionTask[]> {
    if (!hasService('notion')) return deps.getTasksCache()
    if (notionInFlight) return deps.getTasksCache()
    const tasksCache = deps.getTasksCache()
    if (!force && deps.getPowerMode() === 'sleep' && tasksCache.length > 0) {
      return tasksCache
    }

    const minGap = force ? 0 : deps.notionIntervalMs() * 0.8
    if (!force && Date.now() - lastNotionAt < minGap) {
      return tasksCache
    }

    notionInFlight = true
    try {
      const next = await fetchNotionTasks(deps.getConfig())
      deps.setTasksCache(next)
      lastNotionAt = Date.now()
      sendTo(notionWidgetIds(), 'tasks-updated', next)
    } catch (err) {
      console.error('Notion sync failed', err)
      sendTo(notionWidgetIds(), 'tasks-error', String(err))
    } finally {
      notionInFlight = false
    }
    return deps.getTasksCache()
  }

  async function refreshStats(forceTemp = false): Promise<SystemStats> {
    if (statsInFlight) return deps.getStatsCache() as SystemStats
    statsInFlight = true
    try {
      const next = await getSystemStats({
        includeTemp: forceTemp,
      })
      deps.setStatsCache(next)
      deps.onStatsUpdated?.()
    } finally {
      statsInFlight = false
    }
    return deps.getStatsCache() as SystemStats
  }

  return {
    isEnabled,
    hasService,
    notionWidgetIds,
    activityWidgetIds,
    sendTo,
    refreshNotion,
    refreshStats,
  }
}

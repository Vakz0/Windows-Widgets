import type { BrowserWindow } from 'electron'
import type { ActivityDaySummary, AppConfig, CatalogWidgetInfo, NotionTask } from '../../shared/types'
import type { WidgetServiceId } from '../../shared/widget'
import {
  isActivityTrackerRunning,
  setActivityUpdatedListener,
  startActivityTracker,
  stopActivityTracker,
} from '../activity'
import { setWidgetEnabled } from '../config'
import { broadcastToAllWindows } from '../notify'
import { isTempServiceRunning, stopTempDaemon } from '../system'
import {
  getAllWidgetDefinitions,
  getAllWidgetDefinitionsCached,
  getWidgetDefinition,
} from './registry'

export interface WidgetLifecycleDeps {
  getConfig: () => AppConfig
  setConfig: (config: AppConfig) => void
  windows: Partial<Record<string, BrowserWindow>>
  isEnabled: (id: string) => boolean
  hasService: (service: WidgetServiceId) => boolean
  createWidgetWindow: (id: string, opts?: { show?: boolean }) => BrowserWindow
  setMonitorVisible: (visible: boolean) => void
  getTasksCache: () => NotionTask[]
  setTasksCache: (tasks: NotionTask[]) => void
  refreshNotion: (force?: boolean) => Promise<NotionTask[]>
  applyPowerMode: (force?: boolean) => void
  sendTo: (ids: string[], channel: string, payload: unknown) => void
  activityWidgetIds: () => string[]
}

export function createWidgetLifecycle(deps: WidgetLifecycleDeps) {
  function listCatalogWidgets(): CatalogWidgetInfo[] {
    return getAllWidgetDefinitionsCached().map((d) => ({
      id: d.id,
      label: d.label,
      description: d.description,
      source: d.source,
      placement: d.placement,
      enabled: deps.isEnabled(d.id),
    }))
  }

  function broadcastWidgetsChanged(): void {
    broadcastToAllWindows('widgets-changed', listCatalogWidgets())
  }

  function pushActivitySummary(summary: ActivityDaySummary): void {
    deps.sendTo(deps.activityWidgetIds(), 'activity-updated', summary)
  }

  function syncActivityService(): void {
    const needed = deps.hasService('activity-tracker')
    if (needed && !isActivityTrackerRunning()) {
      setActivityUpdatedListener(pushActivitySummary)
      void startActivityTracker()
    } else if (!needed && isActivityTrackerRunning()) {
      stopActivityTracker()
      setActivityUpdatedListener(null)
    }
  }

  function recomputeServices(): void {
    if (!deps.hasService('notion')) {
      deps.setTasksCache([])
    } else if (!deps.getTasksCache().length) {
      void deps.refreshNotion(true)
    }

    if (!deps.hasService('temp-daemon')) {
      void isTempServiceRunning().then((running) => {
        if (running) void stopTempDaemon()
      })
    }

    syncActivityService()
    deps.applyPowerMode(true)
  }

  async function enableWidget(id: string): Promise<boolean> {
    const def = await getWidgetDefinition(id)
    if (!def) return false
    if (deps.isEnabled(id)) return true

    deps.setConfig(await setWidgetEnabled(deps.getConfig(), id, true))

    if (def.placement === 'desktop') {
      deps.createWidgetWindow(id)
    }
    // popup widgets stay lazy until tray click

    recomputeServices()
    broadcastWidgetsChanged()
    return true
  }

  async function disableWidget(id: string): Promise<boolean> {
    const def = await getWidgetDefinition(id)
    if (!def) return false
    if (!deps.isEnabled(id)) return true

    deps.setConfig(await setWidgetEnabled(deps.getConfig(), id, false))

    const win = deps.windows[id]
    if (win && !win.isDestroyed()) {
      win.destroy()
    }
    delete deps.windows[id]
    if (id === 'monitor') deps.setMonitorVisible(false)

    recomputeServices()
    broadcastWidgetsChanged()
    return true
  }

  function setWidgetEnabledState(id: string, enabled: boolean): Promise<boolean> {
    return enabled ? enableWidget(id) : disableWidget(id)
  }

  async function bootEnabledWidgets(): Promise<void> {
    await getAllWidgetDefinitions()
    for (const d of getAllWidgetDefinitionsCached()) {
      if (!deps.isEnabled(d.id)) continue
      if (d.placement === 'desktop') {
        deps.createWidgetWindow(d.id)
      }
      // popup: lazy
    }
  }

  return {
    listCatalogWidgets,
    broadcastWidgetsChanged,
    enableWidget,
    disableWidget,
    setWidgetEnabledState,
    bootEnabledWidgets,
    recomputeServices,
    syncActivityService,
  }
}

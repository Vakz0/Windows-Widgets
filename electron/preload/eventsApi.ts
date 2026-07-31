import { ipcRenderer } from 'electron'
import type {
  ActivityDaySummary,
  AppUpdateState,
  CatalogWidgetInfo,
  FocusInterruptContext,
  FocusSession,
  NotionTask,
  SystemStats,
  WidgetUpdatesState,
} from '../../shared/types'

export function createEventsApi() {
  return {
    onTasksUpdated: (cb: (tasks: NotionTask[]) => void) => {
      const listener = (_: unknown, tasks: NotionTask[]) => cb(tasks)
      ipcRenderer.on('tasks-updated', listener)
      return () => ipcRenderer.removeListener('tasks-updated', listener)
    },
    onTasksError: (cb: (message: string) => void) => {
      const listener = (_: unknown, message: string) => cb(message)
      ipcRenderer.on('tasks-error', listener)
      return () => ipcRenderer.removeListener('tasks-error', listener)
    },
    onStatsUpdated: (cb: (stats: SystemStats) => void) => {
      const listener = (_: unknown, stats: SystemStats) => cb(stats)
      ipcRenderer.on('stats-updated', listener)
      return () => ipcRenderer.removeListener('stats-updated', listener)
    },
    onActivityUpdated: (cb: (summary: ActivityDaySummary) => void) => {
      const listener = (_: unknown, summary: ActivityDaySummary) => cb(summary)
      ipcRenderer.on('activity-updated', listener)
      return () => ipcRenderer.removeListener('activity-updated', listener)
    },
    onFocusSessionUpdated: (cb: (session: FocusSession | null) => void) => {
      const listener = (_: unknown, session: FocusSession | null) => cb(session)
      ipcRenderer.on('focus-session-updated', listener)
      return () => ipcRenderer.removeListener('focus-session-updated', listener)
    },
    onFocusInterrupt: (cb: (ctx: FocusInterruptContext) => void) => {
      const listener = (_: unknown, ctx: FocusInterruptContext) => cb(ctx)
      ipcRenderer.on('focus-interrupt', listener)
      return () => ipcRenderer.removeListener('focus-interrupt', listener)
    },
    onWidgetsChanged: (cb: (widgets: CatalogWidgetInfo[]) => void) => {
      const listener = (_: unknown, widgets: CatalogWidgetInfo[]) => cb(widgets)
      ipcRenderer.on('widgets-changed', listener)
      return () => ipcRenderer.removeListener('widgets-changed', listener)
    },
    onCatalogMaximizedChanged: (cb: (maximized: boolean) => void) => {
      const listener = (_: unknown, maximized: boolean) => cb(maximized)
      ipcRenderer.on('catalog-maximized-changed', listener)
      return () => ipcRenderer.removeListener('catalog-maximized-changed', listener)
    },
    onCatalogNavigate: (cb: (view: 'catalog' | 'settings') => void) => {
      const listener = (_: unknown, view: 'catalog' | 'settings') => cb(view)
      ipcRenderer.on('catalog-navigate', listener)
      return () => ipcRenderer.removeListener('catalog-navigate', listener)
    },
    onAppUpdateStatus: (cb: (state: AppUpdateState) => void) => {
      const listener = (_: unknown, next: AppUpdateState) => cb(next)
      ipcRenderer.on('app-update-status', listener)
      return () => ipcRenderer.removeListener('app-update-status', listener)
    },
    onWidgetUpdateStatus: (cb: (state: WidgetUpdatesState) => void) => {
      const listener = (_: unknown, next: WidgetUpdatesState) => cb(next)
      ipcRenderer.on('widget-update-status', listener)
      return () => ipcRenderer.removeListener('widget-update-status', listener)
    },
  }
}

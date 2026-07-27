import { contextBridge, ipcRenderer } from 'electron'
import type {
  CatalogWidgetInfo,
  NotionConnectionTestResult,
  NotionSettingsPatch,
  NotionTask,
  PublicConfig,
  SystemStats,
} from '../shared/types'

const api = {
  getTasks: (): Promise<NotionTask[]> => ipcRenderer.invoke('get-tasks'),
  refreshTasks: (): Promise<NotionTask[]> => ipcRenderer.invoke('refresh-tasks'),
  getTaskDescription: (pageId: string): Promise<string | null> =>
    ipcRenderer.invoke('get-task-description', pageId),
  getStats: (): Promise<SystemStats> => ipcRenderer.invoke('get-stats'),
  getConfig: (): Promise<PublicConfig> => ipcRenderer.invoke('get-config'),
  updatePublicSettings: (patch: {
    refreshIntervalSeconds?: number
    demoMode?: boolean
    launchAtStartup?: boolean
  }): Promise<{ ok: boolean; config: PublicConfig }> =>
    ipcRenderer.invoke('update-public-settings', patch),
  getNotionSettings: (): Promise<PublicConfig> => ipcRenderer.invoke('get-notion-settings'),
  saveNotionSettings: (
    patch: NotionSettingsPatch,
  ): Promise<{ ok: boolean; config: PublicConfig; message: string }> =>
    ipcRenderer.invoke('save-notion-settings', patch),
  testNotionConnection: (payload: {
    notionToken?: string
    databaseId?: string
  }): Promise<NotionConnectionTestResult> =>
    ipcRenderer.invoke('test-notion-connection', payload),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  openConfigFile: (): Promise<void> => ipcRenderer.invoke('open-config-file'),
  listWidgets: (): Promise<CatalogWidgetInfo[]> => ipcRenderer.invoke('list-widgets'),
  setWidgetEnabled: (
    id: string,
    enabled: boolean,
  ): Promise<{ ok: boolean; widgets: CatalogWidgetInfo[] }> =>
    ipcRenderer.invoke('set-widget-enabled', id, enabled),
  openCatalog: (): Promise<void> => ipcRenderer.invoke('open-catalog'),
  closeCatalog: (): Promise<void> => ipcRenderer.invoke('close-catalog'),
  minimizeCatalog: (): Promise<void> => ipcRenderer.invoke('minimize-catalog'),
  toggleMaximizeCatalog: (): Promise<boolean> =>
    ipcRenderer.invoke('toggle-maximize-catalog'),
  isCatalogMaximized: (): Promise<boolean> => ipcRenderer.invoke('is-catalog-maximized'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  hideMonitor: (): Promise<void> => ipcRenderer.invoke('hide-monitor'),
  enableTemp: (): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('enable-temp'),
  disableTemp: (): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('disable-temp'),
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
}

contextBridge.exposeInMainWorld('lattice', api)

export type LatticeApi = typeof api

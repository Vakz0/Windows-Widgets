import { contextBridge, ipcRenderer } from 'electron'
import type {
  ActivityCorrectionPayload,
  ActivityCorrectionResult,
  ActivityDaySummary,
  ActivityExportFormat,
  ActivityRules,
  ActivitySettings,
  AppUpdateState,
  CatalogWidgetInfo,
  CreateTaskPayload,
  CreateTaskResult,
  DeleteTaskPayload,
  DeleteTaskResult,
  NotionConnectionTestResult,
  NotionPropertyOption,
  NotionSettingsPatch,
  NotionTask,
  PublicConfig,
  SystemStats,
  UpdateTaskFieldPayload,
  UpdateTaskFieldResult,
  WidgetUpdateInfo,
  WidgetUpdatesState,
} from '../shared/types'

const api = {
  getTasks: (): Promise<NotionTask[]> => ipcRenderer.invoke('get-tasks'),
  refreshTasks: (): Promise<NotionTask[]> => ipcRenderer.invoke('refresh-tasks'),
  getTaskDescription: (pageId: string): Promise<string | null> =>
    ipcRenderer.invoke('get-task-description', pageId),
  getPropertyOptions: (
    databaseId: string,
    propertyName: string,
  ): Promise<NotionPropertyOption[]> =>
    ipcRenderer.invoke('get-property-options', databaseId, propertyName),
  updateTaskField: (payload: UpdateTaskFieldPayload): Promise<UpdateTaskFieldResult> =>
    ipcRenderer.invoke('update-task-field', payload),
  createTask: (payload: CreateTaskPayload): Promise<CreateTaskResult> =>
    ipcRenderer.invoke('create-task', payload),
  deleteTask: (payload: DeleteTaskPayload): Promise<DeleteTaskResult> =>
    ipcRenderer.invoke('delete-task', payload),
  getStats: (): Promise<SystemStats> => ipcRenderer.invoke('get-stats'),
  getConfig: (): Promise<PublicConfig> => ipcRenderer.invoke('get-config'),
  updatePublicSettings: (patch: {
    refreshIntervalSeconds?: number
    demoMode?: boolean
    launchAtStartup?: boolean
    updates?: { autoDownload?: boolean }
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
  getActivitySummary: (date?: string): Promise<ActivityDaySummary> =>
    ipcRenderer.invoke('get-activity-summary', date),
  getActivitySettings: (): Promise<ActivitySettings> =>
    ipcRenderer.invoke('get-activity-settings'),
  updateActivitySettings: (patch: Partial<ActivitySettings>): Promise<ActivitySettings> =>
    ipcRenderer.invoke('update-activity-settings', patch),
  getActivityRules: (): Promise<ActivityRules> => ipcRenderer.invoke('get-activity-rules'),
  reloadActivityRules: (): Promise<ActivityRules> =>
    ipcRenderer.invoke('reload-activity-rules'),
  openActivityRules: (): Promise<void> => ipcRenderer.invoke('open-activity-rules'),
  exportActivity: (opts: {
    format: ActivityExportFormat
    from?: string
    to?: string
  }): Promise<{ ok: boolean; path?: string; message?: string }> =>
    ipcRenderer.invoke('export-activity', opts),
  correctActivityCategory: (
    payload: ActivityCorrectionPayload,
  ): Promise<ActivityCorrectionResult> =>
    ipcRenderer.invoke('correct-activity-category', payload),
  clearActivityData: (): Promise<{
    ok: boolean
    message: string
    summary: ActivityDaySummary
  }> => ipcRenderer.invoke('clear-activity-data'),
  getAppUpdateStatus: (): Promise<AppUpdateState> =>
    ipcRenderer.invoke('get-app-update-status'),
  checkAppUpdate: (): Promise<AppUpdateState> => ipcRenderer.invoke('check-app-update'),
  downloadAppUpdate: (): Promise<AppUpdateState> =>
    ipcRenderer.invoke('download-app-update'),
  installAppUpdate: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('install-app-update'),
  getWidgetUpdateStatus: (): Promise<WidgetUpdatesState> =>
    ipcRenderer.invoke('get-widget-update-status'),
  checkWidgetUpdates: (): Promise<WidgetUpdatesState> =>
    ipcRenderer.invoke('check-widget-updates'),
  updateWidgets: (ids?: string[]): Promise<WidgetUpdatesState> =>
    ipcRenderer.invoke('update-widgets', ids),
  installWidget: (id: string): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('install-widget', id),
  listRemoteWidgets: (): Promise<WidgetUpdateInfo[]> =>
    ipcRenderer.invoke('list-remote-widgets'),
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

contextBridge.exposeInMainWorld('lattice', api)

export type LatticeApi = typeof api

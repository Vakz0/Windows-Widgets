import type {
  CatalogWidgetInfo,
  NotionConnectionTestResult,
  NotionSettingsPatch,
  NotionTask,
  PublicConfig,
  SystemStats,
} from '../shared/types'

export type {
  CatalogWidgetInfo,
  NotionConnectionTestResult,
  NotionSettingsPatch,
  NotionTask,
  PublicConfig,
  SystemStats,
}

export type CatalogView = 'catalog' | 'settings'

export interface LatticeApi {
  getTasks: () => Promise<NotionTask[]>
  refreshTasks: () => Promise<NotionTask[]>
  getTaskDescription: (pageId: string) => Promise<string | null>
  getStats: () => Promise<SystemStats>
  getConfig: () => Promise<PublicConfig>
  updatePublicSettings: (patch: {
    refreshIntervalSeconds?: number
    demoMode?: boolean
    launchAtStartup?: boolean
  }) => Promise<{ ok: boolean; config: PublicConfig }>
  getNotionSettings: () => Promise<PublicConfig>
  saveNotionSettings: (
    patch: NotionSettingsPatch,
  ) => Promise<{ ok: boolean; config: PublicConfig; message: string }>
  testNotionConnection: (payload: {
    notionToken?: string
    databaseId?: string
  }) => Promise<NotionConnectionTestResult>
  getAppVersion: () => Promise<string>
  openConfigFile: () => Promise<void>
  listWidgets: () => Promise<CatalogWidgetInfo[]>
  setWidgetEnabled: (
    id: string,
    enabled: boolean,
  ) => Promise<{ ok: boolean; widgets: CatalogWidgetInfo[] }>
  openCatalog: () => Promise<void>
  closeCatalog: () => Promise<void>
  minimizeCatalog: () => Promise<void>
  toggleMaximizeCatalog: () => Promise<boolean>
  isCatalogMaximized: () => Promise<boolean>
  onCatalogMaximizedChanged: (cb: (maximized: boolean) => void) => () => void
  onCatalogNavigate: (cb: (view: CatalogView) => void) => () => void
  openExternal: (url: string) => Promise<void>
  hideMonitor: () => Promise<void>
  enableTemp: () => Promise<{ ok: boolean; message: string }>
  disableTemp: () => Promise<{ ok: boolean; message: string }>
  onTasksUpdated: (cb: (tasks: NotionTask[]) => void) => () => void
  onTasksError: (cb: (message: string) => void) => () => void
  onStatsUpdated: (cb: (stats: SystemStats) => void) => () => void
  onWidgetsChanged: (cb: (widgets: CatalogWidgetInfo[]) => void) => () => void
}

declare global {
  interface Window {
    lattice: LatticeApi
  }
}

export {}

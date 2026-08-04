import type { BrowserWindow } from 'electron'
import type {
  AppConfig,
  CatalogWidgetInfo,
  NotionTask,
  PublicConfig,
  SystemStats,
} from '../../shared/types'
import type { WidgetServiceId } from '../../shared/widget'

export interface IpcDeps {
  getConfig: () => AppConfig
  setConfig: (config: AppConfig) => void
  getTasksCache: () => NotionTask[]
  setTasksCache: (tasks: NotionTask[]) => void
  getStatsCache: () => SystemStats | null
  hasService: (service: WidgetServiceId) => boolean
  refreshNotion: (force?: boolean) => Promise<NotionTask[]>
  refreshStats: (forceTemp?: boolean) => Promise<SystemStats>
  toPublicConfig: () => PublicConfig
  applyLaunchAtStartup: () => void
  applyPowerMode: (force?: boolean) => void
  applyAutoDownload: (autoDownload: boolean) => void
  listCatalogWidgets: () => CatalogWidgetInfo[]
  setWidgetEnabledState: (id: string, enabled: boolean) => Promise<boolean>
  openCatalog: (opts?: { view?: 'catalog' | 'settings' }) => void
  getCatalogWindow: () => BrowserWindow | null
  hideFocusInterruptWindow: () => void
  notionWidgetIds: () => string[]
  sendTo: (ids: string[], channel: string, payload: unknown) => void
}

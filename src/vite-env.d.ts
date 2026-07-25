import type { NotionTask, PublicConfig, SystemStats } from '../shared/types'

export type { NotionTask, PublicConfig, SystemStats }

export interface WidgetsApi {
  getTasks: () => Promise<NotionTask[]>
  refreshTasks: () => Promise<NotionTask[]>
  getTaskDescription: (pageId: string) => Promise<string | null>
  getStats: () => Promise<SystemStats>
  getConfig: () => Promise<PublicConfig>
  openExternal: (url: string) => Promise<void>
  hideMonitor: () => Promise<void>
  enableTemp: () => Promise<{ ok: boolean; message: string }>
  disableTemp: () => Promise<{ ok: boolean; message: string }>
  onTasksUpdated: (cb: (tasks: NotionTask[]) => void) => () => void
  onTasksError: (cb: (message: string) => void) => () => void
  onStatsUpdated: (cb: (stats: SystemStats) => void) => () => void
}

declare global {
  interface Window {
    widgets: WidgetsApi
  }
}

export {}

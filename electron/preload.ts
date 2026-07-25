import { contextBridge, ipcRenderer } from 'electron'
import type { NotionTask, PublicConfig, SystemStats } from '../shared/types'

const api = {
  getTasks: (): Promise<NotionTask[]> => ipcRenderer.invoke('get-tasks'),
  refreshTasks: (): Promise<NotionTask[]> => ipcRenderer.invoke('refresh-tasks'),
  getTaskDescription: (pageId: string): Promise<string | null> =>
    ipcRenderer.invoke('get-task-description', pageId),
  getStats: (): Promise<SystemStats> => ipcRenderer.invoke('get-stats'),
  getConfig: (): Promise<PublicConfig> => ipcRenderer.invoke('get-config'),
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
}

contextBridge.exposeInMainWorld('widgets', api)

export type WidgetsApi = typeof api

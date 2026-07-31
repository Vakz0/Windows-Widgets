import { ipcRenderer } from 'electron'
import type {
  NotionConnectionTestResult,
  NotionSettingsPatch,
  PublicConfig,
  SystemStats,
} from '../../shared/types'

export function createConfigApi() {
  return {
    getStats: (): Promise<SystemStats> => ipcRenderer.invoke('get-stats'),
    getConfig: (): Promise<PublicConfig> => ipcRenderer.invoke('get-config'),
    getNotionSettings: (): Promise<PublicConfig> => ipcRenderer.invoke('get-config'),
    updatePublicSettings: (patch: {
      refreshIntervalSeconds?: number
      demoMode?: boolean
      launchAtStartup?: boolean
      updates?: { autoDownload?: boolean }
    }): Promise<{ ok: boolean; config: PublicConfig }> =>
      ipcRenderer.invoke('update-public-settings', patch),
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
  }
}

/** Shell helpers kept separate so composition can preserve the original key order. */
export function createShellApi() {
  return {
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
    hideMonitor: (): Promise<void> => ipcRenderer.invoke('hide-monitor'),
    enableTemp: (): Promise<{ ok: boolean; message: string }> =>
      ipcRenderer.invoke('enable-temp'),
    disableTemp: (): Promise<{ ok: boolean; message: string }> =>
      ipcRenderer.invoke('disable-temp'),
  }
}

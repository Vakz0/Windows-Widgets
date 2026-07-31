import { ipcRenderer } from 'electron'
import type {
  AppUpdateState,
  WidgetUpdateInfo,
  WidgetUpdatesState,
} from '../../shared/types'

export function createUpdatesApi() {
  return {
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
  }
}

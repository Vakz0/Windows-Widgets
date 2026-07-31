import { ipcMain } from 'electron'
import {
  checkForAppUpdates,
  downloadAppUpdate,
  getAppUpdateState,
  installAppUpdate,
} from '../updates'
import {
  checkWidgetUpdates,
  getWidgetUpdatesState,
  updateWidgets,
} from '../widgetUpdates'

export function registerUpdatesIpc(): void {
  ipcMain.handle('get-app-update-status', () => getAppUpdateState())
  ipcMain.handle('check-app-update', () => checkForAppUpdates({ silent: false }))
  ipcMain.handle('download-app-update', () => {
    downloadAppUpdate()
    return getAppUpdateState()
  })
  ipcMain.handle('install-app-update', () => {
    installAppUpdate()
    return { ok: true }
  })

  ipcMain.handle('get-widget-update-status', () => getWidgetUpdatesState())
  ipcMain.handle('check-widget-updates', () => checkWidgetUpdates({ silent: false }))
  ipcMain.handle('update-widgets', (_e, ids?: string[]) =>
    updateWidgets(Array.isArray(ids) ? ids : undefined),
  )
}

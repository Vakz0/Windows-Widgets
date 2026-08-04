import { ipcMain, shell } from 'electron'
import { installOrUpdateWidget, listRemoteCatalogWidgets } from '../widgetUpdates'
import type { IpcDeps } from './types'

export function registerWidgetsIpc(deps: IpcDeps): void {
  ipcMain.handle('list-widgets', () => deps.listCatalogWidgets())
  ipcMain.handle('set-widget-enabled', async (_e, id: string, enabled: boolean) => {
    if (typeof id !== 'string' || typeof enabled !== 'boolean') {
      return { ok: false, widgets: deps.listCatalogWidgets() }
    }
    const ok = await deps.setWidgetEnabledState(id, enabled)
    return { ok, widgets: deps.listCatalogWidgets() }
  })
  ipcMain.handle('open-catalog', () => {
    deps.openCatalog()
  })
  ipcMain.handle('close-catalog', () => {
    const catalogWindow = deps.getCatalogWindow()
    if (catalogWindow && !catalogWindow.isDestroyed()) {
      catalogWindow.close()
    }
  })
  ipcMain.handle('minimize-catalog', () => {
    const catalogWindow = deps.getCatalogWindow()
    if (catalogWindow && !catalogWindow.isDestroyed()) {
      catalogWindow.minimize()
    }
  })
  ipcMain.handle('toggle-maximize-catalog', () => {
    const catalogWindow = deps.getCatalogWindow()
    if (!catalogWindow || catalogWindow.isDestroyed()) return false
    if (catalogWindow.isMaximized()) catalogWindow.unmaximize()
    else catalogWindow.maximize()
    return catalogWindow.isMaximized()
  })
  ipcMain.handle('is-catalog-maximized', () => {
    const catalogWindow = deps.getCatalogWindow()
    if (!catalogWindow || catalogWindow.isDestroyed()) return false
    return catalogWindow.isMaximized()
  })
  ipcMain.handle('open-external', async (_e, url: string) => {
    if (url) await shell.openExternal(url)
  })
  ipcMain.handle('install-widget', (_e, id: string) => {
    if (!id || typeof id !== 'string') {
      return { ok: false, message: 'Id widget invalide.' }
    }
    return installOrUpdateWidget(id)
  })
  ipcMain.handle('list-remote-widgets', () => listRemoteCatalogWidgets())
}

import { BrowserWindow, screen } from 'electron'
import {
  appIconPath,
  applyWindowIcon,
  defaultWebPreferences,
  loadRendererWidget,
} from './helpers'

export function createCatalogWindowController() {
  let catalogWindow: BrowserWindow | null = null

  function openCatalog(opts?: { view?: 'catalog' | 'settings' }): void {
    const view = opts?.view ?? 'catalog'

    if (catalogWindow && !catalogWindow.isDestroyed()) {
      catalogWindow.webContents.send('catalog-navigate', view)
      catalogWindow.show()
      catalogWindow.focus()
      return
    }

    const display = screen.getPrimaryDisplay().workArea
    const width = 780
    const height = 560
    const x = display.x + Math.floor((display.width - width) / 2)
    const y = display.y + Math.floor((display.height - height) / 2)

    catalogWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      show: false,
      frame: false,
      transparent: false,
      resizable: true,
      minimizable: true,
      maximizable: true,
      skipTaskbar: false,
      alwaysOnTop: false,
      hasShadow: true,
      backgroundColor: '#191919',
      icon: appIconPath(),
      webPreferences: defaultWebPreferences(),
    })

    applyWindowIcon(catalogWindow)
    loadRendererWidget(catalogWindow, 'catalog', { view })

    const emitCatalogMaximized = () => {
      if (!catalogWindow || catalogWindow.isDestroyed()) return
      catalogWindow.webContents.send(
        'catalog-maximized-changed',
        catalogWindow.isMaximized(),
      )
    }
    catalogWindow.on('maximize', emitCatalogMaximized)
    catalogWindow.on('unmaximize', emitCatalogMaximized)

    catalogWindow.webContents.once('did-finish-load', () => {
      catalogWindow?.show()
      catalogWindow?.focus()
    })

    catalogWindow.on('closed', () => {
      catalogWindow = null
    })
  }

  function getCatalogWindow(): BrowserWindow | null {
    return catalogWindow
  }

  return { openCatalog, getCatalogWindow }
}

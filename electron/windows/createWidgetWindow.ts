import { BrowserWindow, screen } from 'electron'
import type { AppConfig, SystemStats } from '../../shared/types'
import type { WidgetServiceId } from '../../shared/widget'
import { updateWindowBounds } from '../config'
import { getExternalWidgetPackage } from '../widgets/discoverExternal'
import { getWidgetDefinitionCached } from '../widgets/registry'
import {
  appIconPath,
  applyWindowIcon,
  defaultWebPreferences,
  loadRendererWidget,
} from './helpers'

const BOUNDS_SAVE_DEBOUNCE_MS = 1_500

export interface CreateWidgetWindowDeps {
  getConfig: () => AppConfig
  setConfig: (config: AppConfig) => void
  windows: Partial<Record<string, BrowserWindow>>
  applyPowerMode: (force?: boolean) => void
  hasService: (service: WidgetServiceId) => boolean
  refreshStats: (forceTemp?: boolean) => Promise<SystemStats>
  isEnabled: (id: string) => boolean
}

export function createWidgetWindowController(deps: CreateWidgetWindowDeps) {
  const boundsTimers: Partial<Record<string, NodeJS.Timeout>> = {}

  async function loadWidgetUrl(win: BrowserWindow, widgetId: string): Promise<void> {
    const external = await getExternalWidgetPackage(widgetId)
    if (external) {
      void win.loadFile(external.entryFile)
      return
    }
    loadRendererWidget(win, widgetId)
  }

  function schedulePersistBounds(id: string, win: BrowserWindow): void {
    if (boundsTimers[id]) clearTimeout(boundsTimers[id])
    boundsTimers[id] = setTimeout(() => {
      if (win.isDestroyed()) return
      void updateWindowBounds(deps.getConfig(), id, win.getBounds()).then((next) => {
        deps.setConfig(next)
      })
    }, BOUNDS_SAVE_DEBOUNCE_MS)
  }

  function createWidgetWindow(
    id: string,
    opts: { show?: boolean } = {},
  ): BrowserWindow {
    const def = getWidgetDefinitionCached(id)
    if (!def) {
      throw new Error(`Unknown widget: ${id}`)
    }

    const config = deps.getConfig()
    const saved = config.windows?.[id]
    const display = screen.getPrimaryDisplay().workArea
    const isPopup = def.placement === 'popup'

    const width = isPopup ? def.defaultBounds.width : (saved?.width ?? def.defaultBounds.width)
    const height = isPopup ? def.defaultBounds.height : (saved?.height ?? def.defaultBounds.height)

    let x = isPopup ? undefined : saved?.x
    let y = isPopup ? undefined : saved?.y

    if (x === null || x === undefined || y === null || y === undefined) {
      if (id === 'calendar') {
        x = display.x + 40
        y = display.y + 80
      } else if (id === 'tasks') {
        x = display.x + 40
        y = display.y + display.height - height - 40
      } else if (isPopup) {
        const cursor = screen.getCursorScreenPoint()
        x = Math.min(cursor.x - width / 2, display.x + display.width - width - 8)
        y = Math.min(cursor.y - height - 12, display.y + display.height - height - 8)
        x = Math.max(display.x + 8, x)
        y = Math.max(display.y + 8, y)
      } else {
        x = display.x + 40
        y = display.y + 80
      }
    }

    const resizable = def.windowOptions?.resizable ?? true
    const alwaysOnTop = def.windowOptions?.alwaysOnTop ?? false

    const win = new BrowserWindow({
      width,
      height,
      x,
      y,
      show: false,
      frame: false,
      transparent: false,
      resizable,
      skipTaskbar: true,
      alwaysOnTop,
      hasShadow: true,
      backgroundColor: '#191919',
      icon: appIconPath(),
      paintWhenInitiallyHidden: false,
      webPreferences: defaultWebPreferences(),
    })

    applyWindowIcon(win)

    if (alwaysOnTop) {
      win.setAlwaysOnTop(true, 'pop-up-menu')
      win.setVisibleOnAllWorkspaces(true)
    }

    void loadWidgetUrl(win, id)

    win.webContents.once('did-finish-load', () => {
      if ((opts.show ?? true) && !isPopup) {
        win.showInactive()
      }
    })

    win.on('moved', () => schedulePersistBounds(id, win))
    win.on('resized', () => schedulePersistBounds(id, win))
    win.on('show', () => {
      if (isPopup) {
        deps.applyPowerMode(true)
        if (deps.hasService('system-stats')) void deps.refreshStats(true)
      } else {
        deps.applyPowerMode()
      }
    })
    win.on('hide', () => {
      deps.applyPowerMode()
    })
    win.on('closed', () => {
      if (deps.windows[id] === win) delete deps.windows[id]
    })

    if (isPopup) {
      win.on('blur', () => {
        if (!win.isDestroyed()) win.hide()
      })
    }

    deps.windows[id] = win
    return win
  }

  function isWidgetVisible(id: string): boolean {
    const win = deps.windows[id]
    return Boolean(win && !win.isDestroyed() && win.isVisible())
  }

  function showWidget(id: string): void {
    if (!deps.isEnabled(id)) return
    let win = deps.windows[id]
    if (!win || win.isDestroyed()) {
      const def = getWidgetDefinitionCached(id)
      if (!def || def.placement !== 'desktop') return
      win = createWidgetWindow(id)
      return
    }
    win.show()
    deps.applyPowerMode()
  }

  function hideWidget(id: string): void {
    deps.windows[id]?.hide()
  }

  function clearBoundsTimers(): void {
    for (const t of Object.values(boundsTimers)) {
      if (t) clearTimeout(t)
    }
  }

  return {
    createWidgetWindow,
    isWidgetVisible,
    showWidget,
    hideWidget,
    clearBoundsTimers,
  }
}

import {
  app,
  BrowserWindow,
  Tray,
  nativeImage,
<<<<<<< HEAD
=======
  ipcMain,
  shell,
  screen,
  powerMonitor,
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
} from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { migrateLegacyUserData } from './migrate'
import {
  getConfigPath,
  loadConfig,
<<<<<<< HEAD
=======
  saveConfig,
  updateWindowBounds,
  setWidgetEnabled,
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  isWidgetEnabledInConfig,
  hasValidNotionCredentials,
  getUpdatesConfig,
  setUpdatesConfig,
} from './config'
<<<<<<< HEAD
import { fetchNotionTasks } from './notion'
import { getSystemStats, isTempServiceRunning } from './system'
import { isActivityTrackerRunning, stopActivityTracker } from './activity'
import { createTrayMenuController } from './trayMenu'
import {
  getAllWidgetDefinitions,
  getAllWidgetDefinitionsCached,
  getDesktopWidgetDefinitionsCached,
} from './widgets/registry'
import {
  applyAutoDownload,
  checkForAppUpdates,
  initAppUpdater,
} from './updates'
import {
  checkWidgetUpdates,
  initWidgetUpdater,
} from './widgetUpdates'
import { registerAllIpc } from './ipc'
import { createFocusInterruptController } from './focusInterruptWindow'
import { createPowerModeController } from './powerMode'
import { createWidgetLifecycle } from './widgets/lifecycle'
import { createCatalogWindowController } from './windows/catalogWindow'
import { createWidgetWindowController } from './windows/createWidgetWindow'
import { resolveAsset } from './windows/helpers'
import type {
  AppConfig,
  NotionTask,
  PublicConfig,
  SystemStats,
=======
import {
  createTask,
  deleteTask,
  fetchNotionTasks,
  fetchPropertyOptions,
  fetchTaskDescription,
  testNotionConnection,
  updateTaskField,
} from './notion'
import { getSystemStats, startTempDaemonElevated, stopTempDaemon, isTempServiceRunning } from './system'
import {
  clearActivityData,
  correctActivityCategory,
  exportActivity,
  getActivityFocusSeed,
  getActivityRules,
  getActivitySettings,
  getActivitySummary,
  handleActivityResume,
  handleActivitySuspend,
  isActivityTrackerRunning,
  openActivityRulesFile,
  refreshActivitySummary,
  reloadActivityRules,
  setActivityUpdatedListener,
  startActivityTracker,
  stopActivityTracker,
  updateActivitySettings,
} from './activity'
import {
  getFocusJournal,
  getFocusSession,
  getPendingFocusInterrupt,
  pauseFocusSession,
  resolveFocusInterrupt,
  resumeFocusSession,
  setFocusSessionListeners,
  startFocusSession,
  stopFocusSession,
  updateFocusAllowlist,
} from './focusSession'
import { createTrayMenuController } from './trayMenu'
import { broadcastToAllWindows } from './notify'
import {
  getAllWidgetDefinitions,
  getDesktopWidgetDefinitions,
  getWidgetDefinition,
} from './widgets/registry'
import { getExternalWidgetPackage } from './widgets/discoverExternal'
import {
  applyAutoDownload,
  checkForAppUpdates,
  downloadAppUpdate,
  getAppUpdateState,
  initAppUpdater,
  installAppUpdate,
} from './updates'
import {
  checkWidgetUpdates,
  getWidgetUpdatesState,
  initWidgetUpdater,
  installOrUpdateWidget,
  listRemoteCatalogWidgets,
  updateWidgets,
} from './widgetUpdates'
import type {
  ActivityCorrectionPayload,
  ActivityDaySummary,
  ActivityExportFormat,
  ActivitySettings,
  AppConfig,
  CatalogWidgetInfo,
  CreateTaskPayload,
  CreateTaskResult,
  DeleteTaskPayload,
  DeleteTaskResult,
  FocusAllowlist,
  FocusInterruptContext,
  NotionSettingsPatch,
  NotionTask,
  PublicConfig,
  ResolveFocusInterruptPayload,
  StartFocusSessionPayload,
  SystemStats,
  TaskPropertyMapping,
  TaskSourceFilters,
  UpdateTaskFieldPayload,
  UpdateTaskFieldResult,
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
} from '../shared/types'
import type { WidgetServiceId } from '../shared/widget'

// Lower Chromium cost for mostly-static widgets
app.setName('lattice-desk')
app.setAppUserModelId('com.vakz.lattice-desk')
app.disableHardwareAcceleration()

<<<<<<< HEAD
let config: AppConfig
let tray: Tray | null = null
let tasksCache: NotionTask[] = []
let statsCache: SystemStats | null = null
=======
const DEV_URL = process.env.VITE_DEV_SERVER_URL
const isDev = Boolean(DEV_URL)

/** Idle / sleep intervals (ms) */
const STATS_ACTIVE_MS = 2_000
const STATS_IDLE_MS = 30_000
const STATS_SLEEP_MS = 0 // stopped
const NOTION_IDLE_MULT = 3
const NOTION_SLEEP_MULT = 10
const SYSTEM_IDLE_SLEEP_SEC = 180
const BOUNDS_SAVE_DEBOUNCE_MS = 1_500

type PowerMode = 'active' | 'idle' | 'sleep'

let config: AppConfig
let tray: Tray | null = null
let catalogWindow: BrowserWindow | null = null
let focusInterruptWindow: BrowserWindow | null = null
let tasksCache: NotionTask[] = []
let statsCache: SystemStats | null = null
let notionTimer: NodeJS.Timeout | null = null
let statsTimer: NodeJS.Timeout | null = null
let powerTimer: NodeJS.Timeout | null = null
let powerMode: PowerMode = 'active'
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
let monitorVisible = false
let notionInFlight = false
let statsInFlight = false
let lastNotionAt = 0
let sleeping = false

const windows: Partial<Record<string, BrowserWindow>> = {}
<<<<<<< HEAD
=======
const boundsTimers: Partial<Record<string, NodeJS.Timeout>> = {}

function resolveAsset(...parts: string[]): string {
  const candidates = [
    path.join(process.resourcesPath, ...parts),
    path.join(app.getAppPath(), ...parts),
    path.join(__dirname, '..', ...parts),
    path.join(process.cwd(), ...parts),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

function preloadPath(): string {
  return path.join(__dirname, 'preload.js')
}

/** Icône app (barre des tâches / Alt-Tab). Préfère .ico sous Windows. */
function appIconPath(): string {
  const ico = resolveAsset('assets', 'icon.ico')
  if (fs.existsSync(ico)) return ico
  return resolveAsset('assets', 'icon.png')
}

function appIconImage(): Electron.NativeImage {
  const img = nativeImage.createFromPath(appIconPath())
  return img.isEmpty() ? nativeImage.createEmpty() : img
}

function applyWindowIcon(win: BrowserWindow): void {
  const icon = appIconImage()
  if (!icon.isEmpty()) win.setIcon(icon)
}

function defaultWebPreferences(
  overrides: Partial<Electron.WebPreferences> = {},
): Electron.WebPreferences {
  return {
    preload: preloadPath(),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    backgroundThrottling: true,
    spellcheck: false,
    v8CacheOptions: 'code',
    ...overrides,
  }
}

function loadRendererWidget(
  win: BrowserWindow,
  widgetId: string,
  query: Record<string, string> = {},
): void {
  const params = { widget: widgetId, ...query }
  if (isDev && DEV_URL) {
    const search = new URLSearchParams(params).toString()
    void win.loadURL(`${DEV_URL}?${search}`)
    return
  }
  void win.loadFile(path.join(__dirname, '../dist/index.html'), { query: params })
}
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644

function isEnabled(id: string): boolean {
  return isWidgetEnabledInConfig(config, id)
}

function enabledDefsForService(service: WidgetServiceId) {
<<<<<<< HEAD
  return getAllWidgetDefinitionsCached().filter(
=======
  return getAllWidgetDefinitions().filter(
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    (d) => isEnabled(d.id) && d.services.includes(service),
  )
}

function hasService(service: WidgetServiceId): boolean {
  return enabledDefsForService(service).length > 0
}

function notionWidgetIds(): string[] {
  return enabledDefsForService('notion').map((d) => d.id)
}

<<<<<<< HEAD
function activityWidgetIds(): string[] {
  return enabledDefsForService('activity-tracker').map((d) => d.id)
}

function sendTo(ids: string[], channel: string, payload: unknown): void {
  for (const id of ids) {
    const win = windows[id]
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

const power = createPowerModeController({
  getConfig: () => config,
  windows,
  getMonitorVisible: () => monitorVisible,
  getSleeping: () => sleeping,
  setSleeping: (v) => {
    sleeping = v
  },
  hasService,
  refreshNotion,
  refreshStats,
})

const widgetWindows = createWidgetWindowController({
  getConfig: () => config,
  setConfig: (next) => {
    config = next
  },
  windows,
  getMonitorVisible: () => monitorVisible,
  setMonitorVisible: (v) => {
    monitorVisible = v
  },
  applyPowerMode: (force) => power.applyPowerMode(force),
  hasService,
  refreshStats,
  isEnabled,
})

const catalog = createCatalogWindowController()
const focusInterrupt = createFocusInterruptController()

const lifecycle = createWidgetLifecycle({
  getConfig: () => config,
  setConfig: (next) => {
    config = next
  },
  windows,
  isEnabled,
  hasService,
  createWidgetWindow: widgetWindows.createWidgetWindow,
  setMonitorVisible: (v) => {
    monitorVisible = v
  },
  getTasksCache: () => tasksCache,
  setTasksCache: (tasks) => {
    tasksCache = tasks
  },
  refreshNotion,
  applyPowerMode: (force) => power.applyPowerMode(force),
  sendTo,
  activityWidgetIds,
})
=======
function desktopWidgetsVisible(): boolean {
  return getDesktopWidgetDefinitions().some((d) => {
    const win = windows[d.id]
    return Boolean(win && !win.isDestroyed() && win.isVisible())
  })
}

function popupWidgetVisible(): boolean {
  return getAllWidgetDefinitions().some((d) => {
    if (d.placement !== 'popup') return false
    const win = windows[d.id]
    return Boolean(win && !win.isDestroyed() && win.isVisible())
  })
}

function computePowerMode(): PowerMode {
  if (sleeping) return 'sleep'
  try {
    if (powerMonitor.getSystemIdleTime() >= SYSTEM_IDLE_SLEEP_SEC) return 'sleep'
  } catch {
    /* ignore */
  }
  if (monitorVisible || popupWidgetVisible()) return 'active'
  if (desktopWidgetsVisible()) return 'idle'
  return 'sleep'
}

function notionIntervalMs(): number {
  const base = Math.max(60, config.refreshIntervalSeconds) * 1000
  if (powerMode === 'sleep') return base * NOTION_SLEEP_MULT
  if (powerMode === 'idle') return base * NOTION_IDLE_MULT
  return base
}

function statsIntervalMs(): number {
  if (powerMode === 'sleep') return STATS_SLEEP_MS
  if (powerMode === 'active') return STATS_ACTIVE_MS
  return STATS_IDLE_MS
}

function loadWidgetUrl(win: BrowserWindow, widgetId: string): void {
  const external = getExternalWidgetPackage(widgetId)
  if (external) {
    void win.loadFile(external.entryFile)
    return
  }
  loadRendererWidget(win, widgetId)
}

function createWidgetWindow(
  id: string,
  opts: { show?: boolean } = {},
): BrowserWindow {
  const def = getWidgetDefinition(id)
  if (!def) {
    throw new Error(`Unknown widget: ${id}`)
  }

  const saved = config.windows?.[id]
  const display = screen.getPrimaryDisplay().workArea
  const isPopup = def.placement === 'popup'

  const width = isPopup ? def.defaultBounds.width : (saved?.width ?? def.defaultBounds.width)
  const height = isPopup ? def.defaultBounds.height : (saved?.height ?? def.defaultBounds.height)
  let x = isPopup ? undefined : saved?.x
  let y = isPopup ? undefined : saved?.y

  if (x == null || y == null) {
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

  loadWidgetUrl(win, id)

  win.webContents.once('did-finish-load', () => {
    if (opts.show !== false && !isPopup) {
      win.showInactive()
    }
  })

  win.on('moved', () => schedulePersistBounds(id, win))
  win.on('resized', () => schedulePersistBounds(id, win))
  win.on('show', () => {
    if (isPopup) {
      monitorVisible = id === 'monitor' ? true : monitorVisible
      applyPowerMode(true)
      if (hasService('system-stats')) void refreshStats(true)
    } else {
      applyPowerMode()
    }
  })
  win.on('hide', () => {
    if (id === 'monitor') monitorVisible = false
    applyPowerMode()
  })
  win.on('closed', () => {
    if (windows[id] === win) delete windows[id]
    if (id === 'monitor') monitorVisible = false
  })

  if (isPopup) {
    win.on('blur', () => {
      if (!win.isDestroyed()) win.hide()
    })
  }

  windows[id] = win
  return win
}

function schedulePersistBounds(id: string, win: BrowserWindow): void {
  if (boundsTimers[id]) clearTimeout(boundsTimers[id])
  boundsTimers[id] = setTimeout(() => {
    if (win.isDestroyed()) return
    config = updateWindowBounds(config, id, win.getBounds())
  }, BOUNDS_SAVE_DEBOUNCE_MS)
}
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644

function createTrayIcon(): Electron.NativeImage {
  const candidates = [
    resolveAsset('assets', 'tray.png'),
    resolveAsset('assets', 'tray-16.png'),
    resolveAsset('assets', 'icon.png'),
  ]
  for (const iconFile of candidates) {
    if (fs.existsSync(iconFile)) {
      const img = nativeImage.createFromPath(iconFile)
      if (!img.isEmpty()) {
        return img.resize({ width: 16, height: 16, quality: 'best' })
      }
    }
  }
  const png = Buffer.from(
<<<<<<< HEAD
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2NkYGD4z0ABYBzVMKoB' +
      'BgZGRgYGBgYGRgYGBgYAwv4CAf1yQ9kAAAAASUVORK5CYII=',
=======
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2NkYGD4z0ABYBzVMKoBBgZGRgYGBgYGRgYGBgYAwv4CAf1yQ9kAAAAASUVORK5CYII=',
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    'base64',
  )
  return nativeImage.createFromBuffer(png)
}

function updateTrayTooltip(): void {
  if (!tray) return
  if (!statsCache) {
    tray.setToolTip('Lattice')
    return
  }
<<<<<<< HEAD
  const cached = statsCache
  void isTempServiceRunning().then((running) => {
    if (!tray || statsCache !== cached) return
    let temp: string
    if (cached.temperatureC !== null && cached.temperatureC !== undefined) {
      temp = `${cached.temperatureC}°C`
    } else if (running) {
      temp = 'temp. …'
    } else {
      temp = 'temp. arrêtée'
    }
    tray.setToolTip(
      `CPU ${cached.cpuPercent}% · RAM ${cached.ramPercent}% · ${temp}`,
    )
  })
=======
  const temp =
    statsCache.temperatureC != null
      ? `${statsCache.temperatureC}°C`
      : isTempServiceRunning()
        ? 'temp. …'
        : 'temp. arrêtée'
  tray.setToolTip(
    `CPU ${statsCache.cpuPercent}% · RAM ${statsCache.ramPercent}% · ${temp}`,
  )
}

function ensureMonitorWindow(): BrowserWindow {
  let win = windows.monitor
  if (!win || win.isDestroyed()) {
    win = createWidgetWindow('monitor', { show: false })
  }
  return win
}

function toggleMonitor(): void {
  if (!isEnabled('monitor')) return

  const win = ensureMonitorWindow()

  if (win.isVisible()) {
    win.hide()
    return
  }

  const display = screen.getPrimaryDisplay().workArea
  const cursor = screen.getCursorScreenPoint()
  const [width, height] = win.getSize()
  let x = cursor.x - Math.floor(width / 2)
  let y = cursor.y - height - 16
  x = Math.min(Math.max(display.x + 8, x), display.x + display.width - width - 8)
  y = Math.min(Math.max(display.y + 8, y), display.y + display.height - height - 8)
  win.setPosition(x, y)

  const show = () => {
    win.show()
    win.focus()
  }
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', show)
  } else {
    show()
  }
}

function isWidgetVisible(id: string): boolean {
  const win = windows[id]
  return Boolean(win && !win.isDestroyed() && win.isVisible())
}

function showWidget(id: string): void {
  if (!isEnabled(id)) return
  let win = windows[id]
  if (!win || win.isDestroyed()) {
    const def = getWidgetDefinition(id)
    if (!def || def.placement !== 'desktop') return
    win = createWidgetWindow(id)
    return
  }
  win.show()
  applyPowerMode()
}

function hideWidget(id: string): void {
  windows[id]?.hide()
}

function listCatalogWidgets(): CatalogWidgetInfo[] {
  return getAllWidgetDefinitions().map((d) => ({
    id: d.id,
    label: d.label,
    description: d.description,
    source: d.source,
    placement: d.placement,
    enabled: isEnabled(d.id),
  }))
}

function broadcastWidgetsChanged(): void {
  broadcastToAllWindows('widgets-changed', listCatalogWidgets())
}

function enableWidget(id: string): boolean {
  const def = getWidgetDefinition(id)
  if (!def) return false
  if (isEnabled(id)) return true

  config = setWidgetEnabled(config, id, true)

  if (def.placement === 'desktop') {
    createWidgetWindow(id)
  }
  // popup widgets stay lazy until tray click

  recomputeServices()
  broadcastWidgetsChanged()
  return true
}

function disableWidget(id: string): boolean {
  const def = getWidgetDefinition(id)
  if (!def) return false
  if (!isEnabled(id)) return true

  config = setWidgetEnabled(config, id, false)

  const win = windows[id]
  if (win && !win.isDestroyed()) {
    win.destroy()
  }
  delete windows[id]
  if (id === 'monitor') monitorVisible = false

  recomputeServices()
  broadcastWidgetsChanged()
  return true
}

function setWidgetEnabledState(id: string, enabled: boolean): boolean {
  return enabled ? enableWidget(id) : disableWidget(id)
}

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

function activityWidgetIds(): string[] {
  return enabledDefsForService('activity-tracker').map((d) => d.id)
}

function pushActivitySummary(summary: ActivityDaySummary): void {
  sendTo(activityWidgetIds(), 'activity-updated', summary)
}

function broadcastFocusSession(): void {
  broadcastToAllWindows('focus-session-updated', getFocusSession())
  refreshActivitySummary()
}

function hideFocusInterruptWindow(): void {
  if (focusInterruptWindow && !focusInterruptWindow.isDestroyed()) {
    focusInterruptWindow.hide()
  }
}

function showFocusInterruptWindow(ctx: FocusInterruptContext): void {
  const display = screen.getPrimaryDisplay().workArea
  const width = 420
  const height = 420
  const x = display.x + Math.floor((display.width - width) / 2)
  const y = display.y + Math.floor((display.height - height) / 2)

  if (!focusInterruptWindow || focusInterruptWindow.isDestroyed()) {
    focusInterruptWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      show: false,
      frame: false,
      transparent: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: true,
      backgroundColor: '#191919',
      icon: appIconPath(),
      webPreferences: defaultWebPreferences({ backgroundThrottling: false }),
    })
    applyWindowIcon(focusInterruptWindow)
    focusInterruptWindow.setAlwaysOnTop(true, 'pop-up-menu')
    focusInterruptWindow.setVisibleOnAllWorkspaces(true)
    loadRendererWidget(focusInterruptWindow, 'focus-interrupt')

    focusInterruptWindow.on('closed', () => {
      focusInterruptWindow = null
    })
  } else {
    focusInterruptWindow.setBounds({ x, y, width, height })
  }

  const win = focusInterruptWindow
  const sendCtx = () => {
    if (!win.isDestroyed()) win.webContents.send('focus-interrupt', ctx)
  }
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', () => {
      sendCtx()
      win.show()
      win.focus()
    })
  } else {
    sendCtx()
    win.show()
    win.focus()
  }
}

function wireFocusSessionBridge(): void {
  setFocusSessionListeners({
    onChanged: () => broadcastFocusSession(),
    onInterrupt: (ctx) => showFocusInterruptWindow(ctx),
  })
}

function syncActivityService(): void {
  const needed = hasService('activity-tracker')
  if (needed && !isActivityTrackerRunning()) {
    setActivityUpdatedListener(pushActivitySummary)
    startActivityTracker()
  } else if (!needed && isActivityTrackerRunning()) {
    stopActivityTracker()
    setActivityUpdatedListener(null)
  }
}

function recomputeServices(): void {
  if (!hasService('notion')) {
    tasksCache = []
  } else if (!tasksCache.length) {
    void refreshNotion(true)
  }

  if (!hasService('temp-daemon') && isTempServiceRunning()) {
    stopTempDaemon()
  }

  syncActivityService()
  applyPowerMode(true)
}

function bootEnabledWidgets(): void {
  for (const d of getAllWidgetDefinitions()) {
    if (!isEnabled(d.id)) continue
    if (d.placement === 'desktop') {
      createWidgetWindow(d.id)
    }
    // popup: lazy
  }
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
}

let trayMenu: ReturnType<typeof createTrayMenuController> | null = null

function setupTray(): void {
  tray = new Tray(createTrayIcon())
  updateTrayTooltip()

  trayMenu = createTrayMenuController(() => tray, {
    getConfig: () => config,
    setLaunchAtStartup: (enabled) => {
      config.launchAtStartup = enabled
    },
    getStats: () => statsCache,
    setStats: (stats) => {
      statsCache = stats
    },
    getEnabledDesktopWidgets: () =>
<<<<<<< HEAD
      getDesktopWidgetDefinitionsCached()
        .filter((d) => isEnabled(d.id))
        .map((d) => ({ id: d.id, label: d.label })),
    isWidgetVisible: widgetWindows.isWidgetVisible,
    isMonitorEnabled: () => isEnabled('monitor'),
    hasNotionWidgets: () => hasService('notion'),
    hasTempDaemon: () => hasService('temp-daemon'),
    showWidget: widgetWindows.showWidget,
    hideWidget: widgetWindows.hideWidget,
    toggleMonitor: widgetWindows.toggleMonitor,
    openCatalog: catalog.openCatalog,
    openSettings: () => catalog.openCatalog({ view: 'settings' }),
    applyPowerMode: () => power.applyPowerMode(),
=======
      getDesktopWidgetDefinitions()
        .filter((d) => isEnabled(d.id))
        .map((d) => ({ id: d.id, label: d.label })),
    isWidgetVisible,
    isMonitorEnabled: () => isEnabled('monitor'),
    hasNotionWidgets: () => hasService('notion'),
    hasTempDaemon: () => hasService('temp-daemon'),
    showWidget,
    hideWidget,
    toggleMonitor,
    openCatalog,
    openSettings: () => openCatalog({ view: 'settings' }),
    applyPowerMode: () => applyPowerMode(),
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    applyLaunchAtStartup,
    refreshNotion,
    refreshStats,
    sendStatsToMonitor: (stats) => sendTo(['monitor'], 'stats-updated', stats),
    updateTrayTooltip,
  })

  tray.on('click', () => {
<<<<<<< HEAD
    if (isEnabled('monitor')) widgetWindows.toggleMonitor()
    else catalog.openCatalog()
=======
    if (isEnabled('monitor')) toggleMonitor()
    else openCatalog()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  })
  tray.on('right-click', (_event, bounds) => {
    trayMenu?.popupAt(bounds)
  })
}

function applyLaunchAtStartup(): void {
  app.setLoginItemSettings({
    openAtLogin: config.launchAtStartup,
    path: process.execPath,
    args: app.isPackaged ? [] : [path.resolve(process.argv[1] ?? '.')],
  })
}

<<<<<<< HEAD
async function refreshNotion(force = false): Promise<NotionTask[]> {
  if (!hasService('notion')) return tasksCache
  if (notionInFlight) return tasksCache
  if (!force && power.getPowerMode() === 'sleep' && tasksCache.length > 0) {
    return tasksCache
  }

  const minGap = force ? 0 : power.notionIntervalMs() * 0.8
=======
function sendTo(ids: string[], channel: string, payload: unknown): void {
  for (const id of ids) {
    const win = windows[id]
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

async function refreshNotion(force = false): Promise<NotionTask[]> {
  if (!hasService('notion')) return tasksCache
  if (notionInFlight) return tasksCache
  if (!force && powerMode === 'sleep' && tasksCache.length > 0) {
    return tasksCache
  }

  const minGap = force ? 0 : notionIntervalMs() * 0.8
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  if (!force && Date.now() - lastNotionAt < minGap) {
    return tasksCache
  }

  notionInFlight = true
  try {
    tasksCache = await fetchNotionTasks(config)
    lastNotionAt = Date.now()
    sendTo(notionWidgetIds(), 'tasks-updated', tasksCache)
  } catch (err) {
    console.error('Notion sync failed', err)
    sendTo(notionWidgetIds(), 'tasks-error', String(err))
  } finally {
    notionInFlight = false
  }
  return tasksCache
}

async function refreshStats(forceTemp = false): Promise<SystemStats> {
  if (statsInFlight) return statsCache as SystemStats
  statsInFlight = true
  try {
    statsCache = await getSystemStats({
      includeTemp: forceTemp || monitorVisible,
    })
    updateTrayTooltip()
    if (monitorVisible && isEnabled('monitor')) {
      sendTo(['monitor'], 'stats-updated', statsCache)
    }
  } finally {
    statsInFlight = false
  }
  return statsCache
}

<<<<<<< HEAD
=======
function clearTimers(): void {
  if (notionTimer) {
    clearInterval(notionTimer)
    notionTimer = null
  }
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
}

function scheduleTimers(): void {
  clearTimers()

  if (hasService('notion')) {
    const notionMs = notionIntervalMs()
    notionTimer = setInterval(() => {
      if (powerMode === 'sleep') return
      void refreshNotion()
    }, notionMs)
  }

  // Light tray sampling always (tooltip); monitor push gated in refreshStats
  const statsMs = statsIntervalMs()
  if (statsMs > 0) {
    statsTimer = setInterval(() => {
      void refreshStats(false)
    }, statsMs)
  }
}

function applyPowerMode(force = false): void {
  const next = computePowerMode()
  if (!force && next === powerMode) return
  powerMode = next
  scheduleTimers()
}

function setupPowerManagement(): void {
  const enterSleep = () => {
    sleeping = true
    handleActivitySuspend()
    applyPowerMode(true)
  }
  const leaveSleep = () => {
    sleeping = false
    applyPowerMode(true)
    handleActivityResume()
    if (hasService('notion')) void refreshNotion(true)
    void refreshStats(monitorVisible)
  }

  powerMonitor.on('suspend', enterSleep)
  powerMonitor.on('resume', leaveSleep)
  powerMonitor.on('lock-screen', enterSleep)
  powerMonitor.on('unlock-screen', leaveSleep)

  powerTimer = setInterval(() => {
    applyPowerMode()
  }, 30_000)
}

>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
function toPublicConfig(): PublicConfig {
  return {
    refreshIntervalSeconds: config.refreshIntervalSeconds,
    demoMode: config.demoMode,
    configPath: getConfigPath(),
    launchAtStartup: config.launchAtStartup,
    notionConfigured: hasValidNotionCredentials(config),
    notionTokenStored: Boolean(config.notionToken?.trim()),
    databaseId: config.databaseId ?? '',
    properties: { ...config.properties },
    filters: {
      hideCompleted: config.filters.hideCompleted,
      completedStatusValues: [...(config.filters.completedStatusValues ?? [])],
    },
    projectSourcesCount: config.projectSources?.length ?? 0,
    updates: getUpdatesConfig(config),
  }
}

function registerIpc(): void {
<<<<<<< HEAD
  registerAllIpc({
    getConfig: () => config,
    setConfig: (next) => {
      config = next
    },
    getTasksCache: () => tasksCache,
    setTasksCache: (tasks) => {
      tasksCache = tasks
    },
    getStatsCache: () => statsCache,
    hasService,
    refreshNotion,
    refreshStats,
    toPublicConfig,
    applyLaunchAtStartup,
    applyPowerMode: power.applyPowerMode,
    applyAutoDownload,
    listCatalogWidgets: lifecycle.listCatalogWidgets,
    setWidgetEnabledState: lifecycle.setWidgetEnabledState,
    openCatalog: catalog.openCatalog,
    getCatalogWindow: catalog.getCatalogWindow,
    hideMonitor: () => {
      windows.monitor?.hide()
    },
    hideFocusInterruptWindow: focusInterrupt.hideFocusInterruptWindow,
    notionWidgetIds,
    sendTo,
  })
}

app.whenReady().then(async () => {
  migrateLegacyUserData()
  config = await loadConfig()
=======
  ipcMain.handle('get-tasks', async () => {
    if (!hasService('notion')) return []
    if (!tasksCache.length) await refreshNotion(true)
    return tasksCache
  })
  ipcMain.handle('refresh-tasks', async () => refreshNotion(true))
  ipcMain.handle('get-task-description', async (_e, pageId: string) => {
    if (!pageId || !hasService('notion')) return null
    const cached = tasksCache.find((t) => t.id === pageId)
    if (cached?.description) return cached.description
    try {
      const description = await fetchTaskDescription(config, pageId)
      if (cached) cached.description = description
      return description
    } catch (err) {
      console.error('Failed to fetch task description', err)
      return null
    }
  })
  ipcMain.handle(
    'get-property-options',
    async (_e, databaseId: string, propertyName: string) => {
      if (!hasService('notion') || !databaseId || !propertyName) return []
      return fetchPropertyOptions(config, databaseId, propertyName)
    },
  )
  ipcMain.handle(
    'update-task-field',
    async (_e, payload: UpdateTaskFieldPayload): Promise<UpdateTaskFieldResult> => {
      if (!hasService('notion') || !payload?.pageId) {
        return { ok: false, message: 'Service Notion indisponible.' }
      }
      const cached = tasksCache.find((t) => t.id === payload.pageId)
      if (!cached) return { ok: false, message: 'Tâche introuvable.' }

      const result = await updateTaskField(config, payload, cached)
      if (!result.ok || !result.task) return result

      const hideDone =
        (cached.sourceLabel
          ? config.projectSources?.find((s) => s.label === cached.sourceLabel)?.filters
              .hideCompleted
          : config.filters.hideCompleted) ?? config.filters.hideCompleted

      if (hideDone && result.task.done) {
        tasksCache = tasksCache.filter((t) => t.id !== result.task!.id)
      } else {
        tasksCache = tasksCache.map((t) => (t.id === result.task!.id ? result.task! : t))
      }
      sendTo(notionWidgetIds(), 'tasks-updated', tasksCache)
      return result
    },
  )
  ipcMain.handle(
    'create-task',
    async (_e, payload: CreateTaskPayload): Promise<CreateTaskResult> => {
      if (!hasService('notion')) {
        return { ok: false, message: 'Service Notion indisponible.' }
      }
      const result = await createTask(config, payload)
      if (!result.ok || !result.task) return result
      tasksCache = [...tasksCache.filter((t) => t.id !== result.task!.id), result.task]
      sendTo(notionWidgetIds(), 'tasks-updated', tasksCache)
      return result
    },
  )
  ipcMain.handle(
    'delete-task',
    async (_e, payload: DeleteTaskPayload): Promise<DeleteTaskResult> => {
      if (!hasService('notion') || !payload?.pageId) {
        return { ok: false, message: 'Service Notion indisponible.' }
      }
      const result = await deleteTask(config, payload)
      if (!result.ok) return result
      tasksCache = tasksCache.filter((t) => t.id !== payload.pageId)
      sendTo(notionWidgetIds(), 'tasks-updated', tasksCache)
      return result
    },
  )
  ipcMain.handle('get-stats', async () => {
    if (!statsCache) await refreshStats(true)
    return statsCache
  })
  ipcMain.handle('get-config', () => toPublicConfig())
  ipcMain.handle('get-notion-settings', () => toPublicConfig())
  ipcMain.handle(
    'update-public-settings',
    (
      _e,
      patch: {
        refreshIntervalSeconds?: number
        demoMode?: boolean
        launchAtStartup?: boolean
        updates?: { autoDownload?: boolean }
      },
    ) => {
      if (!patch || typeof patch !== 'object') {
        return {
          ok: false,
          config: toPublicConfig(),
        }
      }

      let reschedule = false
      let refreshTasks = false

      if (typeof patch.refreshIntervalSeconds === 'number') {
        const next = Math.max(60, Math.round(patch.refreshIntervalSeconds))
        if (next !== config.refreshIntervalSeconds) {
          config.refreshIntervalSeconds = next
          reschedule = true
        }
      }
      if (typeof patch.demoMode === 'boolean' && patch.demoMode !== config.demoMode) {
        config.demoMode = patch.demoMode
        refreshTasks = true
      }
      if (
        typeof patch.launchAtStartup === 'boolean' &&
        patch.launchAtStartup !== config.launchAtStartup
      ) {
        config.launchAtStartup = patch.launchAtStartup
        applyLaunchAtStartup()
      }
      if (typeof patch.updates?.autoDownload === 'boolean') {
        config = setUpdatesConfig(config, {
          autoDownload: patch.updates.autoDownload,
        })
        applyAutoDownload(patch.updates.autoDownload)
      }

      saveConfig(config)
      if (reschedule) applyPowerMode(true)
      if (refreshTasks && hasService('notion')) void refreshNotion(true)

      return {
        ok: true,
        config: toPublicConfig(),
      }
    },
  )
  ipcMain.handle(
    'save-notion-settings',
    (_e, patch: NotionSettingsPatch) => {
      if (!patch || typeof patch !== 'object') {
        return { ok: false, config: toPublicConfig(), message: 'Payload invalide.' }
      }

      if (typeof patch.notionToken === 'string' && patch.notionToken.trim()) {
        config.notionToken = patch.notionToken.trim()
      }
      if (typeof patch.databaseId === 'string') {
        config.databaseId = patch.databaseId.trim()
      }
      if (patch.properties && typeof patch.properties === 'object') {
        const next: TaskPropertyMapping = { ...config.properties }
        for (const key of [
          'title',
          'date',
          'tag',
          'status',
          'urgency',
          'doneCheckbox',
          'workflowStatus',
          'description',
        ] as const) {
          const value = patch.properties[key]
          if (typeof value === 'string') {
            if (key === 'urgency' || key === 'doneCheckbox' || key === 'workflowStatus' || key === 'description') {
              next[key] = value
            } else if (value.trim()) {
              next[key] = value
            }
          }
        }
        config.properties = next
      }
      if (patch.filters && typeof patch.filters === 'object') {
        const next: TaskSourceFilters = {
          hideCompleted: config.filters.hideCompleted,
          completedStatusValues: [...(config.filters.completedStatusValues ?? [])],
        }
        if (typeof patch.filters.hideCompleted === 'boolean') {
          next.hideCompleted = patch.filters.hideCompleted
        }
        if (Array.isArray(patch.filters.completedStatusValues)) {
          next.completedStatusValues = patch.filters.completedStatusValues
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim())
            .filter(Boolean)
        }
        config.filters = next
      }

      if (hasValidNotionCredentials(config)) {
        config.demoMode = false
      }

      saveConfig(config)
      applyPowerMode(true)
      if (hasService('notion')) void refreshNotion(true)

      return {
        ok: true,
        config: toPublicConfig(),
        message: hasValidNotionCredentials(config)
          ? 'Paramètres Notion enregistrés.'
          : 'Enregistré — ajoutez un token et une base pour quitter le mode démo.',
      }
    },
  )
  ipcMain.handle(
    'test-notion-connection',
    async (
      _e,
      payload: { notionToken?: string; databaseId?: string },
    ) => {
      const token =
        typeof payload?.notionToken === 'string' && payload.notionToken.trim()
          ? payload.notionToken.trim()
          : config.notionToken
      const databaseId =
        typeof payload?.databaseId === 'string' && payload.databaseId.trim()
          ? payload.databaseId.trim()
          : config.databaseId
      return testNotionConnection({ token: token ?? '', databaseId: databaseId ?? '' })
    },
  )
  ipcMain.handle('get-app-version', () => app.getVersion())
  ipcMain.handle('open-config-file', () => {
    void shell.openPath(getConfigPath())
  })
  ipcMain.handle('list-widgets', () => listCatalogWidgets())
  ipcMain.handle('set-widget-enabled', (_e, id: string, enabled: boolean) => {
    if (typeof id !== 'string' || typeof enabled !== 'boolean') {
      return { ok: false, widgets: listCatalogWidgets() }
    }
    const ok = setWidgetEnabledState(id, enabled)
    return { ok, widgets: listCatalogWidgets() }
  })
  ipcMain.handle('open-catalog', () => {
    openCatalog()
  })
  ipcMain.handle('close-catalog', () => {
    if (catalogWindow && !catalogWindow.isDestroyed()) {
      catalogWindow.close()
    }
  })
  ipcMain.handle('minimize-catalog', () => {
    if (catalogWindow && !catalogWindow.isDestroyed()) {
      catalogWindow.minimize()
    }
  })
  ipcMain.handle('toggle-maximize-catalog', () => {
    if (!catalogWindow || catalogWindow.isDestroyed()) return false
    if (catalogWindow.isMaximized()) catalogWindow.unmaximize()
    else catalogWindow.maximize()
    return catalogWindow.isMaximized()
  })
  ipcMain.handle('is-catalog-maximized', () => {
    if (!catalogWindow || catalogWindow.isDestroyed()) return false
    return catalogWindow.isMaximized()
  })
  ipcMain.handle('open-external', async (_e, url: string) => {
    if (url) await shell.openExternal(url)
  })
  ipcMain.handle('hide-monitor', () => {
    windows.monitor?.hide()
  })
  ipcMain.handle('enable-temp', async () => {
    if (!hasService('temp-daemon')) {
      return { ok: false, message: 'Activez le widget Monitoring pour utiliser la température.' }
    }
    return startTempDaemonElevated()
  })
  ipcMain.handle('disable-temp', () => stopTempDaemon())

  ipcMain.handle('get-activity-summary', (_e, date?: string) => getActivitySummary(date))
  ipcMain.handle('get-activity-settings', () => getActivitySettings())
  ipcMain.handle(
    'update-activity-settings',
    (_e, patch: Partial<ActivitySettings>) => {
      if (!hasService('activity-tracker')) {
        return getActivitySettings()
      }
      return updateActivitySettings(patch ?? {})
    },
  )
  ipcMain.handle('get-activity-rules', () => getActivityRules())
  ipcMain.handle('reload-activity-rules', () => reloadActivityRules())
  ipcMain.handle('open-activity-rules', async () => {
    await openActivityRulesFile()
  })
  ipcMain.handle(
    'export-activity',
    async (
      _e,
      opts: { format: ActivityExportFormat; from?: string; to?: string },
    ) => {
      if (!hasService('activity-tracker')) {
        return { ok: false, message: 'Activez le widget Activité pour exporter.' }
      }
      return exportActivity(opts ?? { format: 'json' })
    },
  )
  ipcMain.handle(
    'correct-activity-category',
    (_e, payload: ActivityCorrectionPayload) => {
      if (!hasService('activity-tracker')) {
        return { ok: false, message: 'Activez le widget Activité.' }
      }
      return correctActivityCategory(payload)
    },
  )
  ipcMain.handle('clear-activity-data', () => {
    if (!hasService('activity-tracker')) {
      return {
        ok: false,
        message: 'Activez le widget Activité.',
        summary: getActivitySummary(),
      }
    }
    return clearActivityData()
  })

  ipcMain.handle('start-focus-session', (_e, payload: StartFocusSessionPayload) => {
    if (!hasService('activity-tracker')) {
      return { ok: false, message: 'Activez le widget Activité.' }
    }
    const seed = getActivityFocusSeed()
    const result = startFocusSession({
      ...payload,
      seedAllowlist: {
        apps: [...seed.apps, ...(payload?.seedAllowlist?.apps ?? [])],
        domains: [...seed.domains, ...(payload?.seedAllowlist?.domains ?? [])],
        ideProjects: [
          ...seed.ideProjects,
          ...(payload?.seedAllowlist?.ideProjects ?? []),
        ],
      },
    })
    if (result.ok) refreshActivitySummary()
    return result
  })
  ipcMain.handle('stop-focus-session', () => {
    const session = stopFocusSession()
    hideFocusInterruptWindow()
    refreshActivitySummary()
    return session
  })
  ipcMain.handle('pause-focus-session', () => {
    const session = pauseFocusSession()
    hideFocusInterruptWindow()
    refreshActivitySummary()
    return session
  })
  ipcMain.handle('resume-focus-session', () => {
    const session = resumeFocusSession()
    refreshActivitySummary()
    return session
  })
  ipcMain.handle('get-focus-session', () => getFocusSession())
  ipcMain.handle('update-focus-allowlist', (_e, patch: Partial<FocusAllowlist>) => {
    const session = updateFocusAllowlist(patch ?? {})
    refreshActivitySummary()
    return session
  })
  ipcMain.handle(
    'resolve-focus-interrupt',
    (_e, payload: ResolveFocusInterruptPayload) => {
      const result = resolveFocusInterrupt(payload ?? { action: 'resume' })
      if (result.ok) {
        hideFocusInterruptWindow()
        refreshActivitySummary()
      }
      return result
    },
  )
  ipcMain.handle('get-focus-journal', (_e, date?: string) => getFocusJournal(date))
  ipcMain.handle('get-pending-focus-interrupt', () => getPendingFocusInterrupt())
  ipcMain.handle('hide-focus-interrupt', () => {
    hideFocusInterruptWindow()
  })

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
  ipcMain.handle('install-widget', (_e, id: string) => {
    if (!id || typeof id !== 'string') {
      return { ok: false, message: 'Id widget invalide.' }
    }
    return installOrUpdateWidget(id)
  })
  ipcMain.handle('list-remote-widgets', () => listRemoteCatalogWidgets())
}

app.whenReady().then(() => {
  migrateLegacyUserData()
  config = loadConfig()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  if (config.refreshIntervalSeconds < 60) {
    config.refreshIntervalSeconds = 90
  }

  applyLaunchAtStartup()
<<<<<<< HEAD
  focusInterrupt.wireFocusSessionBridge()
  await getAllWidgetDefinitions()
  registerIpc()
  setupTray()
  power.setupPowerManagement()
=======
  wireFocusSessionBridge()
  registerIpc()
  setupTray()
  setupPowerManagement()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644

  initAppUpdater({
    getAutoDownload: () => getUpdatesConfig(config).autoDownload,
    markChecked: () => {
<<<<<<< HEAD
      void setUpdatesConfig(config, {
        lastCheckedAt: new Date().toISOString(),
      }).then((next) => {
        config = next
      })
    },
    openSettings: () => catalog.openCatalog({ view: 'settings' }),
=======
      config = setUpdatesConfig(config, {
        lastCheckedAt: new Date().toISOString(),
      })
    },
    openSettings: () => openCatalog({ view: 'settings' }),
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  })

  initWidgetUpdater({
    getAutoDownload: () => getUpdatesConfig(config).autoDownload,
    getAppVersion: () => app.getVersion(),
<<<<<<< HEAD
    openSettings: () => catalog.openCatalog({ view: 'settings' }),
    onWidgetsInstalled: () => {
      void getAllWidgetDefinitions().then(() => {
        lifecycle.broadcastWidgetsChanged()
        lifecycle.recomputeServices()
      })
    },
  })

  await lifecycle.bootEnabledWidgets()
  lifecycle.syncActivityService()
=======
    openSettings: () => openCatalog({ view: 'settings' }),
    onWidgetsInstalled: () => {
      broadcastWidgetsChanged()
      recomputeServices()
    },
  })

  bootEnabledWidgets()
  syncActivityService()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644

  void getSystemStats({ includeTemp: false }).then(() => {
    void refreshStats(false)
  })
  if (hasService('notion')) {
    void refreshNotion(true)
  }

<<<<<<< HEAD
  power.setPowerMode(power.computePowerMode())
  power.scheduleTimers()

  setTimeout(() => {
    void checkForAppUpdates({ silent: true }).catch((err) => {
      console.debug('silent app update check failed', err)
    })
    void checkWidgetUpdates({ silent: true }).catch((err) => {
      console.debug('silent widget update check failed', err)
    })
=======
  powerMode = computePowerMode()
  scheduleTimers()

  setTimeout(() => {
    void checkForAppUpdates({ silent: true })
    void checkWidgetUpdates({ silent: true })
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  }, 8_000)
})

app.on('window-all-closed', () => {
  // Keep running in the system tray on Windows
})

app.on('before-quit', () => {
<<<<<<< HEAD
  power.clearTimers()
  power.clearPowerTimer()
  widgetWindows.clearBoundsTimers()
=======
  clearTimers()
  if (powerTimer) clearInterval(powerTimer)
  for (const t of Object.values(boundsTimers)) {
    if (t) clearTimeout(t)
  }
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  if (isActivityTrackerRunning()) stopActivityTracker()
})

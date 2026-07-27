import {
  app,
  BrowserWindow,
  Tray,
  nativeImage,
  ipcMain,
  shell,
  screen,
  powerMonitor,
} from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { migrateLegacyUserData } from './migrate'
import {
  getConfigPath,
  loadConfig,
  updateWindowBounds,
} from './config'
import { fetchNotionTasks, fetchTaskDescription } from './notion'
import { getSystemStats, startTempDaemonElevated, stopTempDaemon, isTempServiceRunning } from './system'
import { createTrayMenuController } from './trayMenu'
import type { AppConfig, NotionTask, SystemStats, WidgetKind } from '../shared/types'

// Lower Chromium cost for mostly-static widgets
app.setName('lattice-desk')
app.disableHardwareAcceleration()

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
let tasksCache: NotionTask[] = []
let statsCache: SystemStats | null = null
let notionTimer: NodeJS.Timeout | null = null
let statsTimer: NodeJS.Timeout | null = null
let powerTimer: NodeJS.Timeout | null = null
let powerMode: PowerMode = 'active'
let monitorVisible = false
let notionInFlight = false
let statsInFlight = false
let lastNotionAt = 0
let sleeping = false

const windows: Partial<Record<WidgetKind, BrowserWindow>> = {}
const boundsTimers: Partial<Record<WidgetKind, NodeJS.Timeout>> = {}

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

function desktopWidgetsVisible(): boolean {
  return Boolean(
    (windows.calendar && !windows.calendar.isDestroyed() && windows.calendar.isVisible()) ||
      (windows.tasks && !windows.tasks.isDestroyed() && windows.tasks.isVisible()),
  )
}

function computePowerMode(): PowerMode {
  if (sleeping) return 'sleep'
  try {
    if (powerMonitor.getSystemIdleTime() >= SYSTEM_IDLE_SLEEP_SEC) return 'sleep'
  } catch {
    /* ignore */
  }
  if (monitorVisible) return 'active'
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

function createWidgetWindow(
  kind: WidgetKind,
  opts: { width: number; height: number; show?: boolean },
): BrowserWindow {
  const saved = config.windows?.[kind]
  const display = screen.getPrimaryDisplay().workArea

  const width = kind === 'monitor' ? opts.width : (saved?.width ?? opts.width)
  const height = kind === 'monitor' ? opts.height : (saved?.height ?? opts.height)
  let x = kind === 'monitor' ? undefined : saved?.x
  let y = kind === 'monitor' ? undefined : saved?.y

  if (x == null || y == null) {
    if (kind === 'calendar') {
      x = display.x + 40
      y = display.y + 80
    } else if (kind === 'tasks') {
      x = display.x + 40
      y = display.y + display.height - height - 40
    } else {
      const cursor = screen.getCursorScreenPoint()
      x = Math.min(cursor.x - width / 2, display.x + display.width - width - 8)
      y = Math.min(cursor.y - height - 12, display.y + display.height - height - 8)
      x = Math.max(display.x + 8, x)
      y = Math.max(display.y + 8, y)
    }
  }

  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    show: false,
    frame: false,
    transparent: false,
    resizable: kind !== 'monitor',
    skipTaskbar: true,
    alwaysOnTop: kind === 'monitor',
    hasShadow: true,
    backgroundColor: '#191919',
    paintWhenInitiallyHidden: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: true,
      spellcheck: false,
      v8CacheOptions: 'code',
    },
  })

  if (kind === 'monitor') {
    win.setAlwaysOnTop(true, 'pop-up-menu')
    win.setVisibleOnAllWorkspaces(true)
  }

  if (isDev && DEV_URL) {
    void win.loadURL(`${DEV_URL}?widget=${kind}`)
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { widget: kind },
    })
  }

  win.webContents.once('did-finish-load', () => {
    if (opts.show !== false && kind !== 'monitor') {
      win.showInactive()
    }
  })

  win.on('moved', () => schedulePersistBounds(kind, win))
  win.on('resized', () => schedulePersistBounds(kind, win))
  win.on('show', () => {
    if (kind === 'monitor') {
      monitorVisible = true
      applyPowerMode(true)
      void refreshStats(true)
    } else {
      applyPowerMode()
    }
  })
  win.on('hide', () => {
    if (kind === 'monitor') {
      monitorVisible = false
      applyPowerMode()
    } else {
      applyPowerMode()
    }
  })

  if (kind === 'monitor') {
    win.on('blur', () => {
      if (!win.isDestroyed()) win.hide()
    })
  }

  windows[kind] = win
  return win
}

function schedulePersistBounds(kind: WidgetKind, win: BrowserWindow): void {
  if (boundsTimers[kind]) clearTimeout(boundsTimers[kind])
  boundsTimers[kind] = setTimeout(() => {
    if (win.isDestroyed()) return
    config = updateWindowBounds(config, kind, win.getBounds())
  }, BOUNDS_SAVE_DEBOUNCE_MS)
}

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
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2NkYGD4z0ABYBzVMKoBBgZGRgY' +
      'Ghv8MYACkGQYGBgYGRgYGRgYGBgYAwv4CAf1yQ9kAAAAASUVORK5CYII=',
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
    win = createWidgetWindow('monitor', { width: 360, height: 300, show: false })
  }
  return win
}

function toggleMonitor(): void {
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

function isWidgetVisible(kind: WidgetKind): boolean {
  const win = windows[kind]
  return Boolean(win && !win.isDestroyed() && win.isVisible())
}

function showWidget(kind: 'calendar' | 'tasks'): void {
  const win = windows[kind]
  if (!win || win.isDestroyed()) return
  win.show()
  applyPowerMode()
}

function hideWidget(kind: 'calendar' | 'tasks'): void {
  windows[kind]?.hide()
}

function hideDesktopWidgets(): void {
  windows.calendar?.hide()
  windows.tasks?.hide()
  applyPowerMode()
}

function showDesktopWidgets(): void {
  showWidget('calendar')
  showWidget('tasks')
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
    isWidgetVisible: (kind) => isWidgetVisible(kind),
    showWidget,
    hideWidget,
    showDesktopWidgets,
    hideDesktopWidgets,
    toggleMonitor,
    applyPowerMode: () => applyPowerMode(),
    applyLaunchAtStartup,
    refreshNotion,
    refreshStats,
    sendStatsToMonitor: (stats) => sendTo(['monitor'], 'stats-updated', stats),
    updateTrayTooltip,
  })

  tray.on('click', () => toggleMonitor())
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

function sendTo(kinds: WidgetKind[], channel: string, payload: unknown): void {
  for (const kind of kinds) {
    const win = windows[kind]
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

async function refreshNotion(force = false): Promise<NotionTask[]> {
  if (notionInFlight) return tasksCache
  if (!force && powerMode === 'sleep' && tasksCache.length > 0) {
    return tasksCache
  }

  const minGap = force ? 0 : notionIntervalMs() * 0.8
  if (!force && Date.now() - lastNotionAt < minGap) {
    return tasksCache
  }

  notionInFlight = true
  try {
    tasksCache = await fetchNotionTasks(config)
    lastNotionAt = Date.now()
    sendTo(['calendar', 'tasks'], 'tasks-updated', tasksCache)
  } catch (err) {
    console.error('Notion sync failed', err)
    sendTo(['calendar', 'tasks'], 'tasks-error', String(err))
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
    if (monitorVisible) {
      sendTo(['monitor'], 'stats-updated', statsCache)
    }
  } finally {
    statsInFlight = false
  }
  return statsCache
}

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

  const notionMs = notionIntervalMs()
  notionTimer = setInterval(() => {
    if (powerMode === 'sleep') return
    void refreshNotion()
  }, notionMs)

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
    applyPowerMode(true)
  }
  const leaveSleep = () => {
    sleeping = false
    applyPowerMode(true)
    void refreshNotion(true)
    void refreshStats(monitorVisible)
  }

  powerMonitor.on('suspend', enterSleep)
  powerMonitor.on('resume', leaveSleep)
  powerMonitor.on('lock-screen', enterSleep)
  powerMonitor.on('unlock-screen', leaveSleep)

  // Re-evaluate idle every 30s without heavy work
  powerTimer = setInterval(() => {
    applyPowerMode()
  }, 30_000)
}

function registerIpc(): void {
  ipcMain.handle('get-tasks', async () => {
    if (!tasksCache.length) await refreshNotion(true)
    return tasksCache
  })
  ipcMain.handle('refresh-tasks', async () => refreshNotion(true))
  ipcMain.handle('get-task-description', async (_e, pageId: string) => {
    if (!pageId) return null
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
  ipcMain.handle('get-stats', async () => {
    if (!statsCache) await refreshStats(true)
    return statsCache
  })
  ipcMain.handle('get-config', () => ({
    refreshIntervalSeconds: config.refreshIntervalSeconds,
    demoMode: config.demoMode,
    configPath: getConfigPath(),
    launchAtStartup: config.launchAtStartup,
  }))
  ipcMain.handle('open-external', async (_e, url: string) => {
    if (url) await shell.openExternal(url)
  })
  ipcMain.handle('hide-monitor', () => {
    windows.monitor?.hide()
  })
  ipcMain.handle('enable-temp', async () => startTempDaemonElevated())
  ipcMain.handle('disable-temp', () => stopTempDaemon())
}

app.whenReady().then(() => {
  migrateLegacyUserData()
  config = loadConfig()
  // Default to a gentler Notion cadence if still aggressive
  if (config.refreshIntervalSeconds < 60) {
    config.refreshIntervalSeconds = 90
  }

  applyLaunchAtStartup()
  registerIpc()
  setupTray()
  setupPowerManagement()

  // Desktop widgets only — monitor is lazy-created on tray click
  createWidgetWindow('calendar', { width: 920, height: 420 })
  createWidgetWindow('tasks', { width: 360, height: 480 })

  // Warm CPU sampler once, then light tray sample
  void getSystemStats({ includeTemp: false }).then(() => {
    void refreshStats(false)
  })
  void refreshNotion(true)

  powerMode = 'idle'
  scheduleTimers()
})

app.on('window-all-closed', () => {
  // Keep running in the system tray on Windows
})

app.on('before-quit', () => {
  clearTimers()
  if (powerTimer) clearInterval(powerTimer)
  for (const t of Object.values(boundsTimers)) {
    if (t) clearTimeout(t)
  }
})

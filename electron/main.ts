import {
  app,
  BrowserWindow,
  Tray,
  nativeImage,
} from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { migrateLegacyUserData } from './migrate'
import {
  getConfigPath,
  loadConfig,
  isWidgetEnabledInConfig,
  hasValidNotionCredentials,
  getUpdatesConfig,
  setUpdatesConfig,
} from './config'
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
} from '../shared/types'
import type { WidgetServiceId } from '../shared/widget'

// Lower Chromium cost for mostly-static widgets
app.setName('lattice-desk')
app.setAppUserModelId('com.vakz.lattice-desk')
app.disableHardwareAcceleration()

let config: AppConfig
let tray: Tray | null = null
let tasksCache: NotionTask[] = []
let statsCache: SystemStats | null = null
let monitorVisible = false
let notionInFlight = false
let statsInFlight = false
let lastNotionAt = 0
let sleeping = false

const windows: Partial<Record<string, BrowserWindow>> = {}

function isEnabled(id: string): boolean {
  return isWidgetEnabledInConfig(config, id)
}

function enabledDefsForService(service: WidgetServiceId) {
  return getAllWidgetDefinitionsCached().filter(
    (d) => isEnabled(d.id) && d.services.includes(service),
  )
}

function hasService(service: WidgetServiceId): boolean {
  return enabledDefsForService(service).length > 0
}

function notionWidgetIds(): string[] {
  return enabledDefsForService('notion').map((d) => d.id)
}

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
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2NkYGD4z0ABYBzVMKoB' +
      'BgZGRgYGBgYGRgYGBgYAwv4CAf1yQ9kAAAAASUVORK5CYII=',
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
    applyLaunchAtStartup,
    refreshNotion,
    refreshStats,
    sendStatsToMonitor: (stats) => sendTo(['monitor'], 'stats-updated', stats),
    updateTrayTooltip,
  })

  tray.on('click', () => {
    if (isEnabled('monitor')) widgetWindows.toggleMonitor()
    else catalog.openCatalog()
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

async function refreshNotion(force = false): Promise<NotionTask[]> {
  if (!hasService('notion')) return tasksCache
  if (notionInFlight) return tasksCache
  if (!force && power.getPowerMode() === 'sleep' && tasksCache.length > 0) {
    return tasksCache
  }

  const minGap = force ? 0 : power.notionIntervalMs() * 0.8
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
  if (config.refreshIntervalSeconds < 60) {
    config.refreshIntervalSeconds = 90
  }

  applyLaunchAtStartup()
  focusInterrupt.wireFocusSessionBridge()
  await getAllWidgetDefinitions()
  registerIpc()
  setupTray()
  power.setupPowerManagement()

  initAppUpdater({
    getAutoDownload: () => getUpdatesConfig(config).autoDownload,
    markChecked: () => {
      void setUpdatesConfig(config, {
        lastCheckedAt: new Date().toISOString(),
      }).then((next) => {
        config = next
      })
    },
    openSettings: () => catalog.openCatalog({ view: 'settings' }),
  })

  initWidgetUpdater({
    getAutoDownload: () => getUpdatesConfig(config).autoDownload,
    getAppVersion: () => app.getVersion(),
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

  void getSystemStats({ includeTemp: false }).then(() => {
    void refreshStats(false)
  })
  if (hasService('notion')) {
    void refreshNotion(true)
  }

  power.setPowerMode(power.computePowerMode())
  power.scheduleTimers()

  setTimeout(() => {
    void checkForAppUpdates({ silent: true }).catch((err) => {
      console.debug('silent app update check failed', err)
    })
    void checkWidgetUpdates({ silent: true }).catch((err) => {
      console.debug('silent widget update check failed', err)
    })
  }, 8_000)
})

app.on('window-all-closed', () => {
  // Keep running in the system tray on Windows
})

app.on('before-quit', () => {
  power.clearTimers()
  power.clearPowerTimer()
  widgetWindows.clearBoundsTimers()
  if (isActivityTrackerRunning()) stopActivityTracker()
})

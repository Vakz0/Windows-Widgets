import {
  app,
  BrowserWindow,
  Tray,
} from 'electron'
import path from 'node:path'
import { migrateLegacyUserData } from './migrate'
import {
  loadConfig,
  getUpdatesConfig,
  setUpdatesConfig,
} from './config'
import { getSystemStats } from './system'
import { isActivityTrackerRunning, stopActivityTracker } from './activity'
import { createTrayMenuController } from './trayMenu'
import {
  getAllWidgetDefinitions,
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
import { createFocusInterruptController } from './focus/interruptWindow'
import { createPowerModeController } from './powerMode'
import { createWidgetLifecycle } from './widgets/lifecycle'
import { createCatalogWindowController } from './windows/catalogWindow'
import { createWidgetWindowController } from './windows/createWidgetWindow'
import { toPublicConfig } from './bootstrap/publicConfig'
import { createRefreshControllers } from './bootstrap/refresh'
import { createTrayIcon, updateTrayTooltip } from './bootstrap/tray'
import type { AppConfig, NotionTask, SystemStats } from '../shared/types'

// Lower Chromium cost for mostly-static widgets
app.setName('lattice-desk')
app.setAppUserModelId('com.vakz.lattice-desk')
app.disableHardwareAcceleration()

let config: AppConfig
let tray: Tray | null = null
let tasksCache: NotionTask[] = []
let statsCache: SystemStats | null = null
let sleeping = false

const windows: Partial<Record<string, BrowserWindow>> = {}

type PowerController = ReturnType<typeof createPowerModeController>
const powerRef: { current: PowerController | null } = { current: null }

const refresh = createRefreshControllers({
  getConfig: () => config,
  windows,
  getTasksCache: () => tasksCache,
  setTasksCache: (tasks) => {
    tasksCache = tasks
  },
  getStatsCache: () => statsCache,
  setStatsCache: (stats) => {
    statsCache = stats
  },
  getPowerMode: () => powerRef.current?.getPowerMode() ?? 'active',
  notionIntervalMs: () => powerRef.current?.notionIntervalMs() ?? 90_000,
  onStatsUpdated: () => updateTrayTooltip(tray, statsCache),
})

const {
  isEnabled,
  hasService,
  notionWidgetIds,
  activityWidgetIds,
  sendTo,
  refreshNotion,
  refreshStats,
} = refresh

const power = createPowerModeController({
  getConfig: () => config,
  windows,
  getSleeping: () => sleeping,
  setSleeping: (v) => {
    sleeping = v
  },
  hasService,
  refreshNotion,
  refreshStats,
})
powerRef.current = power

const widgetWindows = createWidgetWindowController({
  getConfig: () => config,
  setConfig: (next) => {
    config = next
  },
  windows,
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
  getTasksCache: () => tasksCache,
  setTasksCache: (tasks) => {
    tasksCache = tasks
  },
  refreshNotion,
  applyPowerMode: (force) => power.applyPowerMode(force),
  sendTo,
  activityWidgetIds,
})

let trayMenu: ReturnType<typeof createTrayMenuController> | null = null

function setupTray(): void {
  tray = new Tray(createTrayIcon())
  updateTrayTooltip(tray, statsCache)

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
    hasNotionWidgets: () => hasService('notion'),
    hasTempDaemon: () => hasService('temp-daemon'),
    showWidget: widgetWindows.showWidget,
    hideWidget: widgetWindows.hideWidget,
    openCatalog: catalog.openCatalog,
    openSettings: () => catalog.openCatalog({ view: 'settings' }),
    applyPowerMode: () => power.applyPowerMode(),
    applyLaunchAtStartup,
    refreshNotion,
    refreshStats,
    updateTrayTooltip: () => updateTrayTooltip(tray, statsCache),
  })

  tray.on('click', () => {
    catalog.openCatalog()
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
    toPublicConfig: () => toPublicConfig(config),
    applyLaunchAtStartup,
    applyPowerMode: power.applyPowerMode,
    applyAutoDownload,
    listCatalogWidgets: lifecycle.listCatalogWidgets,
    setWidgetEnabledState: lifecycle.setWidgetEnabledState,
    openCatalog: catalog.openCatalog,
    getCatalogWindow: catalog.getCatalogWindow,
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

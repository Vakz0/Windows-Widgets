import { powerMonitor } from 'electron'
import type { BrowserWindow } from 'electron'
import type { AppConfig, NotionTask, SystemStats } from '../shared/types'
import type { WidgetServiceId } from '../shared/widget'
import {
  handleActivityResume,
  handleActivitySuspend,
} from './activity'
import {
  getAllWidgetDefinitionsCached,
  getDesktopWidgetDefinitionsCached,
} from './widgets/registry'

/** Idle / sleep intervals (ms) */
const STATS_ACTIVE_MS = 2_000
const STATS_IDLE_MS = 30_000
const STATS_SLEEP_MS = 0 // stopped
const NOTION_IDLE_MULT = 3
const NOTION_SLEEP_MULT = 10
const SYSTEM_IDLE_SLEEP_SEC = 180

export type PowerMode = 'active' | 'idle' | 'sleep'

export interface PowerModeDeps {
  getConfig: () => AppConfig
  windows: Partial<Record<string, BrowserWindow>>
  getSleeping: () => boolean
  setSleeping: (sleeping: boolean) => void
  hasService: (service: WidgetServiceId) => boolean
  refreshNotion: (force?: boolean) => Promise<NotionTask[]>
  refreshStats: (forceTemp?: boolean) => Promise<SystemStats>
}

export function createPowerModeController(deps: PowerModeDeps) {
  let powerMode: PowerMode = 'active'
  let notionTimer: NodeJS.Timeout | null = null
  let statsTimer: NodeJS.Timeout | null = null
  let powerTimer: NodeJS.Timeout | null = null

  function desktopWidgetsVisible(): boolean {
    return getDesktopWidgetDefinitionsCached().some((d) => {
      const win = deps.windows[d.id]
      return Boolean(win && !win.isDestroyed() && win.isVisible())
    })
  }

  function popupWidgetVisible(): boolean {
    return getAllWidgetDefinitionsCached().some((d) => {
      if (d.placement !== 'popup') return false
      const win = deps.windows[d.id]
      return Boolean(win && !win.isDestroyed() && win.isVisible())
    })
  }

  function computePowerMode(): PowerMode {
    if (deps.getSleeping()) return 'sleep'
    try {
      if (powerMonitor.getSystemIdleTime() >= SYSTEM_IDLE_SLEEP_SEC) return 'sleep'
    } catch (err) {
      console.debug('computePowerMode: idle time ignored', err)
    }
    if (popupWidgetVisible()) return 'active'
    if (desktopWidgetsVisible()) return 'idle'
    return 'sleep'
  }

  function notionIntervalMs(): number {
    const base = Math.max(60, deps.getConfig().refreshIntervalSeconds) * 1000
    if (powerMode === 'sleep') return base * NOTION_SLEEP_MULT
    if (powerMode === 'idle') return base * NOTION_IDLE_MULT
    return base
  }

  function statsIntervalMs(): number {
    if (powerMode === 'sleep') return STATS_SLEEP_MS
    if (powerMode === 'active') return STATS_ACTIVE_MS
    return STATS_IDLE_MS
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

    if (deps.hasService('notion')) {
      const notionMs = notionIntervalMs()
      notionTimer = setInterval(() => {
        if (powerMode === 'sleep') return
        void deps.refreshNotion()
      }, notionMs)
    }

    // Light tray sampling always (tooltip)
    const statsMs = statsIntervalMs()
    if (statsMs > 0) {
      statsTimer = setInterval(() => {
        void deps.refreshStats(false)
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
      deps.setSleeping(true)
      handleActivitySuspend()
      applyPowerMode(true)
    }
    const leaveSleep = () => {
      deps.setSleeping(false)
      applyPowerMode(true)
      handleActivityResume()
      if (deps.hasService('notion')) void deps.refreshNotion(true)
      void deps.refreshStats(false)
    }

    powerMonitor.on('suspend', enterSleep)
    powerMonitor.on('resume', leaveSleep)
    powerMonitor.on('lock-screen', enterSleep)
    powerMonitor.on('unlock-screen', leaveSleep)

    powerTimer = setInterval(() => {
      applyPowerMode()
    }, 30_000)
  }

  function getPowerMode(): PowerMode {
    return powerMode
  }

  function setPowerMode(mode: PowerMode): void {
    powerMode = mode
  }

  function clearPowerTimer(): void {
    if (powerTimer) {
      clearInterval(powerTimer)
      powerTimer = null
    }
  }

  return {
    computePowerMode,
    applyPowerMode,
    scheduleTimers,
    clearTimers,
    setupPowerManagement,
    notionIntervalMs,
    getPowerMode,
    setPowerMode,
    clearPowerTimer,
  }
}

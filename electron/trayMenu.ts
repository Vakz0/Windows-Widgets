import { Menu, Tray, shell, dialog, app } from 'electron'
import type { AppConfig, SystemStats } from '../shared/types'
import { getConfigPath, saveConfig } from './config'
import {
  startTempDaemonElevated,
  stopTempDaemon,
  isTempServiceRunning,
} from './system'

export interface TrayMenuDeps {
  getConfig: () => AppConfig
  setLaunchAtStartup: (enabled: boolean) => void
  getStats: () => SystemStats | null
  setStats: (stats: SystemStats | null) => void
  isWidgetVisible: (kind: 'calendar' | 'tasks') => boolean
  showWidget: (kind: 'calendar' | 'tasks') => void
  hideWidget: (kind: 'calendar' | 'tasks') => void
  showDesktopWidgets: () => void
  hideDesktopWidgets: () => void
  toggleMonitor: () => void
  applyPowerMode: () => void
  applyLaunchAtStartup: () => void
  refreshNotion: (force?: boolean) => Promise<unknown>
  refreshStats: (forceTemp?: boolean) => Promise<unknown>
  sendStatsToMonitor: (stats: SystemStats) => void
  updateTrayTooltip: () => void
}

export function createTrayMenuController(
  getTray: () => Tray | null,
  deps: TrayMenuDeps,
) {
  /** Position fixe du menu pour éviter qu’il « saute » à la réouverture */
  let lastPos: { x: number; y: number } | undefined

  function trayStatusLabel(): string {
    const stats = deps.getStats()
    if (!stats) return 'En attente des mesures…'
    const temp = stats.temperatureC != null ? `${stats.temperatureC}°C` : 'temp. —'
    return `CPU ${stats.cpuPercent}%   ·   RAM ${stats.ramPercent}%   ·   ${temp}`
  }

  function tempServiceStatusLabel(): string {
    if (isTempServiceRunning()) {
      const t = deps.getStats()?.temperatureC
      return t != null ? `État : actif (${t}°C)` : 'État : actif'
    }
    return 'État : arrêté'
  }

  function popup(): void {
    const tray = getTray()
    if (!tray) return
    deps.updateTrayTooltip()
    const menu = build()
    if (lastPos) tray.popUpContextMenu(menu, lastPos)
    else tray.popUpContextMenu(menu)
  }

  /** Après une case à cocher, Windows ferme le menu : on le rouvre au même endroit */
  function keepOpen(): void {
    setTimeout(() => popup(), 20)
  }

  function build() {
    const config = deps.getConfig()
    const calendarVisible = deps.isWidgetVisible('calendar')
    const tasksVisible = deps.isWidgetVisible('tasks')
    const tempRunning = isTempServiceRunning()

    return Menu.buildFromTemplate([
      { label: 'Windows Widgets', enabled: false },
      { label: trayStatusLabel(), enabled: false },
      { type: 'separator' },
      {
        label: 'Ouvrir le monitoring',
        click: () => deps.toggleMonitor(),
      },
      { type: 'separator' },
      {
        label: 'Widgets bureau',
        submenu: [
          {
            label: 'Calendrier',
            type: 'checkbox',
            checked: calendarVisible,
            click: (item) => {
              if (item.checked) deps.showWidget('calendar')
              else {
                deps.hideWidget('calendar')
                deps.applyPowerMode()
              }
              keepOpen()
            },
          },
          {
            label: 'Tâches',
            type: 'checkbox',
            checked: tasksVisible,
            click: (item) => {
              if (item.checked) deps.showWidget('tasks')
              else {
                deps.hideWidget('tasks')
                deps.applyPowerMode()
              }
              keepOpen()
            },
          },
          { type: 'separator' },
          {
            label: 'Tout afficher',
            click: () => {
              deps.showDesktopWidgets()
              keepOpen()
            },
          },
          {
            label: 'Tout masquer',
            click: () => {
              deps.hideDesktopWidgets()
              keepOpen()
            },
          },
        ],
      },
      {
        label: 'Notion',
        submenu: [
          {
            label: 'Rafraîchir les tâches',
            click: () => {
              void deps.refreshNotion(true)
            },
          },
          {
            label: 'Ouvrir le fichier config',
            click: () => {
              void shell.openPath(getConfigPath())
            },
          },
          { type: 'separator' },
          {
            label: config.demoMode ? 'État : mode démo' : 'État : connecté à Notion',
            enabled: false,
          },
        ],
      },
      {
        label: 'Température',
        submenu: [
          { label: tempServiceStatusLabel(), enabled: false },
          { type: 'separator' },
          {
            label: 'Activer le capteur (admin)',
            enabled: !tempRunning,
            click: () => {
              void (async () => {
                const result = await startTempDaemonElevated()
                await dialog.showMessageBox({
                  type: result.ok ? 'info' : 'error',
                  title: 'Température',
                  message: result.message,
                })
                if (result.ok) void deps.refreshStats(true)
                keepOpen()
              })()
            },
          },
          {
            label: 'Arrêter le service',
            enabled: tempRunning,
            click: () => {
              const result = stopTempDaemon()
              const stats = deps.getStats()
              if (stats) {
                const next = { ...stats, temperatureC: null, tempSource: null }
                deps.setStats(next)
                deps.sendStatsToMonitor(next)
              }
              deps.updateTrayTooltip()
              void dialog.showMessageBox({
                type: 'warning',
                title: 'Température — arrêté',
                message: result.message,
                detail: 'Le menu indique maintenant « État : arrêté ».',
              })
              keepOpen()
            },
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Lancer au démarrage de Windows',
        type: 'checkbox',
        checked: config.launchAtStartup,
        click: (item) => {
          deps.setLaunchAtStartup(item.checked)
          saveConfig(deps.getConfig())
          deps.applyLaunchAtStartup()
          keepOpen()
        },
      },
      { type: 'separator' },
      {
        label: 'Quitter Windows Widgets',
        click: () => app.quit(),
      },
    ])
  }

  return {
    popupAt(bounds: { x: number; y: number }) {
      lastPos = {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
      }
      popup()
    },
  }
}

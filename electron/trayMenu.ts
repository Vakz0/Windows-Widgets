import { Menu, Tray, shell, dialog, app } from 'electron'
import type { AppConfig, SystemStats } from '../shared/types'
import { getConfigPath, saveConfig } from './config'
import {
  startTempDaemonElevated,
  stopTempDaemon,
  isTempServiceRunning,
} from './system'

export interface TrayDesktopWidget {
  id: string
  label: string
}

export interface TrayMenuDeps {
  getConfig: () => AppConfig
  setLaunchAtStartup: (enabled: boolean) => void
  getStats: () => SystemStats | null
  setStats: (stats: SystemStats | null) => void
  getEnabledDesktopWidgets: () => TrayDesktopWidget[]
  isWidgetVisible: (id: string) => boolean
  isMonitorEnabled: () => boolean
  hasNotionWidgets: () => boolean
  hasTempDaemon: () => boolean
  showWidget: (id: string) => void
  hideWidget: (id: string) => void
  toggleMonitor: () => void
  openCatalog: () => void
  openSettings: () => void
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
    const desktop = deps.getEnabledDesktopWidgets()
    const monitorEnabled = deps.isMonitorEnabled()
    const notionEnabled = deps.hasNotionWidgets()
    const tempDaemon = deps.hasTempDaemon()
    const tempRunning = isTempServiceRunning()

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Catalogue des widgets…',
        click: () => deps.openCatalog(),
      },
      {
        label: 'Paramètres…',
        click: () => deps.openSettings(),
      },
    ]

    if (desktop.length > 0 || monitorEnabled) {
      template.push({ type: 'separator' })
    }

    for (const w of desktop) {
      template.push({
        label: w.label,
        type: 'checkbox',
        checked: deps.isWidgetVisible(w.id),
        click: (item) => {
          if (item.checked) deps.showWidget(w.id)
          else {
            deps.hideWidget(w.id)
            deps.applyPowerMode()
          }
          keepOpen()
        },
      })
    }

    if (monitorEnabled) {
      template.push({
        label: 'Monitoring',
        click: () => deps.toggleMonitor(),
      })
    }

    template.push({ type: 'separator' })

    if (notionEnabled) {
      template.push({
        label: 'Rafraîchir Notion',
        click: () => {
          void deps.refreshNotion(true)
        },
      })
    }

    if (tempDaemon) {
      template.push({
        label: tempRunning ? 'Arrêter la température' : 'Activer la température',
        click: () => {
          void (async () => {
            if (tempRunning) {
              const result = stopTempDaemon()
              const stats = deps.getStats()
              if (stats) {
                const next = { ...stats, temperatureC: null, tempSource: null }
                deps.setStats(next)
                deps.sendStatsToMonitor(next)
              }
              deps.updateTrayTooltip()
              await dialog.showMessageBox({
                type: 'warning',
                title: 'Température',
                message: result.message,
              })
            } else {
              const result = await startTempDaemonElevated()
              await dialog.showMessageBox({
                type: result.ok ? 'info' : 'error',
                title: 'Température',
                message: result.message,
              })
              if (result.ok) void deps.refreshStats(true)
            }
            keepOpen()
          })()
        },
      })
    }

    template.push({
      label: 'Ouvrir la config',
      click: () => {
        void shell.openPath(getConfigPath())
      },
    })

    template.push(
      { type: 'separator' },
      {
        label: 'Lancer au démarrage',
        type: 'checkbox',
        checked: config.launchAtStartup,
        click: (item) => {
          deps.setLaunchAtStartup(item.checked)
          saveConfig(deps.getConfig())
          deps.applyLaunchAtStartup()
          keepOpen()
        },
      },
      {
        label: 'Quitter',
        click: () => app.quit(),
      },
    )

    return Menu.buildFromTemplate(template)
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

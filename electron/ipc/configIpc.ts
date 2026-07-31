import { app, ipcMain, shell } from 'electron'
import { getConfigPath, saveConfig, setUpdatesConfig } from '../config'
import type { IpcDeps } from './types'

export function registerConfigIpc(deps: IpcDeps): void {
  ipcMain.handle('get-config', () => deps.toPublicConfig())
  ipcMain.handle('get-notion-settings', () => deps.toPublicConfig())
  ipcMain.handle(
    'update-public-settings',
    async (
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
          config: deps.toPublicConfig(),
        }
      }

      let config = deps.getConfig()
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
        deps.applyLaunchAtStartup()
      }
      if (typeof patch.updates?.autoDownload === 'boolean') {
        config = await setUpdatesConfig(config, {
          autoDownload: patch.updates.autoDownload,
        })
        deps.setConfig(config)
        deps.applyAutoDownload(patch.updates.autoDownload)
      }

      deps.setConfig(config)
      await saveConfig(config)
      if (reschedule) deps.applyPowerMode(true)
      if (refreshTasks && deps.hasService('notion')) void deps.refreshNotion(true)

      return {
        ok: true,
        config: deps.toPublicConfig(),
      }
    },
  )
  ipcMain.handle('get-app-version', () => app.getVersion())
  ipcMain.handle('open-config-file', () => {
    void shell.openPath(getConfigPath())
  })
}

import { ipcMain } from 'electron'
import { startTempDaemonElevated, stopTempDaemon } from '../system'
import type { IpcDeps } from './types'

export function registerStatsIpc(deps: IpcDeps): void {
  ipcMain.handle('get-stats', async () => {
    if (!deps.getStatsCache()) await deps.refreshStats(true)
    return deps.getStatsCache()
  })
  ipcMain.handle('enable-temp', async () => {
    if (!deps.hasService('temp-daemon')) {
      return { ok: false, message: 'Aucun widget n’expose le service température (temp-daemon).' }
    }
    return startTempDaemonElevated()
  })
  ipcMain.handle('disable-temp', () => stopTempDaemon())
}

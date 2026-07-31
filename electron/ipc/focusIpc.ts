import { ipcMain } from 'electron'
import { getActivityFocusSeed, refreshActivitySummary } from '../activity'
import {
  ensureFocusSessionLoaded,
  getFocusJournal,
  getFocusSession,
  getPendingFocusInterrupt,
  pauseFocusSession,
  resolveFocusInterrupt,
  resumeFocusSession,
  startFocusSession,
  stopFocusSession,
  updateFocusAllowlist,
} from '../focusSession'
import type {
  FocusAllowlist,
  ResolveFocusInterruptPayload,
  StartFocusSessionPayload,
} from '../../shared/types'
import type { IpcDeps } from './types'

export function registerFocusIpc(deps: IpcDeps): void {
  ipcMain.handle('start-focus-session', async (_e, payload: StartFocusSessionPayload) => {
    if (!deps.hasService('activity-tracker')) {
      return { ok: false, message: 'Activez le widget Activité.' }
    }
    const seed = getActivityFocusSeed()
    const result = await startFocusSession({
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
  ipcMain.handle('stop-focus-session', async () => {
    const session = await stopFocusSession()
    deps.hideFocusInterruptWindow()
    refreshActivitySummary()
    return session
  })
  ipcMain.handle('pause-focus-session', async () => {
    const session = await pauseFocusSession()
    deps.hideFocusInterruptWindow()
    refreshActivitySummary()
    return session
  })
  ipcMain.handle('resume-focus-session', async () => {
    const session = await resumeFocusSession()
    refreshActivitySummary()
    return session
  })
  ipcMain.handle('get-focus-session', async () => {
    await ensureFocusSessionLoaded()
    return getFocusSession()
  })
  ipcMain.handle('update-focus-allowlist', async (_e, patch: Partial<FocusAllowlist>) => {
    const session = await updateFocusAllowlist(patch ?? {})
    refreshActivitySummary()
    return session
  })
  ipcMain.handle(
    'resolve-focus-interrupt',
    async (_e, payload: ResolveFocusInterruptPayload) => {
      const result = await resolveFocusInterrupt(payload ?? { action: 'resume' })
      if (result.ok) {
        deps.hideFocusInterruptWindow()
        refreshActivitySummary()
      }
      return result
    },
  )
  ipcMain.handle('get-focus-journal', (_e, date?: string) => getFocusJournal(date))
  ipcMain.handle('get-pending-focus-interrupt', () => getPendingFocusInterrupt())
  ipcMain.handle('hide-focus-interrupt', () => {
    deps.hideFocusInterruptWindow()
  })
}

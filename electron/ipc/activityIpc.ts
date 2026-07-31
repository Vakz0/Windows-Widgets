import { ipcMain } from 'electron'
import {
  clearActivityData,
  correctActivityCategory,
  exportActivity,
  getActivityRules,
  getActivitySettings,
  getActivitySummary,
  openActivityRulesFile,
  reloadActivityRules,
  updateActivitySettings,
} from '../activity'
import type {
  ActivityCorrectionPayload,
  ActivityExportFormat,
  ActivitySettings,
} from '../../shared/types'
import type { IpcDeps } from './types'

export function registerActivityIpc(deps: IpcDeps): void {
  ipcMain.handle('get-activity-summary', (_e, date?: string) => getActivitySummary(date))
  ipcMain.handle('get-activity-settings', () => getActivitySettings())
  ipcMain.handle(
    'update-activity-settings',
    (_e, patch: Partial<ActivitySettings>) => {
      if (!deps.hasService('activity-tracker')) {
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
      if (!deps.hasService('activity-tracker')) {
        return { ok: false, message: 'Activez le widget Activité pour exporter.' }
      }
      return exportActivity(opts ?? { format: 'json' })
    },
  )
  ipcMain.handle(
    'correct-activity-category',
    (_e, payload: ActivityCorrectionPayload) => {
      if (!deps.hasService('activity-tracker')) {
        return { ok: false, message: 'Activez le widget Activité.' }
      }
      return correctActivityCategory(payload)
    },
  )
  ipcMain.handle('clear-activity-data', async () => {
    if (!deps.hasService('activity-tracker')) {
      return {
        ok: false,
        message: 'Activez le widget Activité.',
        summary: await getActivitySummary(),
      }
    }
    return clearActivityData()
  })
}

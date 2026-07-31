import { ipcRenderer } from 'electron'
import type {
  ActivityCorrectionPayload,
  ActivityCorrectionResult,
  ActivityDaySummary,
  ActivityExportFormat,
  ActivityRules,
  ActivitySettings,
  FocusAllowlist,
  FocusInterruptContext,
  FocusJournalEntry,
  FocusSession,
  ResolveFocusInterruptPayload,
  StartFocusSessionPayload,
} from '../../shared/types'

export function createActivityApi() {
  return {
    getActivitySummary: (date?: string): Promise<ActivityDaySummary> =>
      ipcRenderer.invoke('get-activity-summary', date),
    getActivitySettings: (): Promise<ActivitySettings> =>
      ipcRenderer.invoke('get-activity-settings'),
    updateActivitySettings: (patch: Partial<ActivitySettings>): Promise<ActivitySettings> =>
      ipcRenderer.invoke('update-activity-settings', patch),
    getActivityRules: (): Promise<ActivityRules> => ipcRenderer.invoke('get-activity-rules'),
    reloadActivityRules: (): Promise<ActivityRules> =>
      ipcRenderer.invoke('reload-activity-rules'),
    openActivityRules: (): Promise<void> => ipcRenderer.invoke('open-activity-rules'),
    exportActivity: (opts: {
      format: ActivityExportFormat
      from?: string
      to?: string
    }): Promise<{ ok: boolean; path?: string; message?: string }> =>
      ipcRenderer.invoke('export-activity', opts),
    correctActivityCategory: (
      payload: ActivityCorrectionPayload,
    ): Promise<ActivityCorrectionResult> =>
      ipcRenderer.invoke('correct-activity-category', payload),
    clearActivityData: (): Promise<{
      ok: boolean
      message: string
      summary: ActivityDaySummary
    }> => ipcRenderer.invoke('clear-activity-data'),
    startFocusSession: (
      payload: StartFocusSessionPayload,
    ): Promise<{ ok: boolean; session?: FocusSession; message?: string }> =>
      ipcRenderer.invoke('start-focus-session', payload),
    stopFocusSession: (): Promise<FocusSession | null> =>
      ipcRenderer.invoke('stop-focus-session'),
    pauseFocusSession: (): Promise<FocusSession | null> =>
      ipcRenderer.invoke('pause-focus-session'),
    resumeFocusSession: (): Promise<FocusSession | null> =>
      ipcRenderer.invoke('resume-focus-session'),
    getFocusSession: (): Promise<FocusSession | null> =>
      ipcRenderer.invoke('get-focus-session'),
    updateFocusAllowlist: (
      patch: Partial<FocusAllowlist>,
    ): Promise<FocusSession | null> => ipcRenderer.invoke('update-focus-allowlist', patch),
    resolveFocusInterrupt: (
      payload: ResolveFocusInterruptPayload,
    ): Promise<{ ok: boolean; session: FocusSession | null; message?: string }> =>
      ipcRenderer.invoke('resolve-focus-interrupt', payload),
    getFocusJournal: (date?: string): Promise<FocusJournalEntry[]> =>
      ipcRenderer.invoke('get-focus-journal', date),
    getPendingFocusInterrupt: (): Promise<FocusInterruptContext | null> =>
      ipcRenderer.invoke('get-pending-focus-interrupt'),
    hideFocusInterrupt: (): Promise<void> => ipcRenderer.invoke('hide-focus-interrupt'),
  }
}

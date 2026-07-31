import type {
  ActivityCorrectionPayload,
  ActivityCorrectionResult,
  ActivityDaySummary,
  ActivityExportFormat,
  ActivityRules,
  ActivitySettings,
  AppUpdateState,
  CatalogWidgetInfo,
  CreateTaskPayload,
  CreateTaskResult,
  DeleteTaskPayload,
  DeleteTaskResult,
  FocusAllowlist,
  FocusInterruptContext,
  FocusJournalEntry,
  FocusSession,
  NotionConnectionTestResult,
  NotionPropertyOption,
  NotionSettingsPatch,
  NotionTask,
  PublicConfig,
  ResolveFocusInterruptPayload,
  StartFocusSessionPayload,
  SystemStats,
  UpdateTaskFieldPayload,
  UpdateTaskFieldResult,
  WidgetUpdateInfo,
  WidgetUpdatesState,
} from '../shared/types'

export type {
  ActivityBrowserDetail,
  ActivityCategory,
  ActivityConfidence,
  ActivityContextKind,
  ActivityCorrectionPayload,
  ActivityCorrectionResult,
  ActivityCorrectionScope,
  ActivityCurrentFocus,
  ActivityDaySummary,
  ActivityExportFormat,
  ActivityQualityMetrics,
  ActivityRules,
  ActivitySettings,
  ActivityTaskBreakdown,
  AppUpdateState,
  CatalogWidgetInfo,
  CreateTaskPayload,
  CreateTaskResult,
  DeleteTaskPayload,
  DeleteTaskResult,
  FocusAllowlist,
  FocusInterruptAction,
  FocusInterruptContext,
  FocusJournalEntry,
  FocusSession,
  FocusSessionStatus,
  NotionConnectionTestResult,
  NotionPropertyOption,
  NotionSettingsPatch,
  NotionTask,
  PublicConfig,
  ResolveFocusInterruptPayload,
  StartFocusSessionPayload,
  SystemStats,
  UpdateTaskFieldPayload,
  UpdateTaskFieldResult,
  WidgetUpdateInfo,
  WidgetUpdatesState,
} from '../shared/types'

export type CatalogView = 'catalog' | 'settings'

export interface LatticeApi {
  getTasks: () => Promise<NotionTask[]>
  refreshTasks: () => Promise<NotionTask[]>
  getTaskDescription: (pageId: string) => Promise<string | null>
  getPropertyOptions: (
    databaseId: string,
    propertyName: string,
  ) => Promise<NotionPropertyOption[]>
  updateTaskField: (payload: UpdateTaskFieldPayload) => Promise<UpdateTaskFieldResult>
  createTask: (payload: CreateTaskPayload) => Promise<CreateTaskResult>
  deleteTask: (payload: DeleteTaskPayload) => Promise<DeleteTaskResult>
  getStats: () => Promise<SystemStats>
  getConfig: () => Promise<PublicConfig>
  updatePublicSettings: (patch: {
    refreshIntervalSeconds?: number
    demoMode?: boolean
    launchAtStartup?: boolean
    updates?: { autoDownload?: boolean }
  }) => Promise<{ ok: boolean; config: PublicConfig }>
  getNotionSettings: () => Promise<PublicConfig>
  saveNotionSettings: (
    patch: NotionSettingsPatch,
  ) => Promise<{ ok: boolean; config: PublicConfig; message: string }>
  testNotionConnection: (payload: {
    notionToken?: string
    databaseId?: string
  }) => Promise<NotionConnectionTestResult>
  getAppVersion: () => Promise<string>
  openConfigFile: () => Promise<void>
  listWidgets: () => Promise<CatalogWidgetInfo[]>
  setWidgetEnabled: (
    id: string,
    enabled: boolean,
  ) => Promise<{ ok: boolean; widgets: CatalogWidgetInfo[] }>
  openCatalog: () => Promise<void>
  closeCatalog: () => Promise<void>
  minimizeCatalog: () => Promise<void>
  toggleMaximizeCatalog: () => Promise<boolean>
  isCatalogMaximized: () => Promise<boolean>
  onCatalogMaximizedChanged: (cb: (maximized: boolean) => void) => () => void
  onCatalogNavigate: (cb: (view: CatalogView) => void) => () => void
  openExternal: (url: string) => Promise<void>
  hideMonitor: () => Promise<void>
  enableTemp: () => Promise<{ ok: boolean; message: string }>
  disableTemp: () => Promise<{ ok: boolean; message: string }>
  getActivitySummary: (date?: string) => Promise<ActivityDaySummary>
  getActivitySettings: () => Promise<ActivitySettings>
  updateActivitySettings: (patch: Partial<ActivitySettings>) => Promise<ActivitySettings>
  getActivityRules: () => Promise<ActivityRules>
  reloadActivityRules: () => Promise<ActivityRules>
  openActivityRules: () => Promise<void>
  exportActivity: (opts: {
    format: ActivityExportFormat
    from?: string
    to?: string
  }) => Promise<{ ok: boolean; path?: string; message?: string }>
  correctActivityCategory: (
    payload: ActivityCorrectionPayload,
  ) => Promise<ActivityCorrectionResult>
  clearActivityData: () => Promise<{
    ok: boolean
    message: string
    summary: ActivityDaySummary
  }>
  startFocusSession: (
    payload: StartFocusSessionPayload,
  ) => Promise<{ ok: boolean; session?: FocusSession; message?: string }>
  stopFocusSession: () => Promise<FocusSession | null>
  pauseFocusSession: () => Promise<FocusSession | null>
  resumeFocusSession: () => Promise<FocusSession | null>
  getFocusSession: () => Promise<FocusSession | null>
  updateFocusAllowlist: (patch: Partial<FocusAllowlist>) => Promise<FocusSession | null>
  resolveFocusInterrupt: (
    payload: ResolveFocusInterruptPayload,
  ) => Promise<{ ok: boolean; session: FocusSession | null; message?: string }>
  getFocusJournal: (date?: string) => Promise<FocusJournalEntry[]>
  getPendingFocusInterrupt: () => Promise<FocusInterruptContext | null>
  hideFocusInterrupt: () => Promise<void>
  getAppUpdateStatus: () => Promise<AppUpdateState>
  checkAppUpdate: () => Promise<AppUpdateState>
  downloadAppUpdate: () => Promise<AppUpdateState>
  installAppUpdate: () => Promise<{ ok: boolean }>
  getWidgetUpdateStatus: () => Promise<WidgetUpdatesState>
  checkWidgetUpdates: () => Promise<WidgetUpdatesState>
  updateWidgets: (ids?: string[]) => Promise<WidgetUpdatesState>
  installWidget: (id: string) => Promise<{ ok: boolean; message: string }>
  listRemoteWidgets: () => Promise<WidgetUpdateInfo[]>
  onTasksUpdated: (cb: (tasks: NotionTask[]) => void) => () => void
  onTasksError: (cb: (message: string) => void) => () => void
  onStatsUpdated: (cb: (stats: SystemStats) => void) => () => void
  onActivityUpdated: (cb: (summary: ActivityDaySummary) => void) => () => void
  onFocusSessionUpdated: (cb: (session: FocusSession | null) => void) => () => void
  onFocusInterrupt: (cb: (ctx: FocusInterruptContext) => void) => () => void
  onWidgetsChanged: (cb: (widgets: CatalogWidgetInfo[]) => void) => () => void
  onAppUpdateStatus: (cb: (state: AppUpdateState) => void) => () => void
  onWidgetUpdateStatus: (cb: (state: WidgetUpdatesState) => void) => () => void
}

declare global {
  interface Window {
    lattice: LatticeApi
  }
}

export {}

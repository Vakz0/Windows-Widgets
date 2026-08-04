/** Types partagés entre le process Electron et l’UI React — barrel. */

export type {
  WidgetState,
  CatalogWidgetInfo,
  WidgetDefinition,
  WidgetSource,
  WidgetPlacement,
  WidgetServiceId,
} from '../widget'

export type {
  TaskPropertyMapping,
  TaskSourceFilters,
  ProjectSourceConfig,
  NotionTask,
  NotionPropertyOption,
  UpdateTaskFieldPayload,
  UpdateTaskFieldResult,
  CreateTaskPayload,
  CreateTaskResult,
  DeleteTaskPayload,
  DeleteTaskResult,
  NotionDatabasePropertyInfo,
  NotionConnectionTestResult,
  NotionSettingsPatch,
} from './notion'

export type {
  UpdatesConfig,
  WindowBounds,
  AppConfig,
  PublicConfig,
} from './config'

export type {
  AppUpdateStatus,
  AppUpdateState,
  WidgetCatalogEntry,
  WidgetUpdateItemStatus,
  WidgetUpdateInfo,
  WidgetUpdatesStatus,
  WidgetUpdatesState,
} from './updates'

export type { SystemStats } from './system'

export type {
  FocusSessionStatus,
  FocusAllowlist,
  FocusSession,
  FocusInterruptAction,
  FocusJournalEntry,
  FocusInterruptContext,
  StartFocusSessionPayload,
  ResolveFocusInterruptPayload,
} from './focus'

export type {
  WidgetKind,
  ActivityCategory,
  ActivityExportFormat,
  ActivityCategorySource,
  ActivityConfidence,
  ActivityCorrectionScope,
  ActivityBrowserDetail,
  ActivityContextKind,
  ActivitySegment,
  ActivityAppBreakdown,
  ActivitySiteBreakdown,
  ActivityProjectBreakdown,
  ActivityTaskBreakdown,
  ActivityQualityMetrics,
  ActivityCurrentFocus,
  ActivityDaySummary,
  ActivitySettings,
  ActivityTitlePattern,
  ActivityRules,
  ActivityFeedbackEntry,
  ActivityCorrectionPayload,
  ActivityCorrectionResult,
} from './activity'

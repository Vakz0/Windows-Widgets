/** Types partagés entre le process Electron et l’UI React. */

import type { WidgetState } from './widget'

export type { WidgetState, CatalogWidgetInfo, WidgetDefinition, WidgetSource, WidgetPlacement, WidgetServiceId } from './widget'

export interface TaskPropertyMapping {
  title: string
  date: string
  tag: string
  status: string
  urgency?: string
  /** Nom de la case à cocher « terminé » */
  doneCheckbox?: string
  /** Statut workflow Notion (ex. Status) */
  workflowStatus?: string
  /** Propriété texte pour la description */
  description?: string
}

export interface TaskSourceFilters {
  hideCompleted: boolean
  completedStatusValues: string[]
}

export interface ProjectSourceConfig {
  databaseId: string
  projectPageId: string
  relationProperty: string
  label: string
  properties: TaskPropertyMapping
  filters: TaskSourceFilters
}

export interface AppConfig {
  notionToken: string
  databaseId: string
  properties: TaskPropertyMapping
  filters: TaskSourceFilters
  /** Sources secondaires (bases filtrées par relation projet) */
  projectSources?: ProjectSourceConfig[]
  refreshIntervalSeconds: number
  launchAtStartup: boolean
  demoMode: boolean
  /** Activation par widget (catalogue). Absent → migration legacy. */
  widgets?: Record<string, WidgetState>
  /** Positions / tailles des fenêtres par id de widget */
  windows?: Record<string, WindowBounds>
}

export interface WindowBounds {
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface NotionTask {
  id: string
  title: string
  date: string | null
  tag: string | null
  tagColor: string | null
  status: string | null
  urgency: string | null
  urgencyColor: string | null
  importance: string | null
  importanceColor: string | null
  description: string | null
  url: string
  done: boolean
  /** Libellé de la source projet (ex. source secondaire) */
  sourceLabel?: string | null
}

export interface SystemStats {
  cpuPercent: number
  ramPercent: number
  ramUsedGb: number
  ramTotalGb: number
  temperatureC: number | null
  tempSource?: string | null
  updatedAt: string
}

export interface PublicConfig {
  refreshIntervalSeconds: number
  demoMode: boolean
  configPath: string
  launchAtStartup: boolean
  /** True when a non-placeholder token and database id are stored. */
  notionConfigured: boolean
  /** Masked hint only — never the raw secret. */
  notionTokenStored: boolean
  databaseId: string
  properties: TaskPropertyMapping
  filters: TaskSourceFilters
  /** Secondary sources count (edited via config.json). */
  projectSourcesCount: number
}

export interface NotionDatabasePropertyInfo {
  name: string
  type: string
}

export interface NotionConnectionTestResult {
  ok: boolean
  message: string
  databaseTitle?: string
  properties?: NotionDatabasePropertyInfo[]
  /** Suggested mapping inferred from property types (when ok). */
  suggestedProperties?: Partial<TaskPropertyMapping>
}

export interface NotionSettingsPatch {
  /** If omitted or empty, keep the existing token. */
  notionToken?: string
  databaseId?: string
  properties?: Partial<TaskPropertyMapping>
  filters?: Partial<TaskSourceFilters>
}

/** Id de widget (builtin ou futur plugin). */
export type WidgetKind = string

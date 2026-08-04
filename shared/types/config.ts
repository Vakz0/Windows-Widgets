/** Config app, fenêtres, réglages publics. */

import type { WidgetState } from '../widget'
import type {
  ProjectSourceConfig,
  TaskPropertyMapping,
  TaskSourceFilters,
} from './notion'

export interface UpdatesConfig {
  /** Télécharge les MAJ en arrière-plan et notifie Windows quand c’est prêt. */
  autoDownload: boolean
  lastCheckedAt?: string
}

export interface WindowBounds {
  x?: number
  y?: number
  width?: number
  height?: number
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
  updates?: UpdatesConfig
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
  updates: UpdatesConfig
}

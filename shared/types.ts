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

export interface UpdatesConfig {
  /** Télécharge les MAJ en arrière-plan et notifie Windows quand c’est prêt. */
  autoDownload: boolean
  lastCheckedAt?: string
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

export type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'up-to-date'
  | 'unsupported'

export interface AppUpdateState {
  status: AppUpdateStatus
  version?: string
  progress?: number
  message?: string
}

export interface WidgetCatalogEntry {
  id: string
  label: string
  description?: string
  version: string
  downloadUrl: string
  sha256: string
  minAppVersion?: string
}

export type WidgetUpdateItemStatus =
  | 'not-installed'
  | 'up-to-date'
  | 'update-available'
  | 'incompatible'

export interface WidgetUpdateInfo {
  id: string
  label: string
  description: string
  installedVersion: string | null
  latestVersion: string
  status: WidgetUpdateItemStatus
}

export type WidgetUpdatesStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'updating'
  | 'ready'
  | 'error'
  | 'up-to-date'

export interface WidgetUpdatesState {
  status: WidgetUpdatesStatus
  updates: WidgetUpdateInfo[]
  message?: string
  progress?: number
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
  /** Fond sombre (thème dark Notion) dérivé de la couleur d'importance */
  importanceBg: string | null
  description: string | null
  url: string
  done: boolean
  /** Libellé de la source projet (ex. source secondaire) */
  sourceLabel?: string | null
  /** Base Notion d'origine (primaire ou source projet), utile pour l'édition. */
  databaseId: string
  /** Mapping de propriétés utilisé pour parser cette tâche (permet d'écrire vers la bonne propriété Notion). */
  propertyMap: TaskPropertyMapping
}

/** Option d'une propriété select/status/multi_select Notion, prête à afficher (couleur déjà résolue). */
export interface NotionPropertyOption {
  name: string
  color: string | null
}

export interface UpdateTaskFieldPayload {
  pageId: string
  databaseId: string
  /** Nom réel de la propriété Notion (ex. `task.propertyMap.tag`). */
  propertyName: string
  /** Texte/date ISO pour title|rich_text|select|status|date, booléen pour checkbox, `null` pour vider. */
  value: string | boolean | null
}

export interface UpdateTaskFieldResult {
  ok: boolean
  task?: NotionTask
  message?: string
}

export interface CreateTaskPayload {
  title: string
  /** Date ISO `YYYY-MM-DD`. */
  date: string
}

export interface CreateTaskResult {
  ok: boolean
  task?: NotionTask
  message?: string
}

export interface DeleteTaskPayload {
  pageId: string
}

export interface DeleteTaskResult {
  ok: boolean
  message?: string
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
  updates: UpdatesConfig
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

/** Suivi d’activité (focus app + titre). */
export type ActivityCategory =
  | 'work'
  | 'entertainment'
  | 'communication'
  | 'system'
  | 'other'
  | 'afk'

export type ActivityExportFormat = 'csv' | 'json'

export type ActivityCategorySource =
  | 'idle'
  | 'domain'
  | 'title'
  | 'app'
  | 'user'
  | 'fallback'

export type ActivityConfidence = 'high' | 'medium' | 'low'

export type ActivityCorrectionScope = 'app' | 'title' | 'domain'

export type ActivityBrowserDetail = 'domain' | 'url' | 'off'

export type ActivityContextKind = 'browser' | 'ide' | 'chat' | 'other'

export interface ActivitySegment {
  start: string
  end: string
  app: string
  title: string | null
  category: ActivityCategory
  /** Pourquoi la catégorie a été choisie (rétrocompat : absent sur anciens segments). */
  categorySource?: ActivityCategorySource
  matchedPattern?: string | null
  idleSec?: number
  prevApp?: string | null
  sessionId?: string | null
  /** Dernier dossier parent de l’exe (pas le chemin complet). */
  exeDir?: string | null
  /** Hash court du titre si les titres ne sont pas stockés. */
  titleHash?: string | null
  confidence?: ActivityConfidence
  domain?: string | null
  /** Path+query si browserDetail === 'url' ; sinon null. */
  urlPath?: string | null
  contextKind?: ActivityContextKind | null
  fileName?: string | null
  projectName?: string | null
  /** True = Lattice / apps ignorées — hors totaux et tops. */
  ignored?: boolean
}

export interface ActivityAppBreakdown {
  app: string
  ms: number
  category: ActivityCategory
  confidence?: ActivityConfidence
}

export interface ActivitySiteBreakdown {
  domain: string
  ms: number
  category: ActivityCategory
}

export interface ActivityProjectBreakdown {
  projectName: string
  ms: number
}

export interface ActivityQualityMetrics {
  /** Part du temps actif classé « other » (0–1). */
  otherShare: number
  /** Part du temps actif à confiance basse (0–1). */
  lowConfidenceShare: number
  unknownAppCount: number
  feedbackCountToday: number
}

export interface ActivityCurrentFocus {
  app: string
  title: string | null
  category: ActivityCategory
  confidence: ActivityConfidence
  categorySource: ActivityCategorySource
  domain?: string | null
  fileName?: string | null
  projectName?: string | null
  contextKind?: ActivityContextKind | null
  ignored?: boolean
}

export interface ActivityDaySummary {
  date: string
  totalMs: number
  byCategory: Record<ActivityCategory, number>
  topApps: ActivityAppBreakdown[]
  topSites: ActivitySiteBreakdown[]
  topProjects: ActivityProjectBreakdown[]
  paused: boolean
  tracking: boolean
  quality: ActivityQualityMetrics
  current: ActivityCurrentFocus | null
  /** False si le binaire active-url.exe est introuvable. */
  urlHelperAvailable: boolean
  /** True si l’extension média signale une lecture active (bloque l’AFK). */
  mediaKeepAwake: boolean
  /** Temps de visionnage (extension, lecture réelle) par domaine. */
  topWatch: ActivitySiteBreakdown[]
}

export interface ActivitySettings {
  paused: boolean
  /** Si false, seuls les noms d’apps sont stockés (pas les titres). */
  storeTitles: boolean
  idleThresholdSec: number
  /** Détail navigateur : domaine seul (défaut), URL complète, ou désactivé. */
  browserDetail: ActivityBrowserDetail
  /** Parser les titres Cursor / VS Code / Slack. */
  parseIdeTitles: boolean
}

export interface ActivityTitlePattern {
  pattern: string
  category: ActivityCategory
}

export interface ActivityRules {
  /** Clé = nom d’exe sans extension, en minuscules. */
  appDefaults: Record<string, ActivityCategory>
  titlePatterns: ActivityTitlePattern[]
  /** Corrections manuelles (prioritaires, source `user`). */
  userAppOverrides?: Record<string, ActivityCategory>
  /** Corrections manuelles par domaine (prioritaires sur les domaines intégrés). */
  userDomainOverrides?: Record<string, ActivityCategory>
  /** Noms d’exe exclus des totaux (en plus de Lattice détecté via HWND). */
  ignoredApps?: string[]
}

export interface ActivityFeedbackEntry {
  at: string
  app: string
  titleSample: string | null
  from: ActivityCategory
  to: ActivityCategory
  scope: ActivityCorrectionScope
  durationMsHint: number
}

export interface ActivityCorrectionPayload {
  app: string
  category: ActivityCategory
  scope: ActivityCorrectionScope
  titleSample?: string | null
  /** Requis pour scope `domain`. */
  domain?: string | null
}

export interface ActivityCorrectionResult {
  ok: boolean
  message?: string
  summary?: ActivityDaySummary
  rules?: ActivityRules
}


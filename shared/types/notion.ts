/** Mapping et modèles Notion / tâches. */

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

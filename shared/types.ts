/** Types partagés entre le process Electron et l’UI React. */

export interface AppConfig {
  notionToken: string
  databaseId: string
  properties: {
    title: string
    date: string
    tag: string
    status: string
    urgency?: string
    /** Nom de la case à cocher « terminé » (peut être vide dans Tracker) */
    doneCheckbox?: string
  }
  filters: {
    hideCompleted: boolean
    completedStatusValues: string[]
  }
  refreshIntervalSeconds: number
  launchAtStartup: boolean
  demoMode: boolean
  windows?: {
    calendar?: WindowBounds
    tasks?: WindowBounds
    monitor?: WindowBounds
  }
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
}

export type WidgetKind = 'calendar' | 'tasks' | 'monitor'

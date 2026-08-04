/** Session focus Notion + interruptions. */

export type FocusSessionStatus = 'active' | 'interrupted' | 'paused'

export interface FocusAllowlist {
  apps: string[]
  domains: string[]
  ideProjects: string[]
  /** Clés URL normalisées (ex. `youtube:VIDEO_ID`) autorisées pour la session. */
  urls: string[]
}

export interface FocusSession {
  id: string
  notionTaskId: string
  notionTaskTitle: string
  databaseId: string
  startedAt: string
  status: FocusSessionStatus
  allowlist: FocusAllowlist
}

export type FocusInterruptAction = 'resume' | 'allow_once' | 'pause' | 'stop'

export interface FocusJournalEntry {
  ts: string
  sessionId: string
  notionTaskId: string
  app: string
  title: string | null
  domain: string | null
  projectName: string | null
  note: string
  action: FocusInterruptAction
}

export interface FocusInterruptContext {
  app: string
  title: string | null
  domain: string | null
  /** Chemin+query de l’URL navigateur au moment de l’interruption (si disponible). */
  urlPath: string | null
  projectName: string | null
  notionTaskId: string
  notionTaskTitle: string
  sessionId: string
}

export interface StartFocusSessionPayload {
  notionTaskId: string
  notionTaskTitle: string
  databaseId: string
  /** Suggestions initiales optionnelles (projet IDE courant, etc.). */
  seedAllowlist?: Partial<FocusAllowlist>
}

export interface ResolveFocusInterruptPayload {
  action: FocusInterruptAction
  note?: string
}

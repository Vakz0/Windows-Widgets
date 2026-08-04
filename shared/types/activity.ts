/** Suivi d’activité (focus app + titre). */

import type { FocusSession } from './focus'

/** Id de widget (builtin ou futur plugin). */
export type WidgetKind = string

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
  /** Apps Lattice / ignorées — hors totaux et tops. */
  ignored?: boolean
  /** Session focus Notion active au moment du segment. */
  focusSessionId?: string | null
  /** Page Notion à laquelle le temps est imputé. */
  notionTaskId?: string | null
  /** Titre snapshot de la tâche Notion. */
  notionTaskTitle?: string | null
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

export interface ActivityTaskBreakdown {
  notionTaskId: string
  title: string
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
  /** Session focus Notion en cours (null si aucune). */
  focusSession: FocusSession | null
  /** Temps imputé aux tâches Notion (agrégat local du jour). */
  topTasks: ActivityTaskBreakdown[]
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
  /** Secondes hors allowlist avant interruption focus (défaut 8). */
  focusOffProjectDwellSec: number
}

export interface ActivityTitlePattern {
  pattern: string
  category: ActivityCategory
}

export interface ActivityRules {
  /** Nom d'exe sans extension, en minuscules → catégorie. */
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

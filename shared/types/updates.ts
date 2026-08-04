/** Mises à jour app et widgets externes. */

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

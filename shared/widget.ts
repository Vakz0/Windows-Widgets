/** Contrat widget — builtins aujourd’hui, plugins externes demain. */

export type WidgetSource = 'builtin' | 'external'
export type WidgetPlacement = 'desktop' | 'popup'
export type WidgetServiceId =
  | 'notion'
  | 'system-stats'
  | 'temp-daemon'
  | 'activity-tracker'

export interface WidgetDefinition {
  id: string
  label: string
  description: string
  source: WidgetSource
  placement: WidgetPlacement
  services: WidgetServiceId[]
  defaultBounds: { width: number; height: number }
  windowOptions?: { resizable?: boolean; alwaysOnTop?: boolean }
  /** Semver pour les packages externes. */
  version?: string
  /** Chemin relatif à l’entrée HTML (défaut `index.html`). */
  entry?: string
}

export interface WidgetState {
  enabled: boolean
}

export interface CatalogWidgetInfo {
  id: string
  label: string
  description: string
  source: WidgetSource
  placement: WidgetPlacement
  enabled: boolean
}

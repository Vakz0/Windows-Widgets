import type { WidgetDefinition } from '../../shared/widget'
import { discoverExternalWidgets } from './discoverExternal'

const BUILTIN_WIDGETS: WidgetDefinition[] = [
  {
    id: 'calendar',
    label: 'Calendrier',
    description:
      'Vue semaine des tâches Notion datées (base principale + sources secondaires). Cliquez une carte pour le détail.',
    source: 'builtin',
    placement: 'desktop',
    services: ['notion'],
    defaultBounds: { width: 920, height: 420 },
    windowOptions: { resizable: true, alwaysOnTop: false },
  },
  {
    id: 'tasks',
    label: 'Tâches',
    description:
      'Liste des tâches ouvertes avec tags, importance et urgence. Même panneau de détail que le calendrier.',
    source: 'builtin',
    placement: 'desktop',
    services: ['notion'],
    defaultBounds: { width: 360, height: 480 },
    windowOptions: { resizable: true, alwaysOnTop: false },
  },
  {
    id: 'activity',
    label: 'Activité',
    description:
      'Temps passé par app et catégorie (travail, divertissement…). Historique local, export CSV/JSON.',
    source: 'builtin',
    placement: 'desktop',
    services: ['activity-tracker'],
    defaultBounds: { width: 380, height: 520 },
    windowOptions: { resizable: true, alwaysOnTop: false },
  },
]

/** Cached defs for sync hot paths (power mode, hasService). Warmed by getAllWidgetDefinitions. */
let defsCache: WidgetDefinition[] = [...BUILTIN_WIDGETS]

/** Définitions builtin + packages externes découverts sous userData/widgets. */
export async function getAllWidgetDefinitions(): Promise<WidgetDefinition[]> {
  const defs = [...BUILTIN_WIDGETS, ...(await discoverExternalWidgets())]
  defsCache = defs
  return defs
}

/** Sync snapshot of last discovery (builtins only until first await). */
export function getAllWidgetDefinitionsCached(): WidgetDefinition[] {
  return defsCache
}

export async function getWidgetDefinition(id: string): Promise<WidgetDefinition | undefined> {
  return (await getAllWidgetDefinitions()).find((d) => d.id === id)
}

export function getWidgetDefinitionCached(id: string): WidgetDefinition | undefined {
  return defsCache.find((d) => d.id === id)
}

export function getDesktopWidgetDefinitionsCached(): WidgetDefinition[] {
  return defsCache.filter((d) => d.placement === 'desktop')
}

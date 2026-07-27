import type { WidgetDefinition, WidgetServiceId } from '../../shared/widget'
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
    id: 'monitor',
    label: 'Monitoring',
    description:
      'Jauges CPU, RAM et température. Pop-up always-on-top depuis le systray (clic gauche).',
    source: 'builtin',
    placement: 'popup',
    services: ['system-stats', 'temp-daemon'],
    defaultBounds: { width: 360, height: 300 },
    windowOptions: { resizable: false, alwaysOnTop: true },
  },
]

/** Définitions builtin + externes découvertes (stub pour l’instant). */
export function getAllWidgetDefinitions(): WidgetDefinition[] {
  return [...BUILTIN_WIDGETS, ...discoverExternalWidgets()]
}

export function getWidgetDefinition(id: string): WidgetDefinition | undefined {
  return getAllWidgetDefinitions().find((d) => d.id === id)
}

export function getDesktopWidgetDefinitions(): WidgetDefinition[] {
  return getAllWidgetDefinitions().filter((d) => d.placement === 'desktop')
}

export function widgetNeedsService(
  def: WidgetDefinition,
  service: WidgetServiceId,
): boolean {
  return def.services.includes(service)
}

import type { ComponentType } from 'react'
import { CalendarWidget } from './CalendarWidget'
import { TasksWidget } from './TasksWidget'
import { MonitorWidget } from './MonitorWidget'
import { CatalogWidget } from './CatalogWidget'

/**
 * Map id → composant React.
 * Pour un nouveau widget builtin : ajouter l’entrée ici + dans electron/widgets/registry.ts
 */
export const widgetComponents: Record<string, ComponentType> = {
  calendar: CalendarWidget,
  tasks: TasksWidget,
  monitor: MonitorWidget,
  catalog: CatalogWidget,
}

export function resolveWidgetComponent(id: string): ComponentType | null {
  return widgetComponents[id] ?? null
}

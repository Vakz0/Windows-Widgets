import type { ComponentType } from 'react'
import { CalendarWidget } from './CalendarWidget'
import { TasksWidget } from './TasksWidget'
import { ActivityWidget } from './ActivityWidget'
import { CatalogWidget } from './CatalogWidget'
import { FocusInterruptWidget } from './FocusInterruptWidget'

/**
 * Map id → composant React.
 * Pour un nouveau widget builtin : ajouter l’entrée ici + dans electron/widgets/registry.ts
 * (sauf fenêtres internes comme focus-interrupt, hors catalogue).
 */
const widgetComponents: Record<string, ComponentType> = {
  calendar: CalendarWidget,
  tasks: TasksWidget,
  activity: ActivityWidget,
  catalog: CatalogWidget,
  'focus-interrupt': FocusInterruptWidget,
}

export function resolveWidgetComponent(id: string): ComponentType | null {
  return widgetComponents[id] ?? null
}

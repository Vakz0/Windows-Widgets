import type { ComponentType } from 'react'
import { CalendarWidget } from './CalendarWidget'
import { TasksWidget } from './TasksWidget'
import { MonitorWidget } from './MonitorWidget'
import { ActivityWidget } from './ActivityWidget'
import { CatalogWidget } from './CatalogWidget'
import { FocusInterruptWidget } from './FocusInterruptWidget'

/**
 * Map id → composant React.
 * Pour un nouveau widget builtin : ajouter l’entrée ici + dans electron/widgets/registry.ts
 * (sauf fenêtres internes comme focus-interrupt, hors catalogue).
 */
<<<<<<< HEAD
const widgetComponents: Record<string, ComponentType> = {
=======
export const widgetComponents: Record<string, ComponentType> = {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  calendar: CalendarWidget,
  tasks: TasksWidget,
  monitor: MonitorWidget,
  activity: ActivityWidget,
  catalog: CatalogWidget,
  'focus-interrupt': FocusInterruptWidget,
}

export function resolveWidgetComponent(id: string): ComponentType | null {
  return widgetComponents[id] ?? null
}

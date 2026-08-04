import type { ComponentType } from 'react'
import { CalendarWidget } from './CalendarWidget'
import { TasksWidget } from './TasksWidget'
import { ActivityWidget } from './ActivityWidget'
import { CatalogWidget } from './CatalogWidget'
import { FocusInterruptWidget } from './FocusInterruptWidget'

/**
 * React half of the dual registry (see docs glossary).
 * Builtin desktop widgets must also be listed in electron/widgets/registry.ts.
 * Internal windows (catalog, focus-interrupt) are React-only — main opens them
 * via windows/catalogWindow or focus/interruptWindow, not BUILTIN_WIDGETS.
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

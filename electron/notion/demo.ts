import type {
  NotionPropertyOption,
  NotionTask,
  TaskPropertyMapping,
} from '../../shared/types'
import { NOTION_COLOR_STYLES, colorStyle } from './parse'

/** Base fictive et mapping de propriétés utilisés par les tâches de démo (pour l'édition). */
export const DEMO_DATABASE_ID = 'demo-database'
export const DEMO_PROPERTY_MAP: TaskPropertyMapping = {
  title: 'Name',
  date: 'Date',
  tag: 'Tags',
  status: 'Priority',
  urgency: 'Urgency',
  doneCheckbox: 'Done',
}

/** Options de sélection factices, alignées sur les libellés utilisés dans `demoTasks()`. */
export const DEMO_OPTIONS: Record<string, Array<{ name: string; color: string }>> = {
  Tags: [
    { name: 'Facile', color: 'yellow' },
    { name: 'Moyen', color: 'orange' },
    { name: 'Flow', color: 'blue' },
  ],
  Priority: [
    { name: 'Pas Important', color: 'gray' },
    { name: '⚠️Important', color: 'yellow' },
    { name: 'Impactant', color: 'green' },
  ],
  Urgency: [
    { name: 'Pas urgent', color: 'gray' },
    { name: '⏰ Urgent', color: 'red' },
    { name: 'Habitude', color: 'blue' },
  ],
}

export function toOptionList(raw: Array<{ name: string; color?: string | null }>): NotionPropertyOption[] {
  return raw.map((o) => ({ name: o.name, color: colorStyle(o.color ?? null)?.fg ?? null }))
}

/** Store mutable en mode démo pour que les éditions survivent au refresh de session. */
let demoStore: NotionTask[] | null = null

export function getDemoTasks(): NotionTask[] {
  if (!demoStore) demoStore = demoTasks()
  return demoStore
}

function demoTasks(): NotionTask[] {
  const today = new Date()
  const iso = (offset: number) => {
    const d = new Date(today)
    d.setDate(today.getDate() + offset)
    return d.toISOString().slice(0, 10)
  }

  const base = { databaseId: DEMO_DATABASE_ID, propertyMap: DEMO_PROPERTY_MAP }

  return [
    {
      ...base,
      id: 'demo-1',
      title: 'Anniv Félix',
      date: iso(1),
      tag: 'Facile',
      tagColor: NOTION_COLOR_STYLES.yellow.fg,
      status: 'Pas Important',
      urgency: 'Pas urgent',
      urgencyColor: NOTION_COLOR_STYLES.gray.fg,
      importance: 'Pas Important',
      importanceColor: NOTION_COLOR_STYLES.gray.fg,
      importanceBg: NOTION_COLOR_STYLES.gray.bg,
      description: 'Trouver les cadeaux et proposer sur le groupe snap',
      url: '',
      done: false,
      sourceLabel: null,
    },
    {
      ...base,
      id: 'demo-2',
      title: 'Faire la lettre pour …',
      date: iso(1),
      tag: 'Flow',
      tagColor: NOTION_COLOR_STYLES.blue.fg,
      status: '⚠️Important',
      urgency: '⏰ Urgent',
      urgencyColor: NOTION_COLOR_STYLES.red.fg,
      importance: '⚠️Important',
      importanceColor: NOTION_COLOR_STYLES.yellow.fg,
      importanceBg: NOTION_COLOR_STYLES.yellow.bg,
      description: 'Écrire une lettre manuscrite et la poster cette semaine.',
      url: '',
      done: false,
      sourceLabel: null,
    },
    {
      ...base,
      id: 'demo-3',
      title: 'Ranger ma chambre',
      date: iso(1),
      tag: 'Moyen',
      tagColor: NOTION_COLOR_STYLES.orange.fg,
      status: '⚠️Important',
      urgency: '⏰ Urgent',
      urgencyColor: NOTION_COLOR_STYLES.red.fg,
      importance: '⚠️Important',
      importanceColor: NOTION_COLOR_STYLES.yellow.fg,
      importanceBg: NOTION_COLOR_STYLES.yellow.bg,
      description: 'Trier le bureau, plier les vêtements et passer l’aspirateur.',
      url: '',
      done: false,
      sourceLabel: null,
    },
    {
      ...base,
      id: 'demo-4',
      title: 'Réviser algo',
      date: iso(0),
      tag: 'Flow',
      tagColor: NOTION_COLOR_STYLES.blue.fg,
      status: 'Impactant',
      urgency: 'Habitude',
      urgencyColor: NOTION_COLOR_STYLES.blue.fg,
      importance: 'Impactant',
      importanceColor: NOTION_COLOR_STYLES.green.fg,
      importanceBg: NOTION_COLOR_STYLES.green.bg,
      description: 'Faire 2 exercices de complexité et revoir les structures de données.',
      url: '',
      done: false,
      sourceLabel: null,
    },
    {
      ...base,
      id: 'demo-5',
      title: 'Courses',
      date: iso(-1),
      tag: 'Facile',
      tagColor: NOTION_COLOR_STYLES.yellow.fg,
      status: 'Pas Important',
      urgency: 'Pas urgent',
      urgencyColor: NOTION_COLOR_STYLES.gray.fg,
      importance: 'Pas Important',
      importanceColor: NOTION_COLOR_STYLES.gray.fg,
      importanceBg: NOTION_COLOR_STYLES.gray.bg,
      description: null,
      url: '',
      done: false,
      sourceLabel: null,
    },
    {
      ...base,
      id: 'demo-6',
      title: 'Appeler le dentiste',
      date: iso(3),
      tag: 'Moyen',
      tagColor: NOTION_COLOR_STYLES.orange.fg,
      status: '⚠️Important',
      urgency: '⏰ Urgent',
      urgencyColor: NOTION_COLOR_STYLES.red.fg,
      importance: '⚠️Important',
      importanceColor: NOTION_COLOR_STYLES.yellow.fg,
      importanceBg: NOTION_COLOR_STYLES.yellow.bg,
      description: 'Prendre rendez-vous pour un contrôle avant septembre.',
      url: '',
      done: false,
      sourceLabel: null,
    },
  ]
}

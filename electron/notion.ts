import { Client } from '@notionhq/client'
import type { AppConfig, NotionTask } from '../shared/types'
import { extractDatabaseId } from './config'

const NOTION_COLORS: Record<string, string> = {
  default: '#9B9A97',
  gray: '#9B9A97',
  brown: '#C4A484',
  orange: '#E07A3D',
  yellow: '#D4B483',
  green: '#4DAD7F',
  blue: '#6BA3D6',
  purple: '#9A7FD1',
  pink: '#D97BA8',
  red: '#E05C5C',
}

function richTextToPlain(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const rt = (value as { rich_text?: Array<{ plain_text?: string }> }).rich_text
  if (!Array.isArray(rt)) return ''
  return rt.map((t) => t.plain_text ?? '').join('')
}

function titleToPlain(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const title = (value as { title?: Array<{ plain_text?: string }> }).title
  if (!Array.isArray(title)) return ''
  return title.map((t) => t.plain_text ?? '').join('')
}

function readSelect(value: unknown): { name: string | null; color: string | null } {
  if (!value || typeof value !== 'object') return { name: null, color: null }
  const obj = value as {
    type?: string
    select?: { name?: string; color?: string } | null
    status?: { name?: string; color?: string } | null
    multi_select?: Array<{ name?: string; color?: string }>
  }
  if (obj.type === 'select' && obj.select) {
    return { name: obj.select.name ?? null, color: obj.select.color ?? null }
  }
  if (obj.type === 'status' && obj.status) {
    return { name: obj.status.name ?? null, color: obj.status.color ?? null }
  }
  if (obj.type === 'multi_select' && obj.multi_select?.length) {
    const first = obj.multi_select[0]
    return { name: first.name ?? null, color: first.color ?? null }
  }
  return { name: null, color: null }
}

function readDate(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const date = (value as { date?: { start?: string } | null }).date
  return date?.start?.slice(0, 10) ?? null
}

function readCheckbox(value: unknown): boolean | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as { type?: string; checkbox?: boolean }
  if (obj.type === 'checkbox') return Boolean(obj.checkbox)
  return null
}

function isDone(props: Record<string, unknown>, config: AppConfig, statusName: string | null): boolean {
  const checkboxName = config.properties.doneCheckbox
  if (checkboxName !== undefined) {
    if (checkboxName in props) {
      const checked = readCheckbox(props[checkboxName])
      if (checked != null) return checked
    }
    // Tracker : case à cocher sans nom visible
    for (const [key, value] of Object.entries(props)) {
      const checked = readCheckbox(value)
      if (checked == null) continue
      if (checkboxName === '' || key === checkboxName) return checked
    }
  }

  return Boolean(
    statusName &&
      config.filters.completedStatusValues.some(
        (v) => v.toLowerCase() === statusName.toLowerCase(),
      ),
  )
}

function parsePage(page: Record<string, unknown>, config: AppConfig): NotionTask {
  const props = (page.properties ?? {}) as Record<string, unknown>
  const titleProp = props[config.properties.title]
  const dateProp = props[config.properties.date]
  const tagProp = props[config.properties.tag]
  const statusProp = props[config.properties.status]
  const urgencyProp = props[config.properties.urgency ?? 'Urgence']

  let title = titleToPlain(titleProp)
  if (!title) title = richTextToPlain(titleProp)
  if (!title) title = 'Sans titre'

  const tag = readSelect(tagProp)
  const importance = readSelect(statusProp)
  const urgency = readSelect(urgencyProp)
  const statusName = importance.name
  const done = isDone(props, config, statusName)

  return {
    id: String(page.id),
    title,
    date: readDate(dateProp),
    tag: tag.name,
    tagColor: tag.color ? NOTION_COLORS[tag.color] ?? NOTION_COLORS.default : null,
    status: statusName,
    urgency: urgency.name,
    urgencyColor: urgency.color ? NOTION_COLORS[urgency.color] ?? NOTION_COLORS.default : null,
    importance: importance.name,
    importanceColor: importance.color
      ? NOTION_COLORS[importance.color] ?? NOTION_COLORS.default
      : null,
    description: null,
    url: String(page.url ?? ''),
    done,
  }
}

function demoTasks(): NotionTask[] {
  const today = new Date()
  const iso = (offset: number) => {
    const d = new Date(today)
    d.setDate(today.getDate() + offset)
    return d.toISOString().slice(0, 10)
  }

  return [
    {
      id: 'demo-1',
      title: 'Anniv Félix',
      date: iso(1),
      tag: 'Facile',
      tagColor: NOTION_COLORS.yellow,
      status: 'Pas Important',
      urgency: 'Pas urgent',
      urgencyColor: NOTION_COLORS.gray,
      importance: 'Pas Important',
      importanceColor: NOTION_COLORS.gray,
      description: 'Trouver les cadeaux et proposer sur le groupe snap',
      url: '',
      done: false,
    },
    {
      id: 'demo-2',
      title: 'Faire la lettre pour …',
      date: iso(1),
      tag: 'Flow',
      tagColor: NOTION_COLORS.blue,
      status: '⚠️Important',
      urgency: '⏰ Urgent',
      urgencyColor: NOTION_COLORS.red,
      importance: '⚠️Important',
      importanceColor: NOTION_COLORS.yellow,
      description: 'Écrire une lettre manuscrite et la poster cette semaine.',
      url: '',
      done: false,
    },
    {
      id: 'demo-3',
      title: 'Ranger ma chambre',
      date: iso(1),
      tag: 'Moyen',
      tagColor: NOTION_COLORS.orange,
      status: '⚠️Important',
      urgency: '⏰ Urgent',
      urgencyColor: NOTION_COLORS.red,
      importance: '⚠️Important',
      importanceColor: NOTION_COLORS.yellow,
      description: 'Trier le bureau, plier les vêtements et passer l’aspirateur.',
      url: '',
      done: false,
    },
    {
      id: 'demo-4',
      title: 'Réviser algo',
      date: iso(0),
      tag: 'Flow',
      tagColor: NOTION_COLORS.blue,
      status: 'Impactant',
      urgency: 'Habitude',
      urgencyColor: NOTION_COLORS.blue,
      importance: 'Impactant',
      importanceColor: NOTION_COLORS.green,
      description: 'Faire 2 exercices de complexité et revoir les structures de données.',
      url: '',
      done: false,
    },
    {
      id: 'demo-5',
      title: 'Courses',
      date: iso(-1),
      tag: 'Facile',
      tagColor: NOTION_COLORS.yellow,
      status: 'Pas Important',
      urgency: 'Pas urgent',
      urgencyColor: NOTION_COLORS.gray,
      importance: 'Pas Important',
      importanceColor: NOTION_COLORS.gray,
      description: null,
      url: '',
      done: false,
    },
    {
      id: 'demo-6',
      title: 'Appeler le dentiste',
      date: iso(3),
      tag: 'Moyen',
      tagColor: NOTION_COLORS.orange,
      status: '⚠️Important',
      urgency: '⏰ Urgent',
      urgencyColor: NOTION_COLORS.red,
      importance: '⚠️Important',
      importanceColor: NOTION_COLORS.yellow,
      description: 'Prendre rendez-vous pour un contrôle avant septembre.',
      url: '',
      done: false,
    },
  ]
}

export async function fetchNotionTasks(config: AppConfig): Promise<NotionTask[]> {
  if (config.demoMode || !config.notionToken || !config.databaseId) {
    return demoTasks()
  }

  const client = new Client({ auth: config.notionToken })
  const databaseId = extractDatabaseId(config.databaseId)
  const tasks: NotionTask[] = []
  let cursor: string | undefined

  do {
    const response = await client.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })

    for (const page of response.results) {
      if (!('properties' in page)) continue
      const task = parsePage(page as unknown as Record<string, unknown>, config)
      if (config.filters.hideCompleted && task.done) continue
      tasks.push(task)
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
  } while (cursor)

  tasks.sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title, 'fr')
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'fr')
  })

  return tasks
}

function blockToPlain(block: Record<string, unknown>): string {
  const type = String(block.type ?? '')
  const payload = block[type]
  if (!payload || typeof payload !== 'object') return ''
  const rich = (payload as { rich_text?: unknown }).rich_text
  if (Array.isArray(rich)) {
    return rich
      .map((t) =>
        t && typeof t === 'object' ? String((t as { plain_text?: string }).plain_text ?? '') : '',
      )
      .join('')
      .trim()
  }
  return ''
}

export async function fetchTaskDescription(
  config: AppConfig,
  pageId: string,
): Promise<string | null> {
  if (config.demoMode || !config.notionToken) {
    const demo = demoTasks().find((t) => t.id === pageId)
    return demo?.description ?? null
  }

  const client = new Client({ auth: config.notionToken })
  const parts: string[] = []
  let cursor: string | undefined

  do {
    const response = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 50,
    })

    for (const block of response.results) {
      if (!('type' in block)) continue
      const text = blockToPlain(block as unknown as Record<string, unknown>)
      if (text) parts.push(text)
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
  } while (cursor)

  const description = parts.join('\n\n').trim()
  return description || null
}

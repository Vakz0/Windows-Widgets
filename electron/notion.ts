import { Client } from '@notionhq/client'
import type {
  AppConfig,
  NotionConnectionTestResult,
  NotionDatabasePropertyInfo,
  NotionTask,
  ProjectSourceConfig,
  TaskPropertyMapping,
  TaskSourceFilters,
} from '../shared/types'
import { extractDatabaseId, extractPageId } from './config'

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

interface ParseContext {
  properties: TaskPropertyMapping
  filters: TaskSourceFilters
  sourceLabel?: string | null
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

function readPlainText(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as { type?: string; rich_text?: unknown }
  if (obj.type === 'rich_text') {
    const text = richTextToPlain(value).trim()
    return text || null
  }
  return null
}

function isDone(
  props: Record<string, unknown>,
  ctx: ParseContext,
  importanceName: string | null,
  workflowName: string | null,
): boolean {
  const checkboxName = ctx.properties.doneCheckbox
  if (checkboxName !== undefined) {
    if (checkboxName in props) {
      const checked = readCheckbox(props[checkboxName])
      if (checked != null) return checked
    }
    for (const [key, value] of Object.entries(props)) {
      const checked = readCheckbox(value)
      if (checked == null) continue
      if (checkboxName === '' || key === checkboxName) return checked
    }
  }

  const completedValues = ctx.filters.completedStatusValues
  const candidates = [workflowName, importanceName].filter(Boolean) as string[]
  for (const name of candidates) {
    if (
      completedValues.some((v) => v.toLowerCase() === name.toLowerCase())
    ) {
      return true
    }
  }

  return false
}

function parsePage(page: Record<string, unknown>, ctx: ParseContext): NotionTask {
  const props = (page.properties ?? {}) as Record<string, unknown>
  const { properties } = ctx

  const titleProp = props[properties.title]
  const dateProp = props[properties.date]
  const tagProp = props[properties.tag]
  const statusProp = props[properties.status]
  const urgencyProp = properties.urgency ? props[properties.urgency] : undefined
  const workflowProp = properties.workflowStatus
    ? props[properties.workflowStatus]
    : undefined
  const descriptionProp = properties.description
    ? props[properties.description]
    : undefined

  let title = titleToPlain(titleProp)
  if (!title) title = richTextToPlain(titleProp)
  if (!title) title = 'Sans titre'

  const tag = readSelect(tagProp)
  const importance = readSelect(statusProp)
  const urgency = readSelect(urgencyProp)
  const workflow = readSelect(workflowProp)
  const statusName = importance.name
  const done = isDone(props, ctx, statusName, workflow.name)

  const descriptionFromProperty = descriptionProp ? readPlainText(descriptionProp) : null

  return {
    id: String(page.id),
    title,
    date: readDate(dateProp),
    tag: tag.name,
    tagColor: tag.color ? NOTION_COLORS[tag.color] ?? NOTION_COLORS.default : null,
    status: workflow.name ?? statusName,
    urgency: urgency.name,
    urgencyColor: urgency.color ? NOTION_COLORS[urgency.color] ?? NOTION_COLORS.default : null,
    importance: importance.name,
    importanceColor: importance.color
      ? NOTION_COLORS[importance.color] ?? NOTION_COLORS.default
      : null,
    description: descriptionFromProperty,
    url: String(page.url ?? ''),
    done,
    sourceLabel: ctx.sourceLabel ?? null,
  }
}

function sortTasks(tasks: NotionTask[]): NotionTask[] {
  return tasks.sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title, 'fr')
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'fr')
  })
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
      sourceLabel: null,
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
      sourceLabel: null,
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
      sourceLabel: null,
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
      sourceLabel: null,
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
      sourceLabel: null,
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
      sourceLabel: null,
    },
  ]
}

async function queryDatabasePages(
  client: Client,
  databaseId: string,
  filter?: Parameters<Client['databases']['query']>[0]['filter'],
): Promise<Record<string, unknown>[]> {
  const pages: Record<string, unknown>[] = []
  let cursor: string | undefined

  do {
    const response = await client.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      filter,
    })

    for (const page of response.results) {
      if ('properties' in page) {
        pages.push(page as unknown as Record<string, unknown>)
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
  } while (cursor)

  return pages
}

async function fetchDatabaseTasks(
  client: Client,
  databaseId: string,
  ctx: ParseContext,
): Promise<NotionTask[]> {
  const pages = await queryDatabasePages(client, extractDatabaseId(databaseId))
  const tasks: NotionTask[] = []

  for (const page of pages) {
    const task = parsePage(page, ctx)
    if (ctx.filters.hideCompleted && task.done) continue
    tasks.push(task)
  }

  return tasks
}

async function fetchProjectSourceTasks(
  client: Client,
  source: ProjectSourceConfig,
): Promise<NotionTask[]> {
  const projectId = extractPageId(source.projectPageId)
  const filter = {
    property: source.relationProperty,
    relation: { contains: projectId },
  }

  const pages = await queryDatabasePages(
    client,
    extractDatabaseId(source.databaseId),
    filter,
  )

  const ctx: ParseContext = {
    properties: source.properties,
    filters: source.filters,
    sourceLabel: source.label,
  }

  const tasks: NotionTask[] = []
  for (const page of pages) {
    const task = parsePage(page, ctx)
    if (source.filters.hideCompleted && task.done) continue
    tasks.push(task)
  }

  return tasks
}

export async function fetchNotionTasks(config: AppConfig): Promise<NotionTask[]> {
  if (config.demoMode || !config.notionToken || !config.databaseId) {
    return demoTasks()
  }

  const client = new Client({ auth: config.notionToken })
  const primaryCtx: ParseContext = {
    properties: config.properties,
    filters: config.filters,
    sourceLabel: null,
  }

  const tasks: NotionTask[] = []
  const seen = new Set<string>()

  try {
    const primary = await fetchDatabaseTasks(client, config.databaseId, primaryCtx)
    for (const task of primary) {
      if (seen.has(task.id)) continue
      seen.add(task.id)
      tasks.push(task)
    }
  } catch (err) {
    console.error('Failed to fetch primary Notion database', err)
    throw err
  }

  for (const source of config.projectSources ?? []) {
    try {
      const projectTasks = await fetchProjectSourceTasks(client, source)
      for (const task of projectTasks) {
        if (seen.has(task.id)) continue
        seen.add(task.id)
        tasks.push(task)
      }
    } catch (err) {
      console.error(`Failed to fetch project source "${source.label}"`, err)
    }
  }

  return sortTasks(tasks)
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

function databaseTitle(db: { title?: Array<{ plain_text?: string }> }): string {
  if (!Array.isArray(db.title)) return 'Database'
  return db.title.map((t) => t.plain_text ?? '').join('').trim() || 'Database'
}

function suggestPropertyMapping(
  props: NotionDatabasePropertyInfo[],
): Partial<TaskPropertyMapping> {
  const byType = (type: string) => props.filter((p) => p.type === type)
  const title = byType('title')[0]?.name
  const date = byType('date')[0]?.name
  const selects = [...byType('select'), ...byType('multi_select'), ...byType('status')]
  const checkboxes = byType('checkbox')

  const suggested: Partial<TaskPropertyMapping> = {}
  if (title) suggested.title = title
  if (date) suggested.date = date
  if (selects[0]) suggested.tag = selects[0].name
  if (selects[1]) suggested.status = selects[1].name
  if (selects[2]) suggested.urgency = selects[2].name
  if (checkboxes[0]) suggested.doneCheckbox = checkboxes[0].name
  return suggested
}

/**
 * Test Notion credentials against a database (retrieve schema).
 * Token is only used in the main process — never returned.
 */
export async function testNotionConnection(opts: {
  token: string
  databaseId: string
}): Promise<NotionConnectionTestResult> {
  const token = opts.token.trim()
  const databaseId = opts.databaseId.trim()
  if (!token) {
    return { ok: false, message: 'Token d’intégration manquant.' }
  }
  if (!databaseId) {
    return { ok: false, message: 'URL ou ID de base manquant.' }
  }

  try {
    const client = new Client({ auth: token })
    const dbId = extractDatabaseId(databaseId)
    const db = await client.databases.retrieve({ database_id: dbId })
    const rawProps =
      'properties' in db && db.properties && typeof db.properties === 'object'
        ? (db.properties as Record<string, { type?: string }>)
        : {}

    const properties: NotionDatabasePropertyInfo[] = Object.entries(rawProps).map(
      ([name, prop]) => ({
        name,
        type: String(prop?.type ?? 'unknown'),
      }),
    )

    return {
      ok: true,
      message: 'Connexion réussie.',
      databaseTitle: databaseTitle(db as { title?: Array<{ plain_text?: string }> }),
      properties,
      suggestedProperties: suggestPropertyMapping(properties),
    }
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Échec de la connexion Notion.'
    console.error('Notion connection test failed', err)
    return { ok: false, message }
  }
}

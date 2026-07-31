import { Client } from '@notionhq/client'
import type {
  AppConfig,
  CreateTaskPayload,
  CreateTaskResult,
  DeleteTaskPayload,
  DeleteTaskResult,
  NotionConnectionTestResult,
  NotionDatabasePropertyInfo,
  NotionPropertyOption,
  NotionTask,
  ProjectSourceConfig,
  TaskPropertyMapping,
  TaskSourceFilters,
  UpdateTaskFieldPayload,
  UpdateTaskFieldResult,
} from '../shared/types'
import { extractDatabaseId, extractPageId } from './config'

/** Couleur de texte/pastille et fond de carte (thème sombre Notion), par couleur de propriété. */
const NOTION_COLOR_STYLES: Record<string, { fg: string; bg: string }> = {
  default: { fg: '#9B9A97', bg: '#252525' },
  gray: { fg: '#9B9A97', bg: '#373737' },
  brown: { fg: '#C4A484', bg: '#47392f' },
  orange: { fg: '#E07A3D', bg: '#5c3b23' },
  yellow: { fg: '#D4B483', bg: '#56452f' },
  green: { fg: '#4DAD7F', bg: '#2c3c35' },
  blue: { fg: '#6BA3D6', bg: '#28405c' },
  purple: { fg: '#9A7FD1', bg: '#492f64' },
  pink: { fg: '#D97BA8', bg: '#4e2c3c' },
  red: { fg: '#E05C5C', bg: '#522e2a' },
}

/** Style pour une couleur de propriété Notion donnée, ou `null` si la propriété n'a pas de couleur. */
function colorStyle(colorName: string | null): { fg: string; bg: string } | null {
  if (!colorName) return null
  return NOTION_COLOR_STYLES[colorName] ?? NOTION_COLOR_STYLES.default
}

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return fallback
}

interface ParseContext {
  properties: TaskPropertyMapping
  filters: TaskSourceFilters
  sourceLabel?: string | null
  databaseId: string
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
  const tagStyle = colorStyle(tag.color)
  const urgencyStyle = colorStyle(urgency.color)
  const importanceStyle = colorStyle(importance.color)

  return {
    id: String(page.id),
    title,
    date: readDate(dateProp),
    tag: tag.name,
    tagColor: tagStyle?.fg ?? null,
    status: workflow.name ?? statusName,
    urgency: urgency.name,
    urgencyColor: urgencyStyle?.fg ?? null,
    importance: importance.name,
    importanceColor: importanceStyle?.fg ?? null,
    importanceBg: importanceStyle?.bg ?? null,
    description: descriptionFromProperty,
    url: String(page.url ?? ''),
    done,
    sourceLabel: ctx.sourceLabel ?? null,
    databaseId: ctx.databaseId,
    propertyMap: ctx.properties,
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

/** Base fictive et mapping de propriétés utilisés par les tâches de démo (pour l'édition). */
const DEMO_DATABASE_ID = 'demo-database'
const DEMO_PROPERTY_MAP: TaskPropertyMapping = {
  title: 'Name',
  date: 'Date',
  tag: 'Tags',
  status: 'Priority',
  urgency: 'Urgency',
  doneCheckbox: 'Done',
}

/** Options de sélection factices, alignées sur les libellés utilisés dans `demoTasks()`. */
const DEMO_OPTIONS: Record<string, Array<{ name: string; color: string }>> = {
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

function toOptionList(raw: Array<{ name: string; color?: string | null }>): NotionPropertyOption[] {
  return raw.map((o) => ({ name: o.name, color: colorStyle(o.color ?? null)?.fg ?? null }))
}

/** Store mutable en mode démo pour que les éditions survivent au refresh de session. */
let demoStore: NotionTask[] | null = null

function getDemoTasks(): NotionTask[] {
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
    databaseId: extractDatabaseId(source.databaseId),
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
    const tasks = getDemoTasks()
    if (config.filters.hideCompleted) return tasks.filter((t) => !t.done)
    return tasks
  }

  const client = new Client({ auth: config.notionToken })
  const primaryCtx: ParseContext = {
    properties: config.properties,
    filters: config.filters,
    sourceLabel: null,
    databaseId: extractDatabaseId(config.databaseId),
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
    const demo = getDemoTasks().find((t) => t.id === pageId)
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
  const statusProps = byType('status')
  const selects = [...byType('select'), ...byType('multi_select')]
  const checkboxes = byType('checkbox')

  const suggested: Partial<TaskPropertyMapping> = {}
  if (title) suggested.title = title
  if (date) suggested.date = date
  if (selects[0]) suggested.tag = selects[0].name
  if (selects[1]) suggested.status = selects[1].name
  if (selects[2]) suggested.urgency = selects[2].name
  if (statusProps[0]) suggested.workflowStatus = statusProps[0].name
  if (checkboxes[0]) suggested.doneCheckbox = checkboxes[0].name
  return suggested
}

type DbProp = {
  id?: string
  type?: string
  select?: { options?: Array<{ name?: string; color?: string }> }
  multi_select?: { options?: Array<{ name?: string; color?: string }> }
  status?: { options?: Array<{ name?: string; color?: string }> }
}

function optionsFromDbProp(prop: DbProp | undefined): NotionPropertyOption[] {
  if (!prop) return []
  const raw =
    prop.type === 'select'
      ? prop.select?.options
      : prop.type === 'multi_select'
        ? prop.multi_select?.options
        : prop.type === 'status'
          ? prop.status?.options
          : undefined
  if (!Array.isArray(raw)) return []
  return toOptionList(
    raw
      .filter((o): o is { name: string; color?: string } => Boolean(o?.name))
      .map((o) => ({ name: o.name, color: o.color ?? null })),
  )
}

async function retrieveDbProperties(
  client: Client,
  databaseId: string,
): Promise<Record<string, DbProp>> {
  const db = await client.databases.retrieve({
    database_id: extractDatabaseId(databaseId),
  })
  if (!('properties' in db) || !db.properties || typeof db.properties !== 'object') {
    return {}
  }
  return db.properties as Record<string, DbProp>
}

/** Options d'une propriété select/status/multi_select (démo ou schéma Notion). */
export async function fetchPropertyOptions(
  config: AppConfig,
  databaseId: string,
  propertyName: string,
): Promise<NotionPropertyOption[]> {
  if (!propertyName) return []
  if (config.demoMode || !config.notionToken || databaseId === DEMO_DATABASE_ID) {
    return toOptionList(DEMO_OPTIONS[propertyName] ?? [])
  }

  try {
    const client = new Client({ auth: config.notionToken })
    const props = await retrieveDbProperties(client, databaseId)
    return optionsFromDbProp(props[propertyName])
  } catch (err) {
    console.error('Failed to fetch property options', err)
    return []
  }
}

function richTextValue(text: string | null) {
  if (!text) return []
  return [{ type: 'text' as const, text: { content: text } }]
}

function buildPropertyWrite(
  type: string,
  value: string | boolean | null,
): Record<string, unknown> | null {
  if (type === 'title') {
    return { title: richTextValue(typeof value === 'string' ? value : null) }
  }
  if (type === 'rich_text') {
    return { rich_text: richTextValue(typeof value === 'string' ? value : null) }
  }
  if (type === 'date') {
    if (value == null || value === '') return { date: null }
    return { date: { start: String(value) } }
  }
  if (type === 'checkbox') {
    return { checkbox: Boolean(value) }
  }
  if (type === 'select') {
    if (value == null || value === '') return { select: null }
    return { select: { name: String(value) } }
  }
  if (type === 'multi_select') {
    if (value == null || value === '') return { multi_select: [] }
    return { multi_select: [{ name: String(value) }] }
  }
  if (type === 'status') {
    if (value == null || value === '') return { status: null }
    return { status: { name: String(value) } }
  }
  return null
}

function bgFromFg(fg: string | null): string | null {
  if (!fg) return null
  for (const style of Object.values(NOTION_COLOR_STYLES)) {
    if (style.fg === fg) return style.bg
  }
  return null
}

function applyLocalFieldUpdate(
  task: NotionTask,
  propertyName: string,
  value: string | boolean | null,
  options?: NotionPropertyOption[],
): NotionTask {
  const next = { ...task }
  const map = task.propertyMap
  const pickColor = (name: string | null) =>
    name ? (options?.find((o) => o.name === name)?.color ?? null) : null

  if (propertyName === map.title && typeof value === 'string') {
    next.title = value.trim() || 'Sans titre'
  } else if (propertyName === map.date) {
    next.date = typeof value === 'string' && value ? value.slice(0, 10) : null
  } else if (propertyName === map.tag) {
    next.tag = typeof value === 'string' && value ? value : null
    next.tagColor = pickColor(next.tag)
  } else if (propertyName === map.status) {
    next.importance = typeof value === 'string' && value ? value : null
    next.importanceColor = pickColor(next.importance)
    next.importanceBg = bgFromFg(next.importanceColor)
    if (!map.workflowStatus) next.status = next.importance
  } else if (map.urgency && propertyName === map.urgency) {
    next.urgency = typeof value === 'string' && value ? value : null
    next.urgencyColor = pickColor(next.urgency)
  } else if (
    propertyName === '__done__' ||
    (map.doneCheckbox !== undefined && propertyName === map.doneCheckbox)
  ) {
    next.done = Boolean(value)
  } else if (map.workflowStatus && propertyName === map.workflowStatus) {
    next.status = typeof value === 'string' && value ? value : null
  } else if (map.description && propertyName === map.description) {
    next.description = typeof value === 'string' && value.trim() ? value : null
  } else if (propertyName === '__page_body__') {
    next.description = typeof value === 'string' && value.trim() ? value : null
  }

  return next
}

async function updatePageBodyDescription(
  client: Client,
  pageId: string,
  text: string | null,
): Promise<void> {
  const content = (text ?? '').trim()
  const listed = await client.blocks.children.list({ block_id: pageId, page_size: 10 })
  const first = listed.results.find((b) => 'type' in b && b.type === 'paragraph')

  if (first && 'id' in first) {
    await client.blocks.update({
      block_id: first.id,
      paragraph: { rich_text: richTextValue(content || null) },
    })
    return
  }

  if (content) {
    await client.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: richTextValue(content) },
        },
      ],
    })
  }
}

/**
 * Résout comment écrire le statut « terminé » :
 * 1. propriété checkbox mappée (ou auto-détectée si `doneCheckbox` est `""`)
 * 2. sinon statut workflow + valeurs « terminé » de la config
 */
function resolveDoneWrite(
  task: NotionTask,
  config: AppConfig,
  done: boolean,
  dbProps: Record<string, DbProp>,
): { propertyName: string; value: string | boolean | null } | { error: string } {
  const map = task.propertyMap
  const configured = map.doneCheckbox

  // Nom explicite non vide → écrire directement dessus.
  if (typeof configured === 'string' && configured.length > 0) {
    return { propertyName: configured, value: done }
  }

  // `doneCheckbox` absent ou `""` → première case à cocher de la base.
  // Chez Notion le nom peut être vide : on écrit alors via l’id de propriété.
  if (configured === undefined || configured === '') {
    const autoEntry = Object.entries(dbProps).find(([, p]) => p.type === 'checkbox')
    if (autoEntry) {
      const [name, prop] = autoEntry
      return { propertyName: name || prop.id || name, value: done }
    }
  }

  const workflow = map.workflowStatus
  if (workflow) {
    const filters =
      (task.sourceLabel
        ? config.projectSources?.find((s) => s.label === task.sourceLabel)?.filters
        : null) ?? config.filters
    const completed = filters.completedStatusValues
    if (done) {
      if (!completed.length) {
        return { error: 'Aucune valeur « terminé » configurée pour le statut.' }
      }
      return { propertyName: workflow, value: completed[0] }
    }
    // Rouvrir : première option status/select qui n’est pas une valeur terminée
    const prop = dbProps[workflow]
    const options = optionsFromDbProp(prop)
    const reopen =
      options.find((o) => !completed.some((c) => c.toLowerCase() === o.name.toLowerCase()))
        ?.name ?? null
    return { propertyName: workflow, value: reopen }
  }

  // Dernier recours : case « Done » si elle existe dans le schéma
  if (dbProps.Done?.type === 'checkbox') {
    return { propertyName: 'Done', value: done }
  }

  return {
    error:
      'Impossible de modifier le statut : aucune case à cocher trouvée dans cette base Notion.',
  }
}

/** Met à jour une propriété (ou le corps de page) et renvoie la tâche recalculée. */
export async function updateTaskField(
  config: AppConfig,
  payload: UpdateTaskFieldPayload,
  task: NotionTask,
): Promise<UpdateTaskFieldResult> {
  let { pageId, propertyName, value } = payload
  if (!pageId || !propertyName) {
    return { ok: false, message: 'Identifiant ou propriété manquant.' }
  }

  if (config.demoMode || !config.notionToken || pageId.startsWith('demo-')) {
    const store = getDemoTasks()
    const idx = store.findIndex((t) => t.id === pageId)
    if (idx < 0) return { ok: false, message: 'Tâche introuvable.' }
    if (propertyName === '__done__') {
      const updated = { ...store[idx], done: Boolean(value) }
      store[idx] = updated
      return { ok: true, task: updated }
    }
    const options =
      propertyName === '__page_body__'
        ? []
        : toOptionList(DEMO_OPTIONS[propertyName] ?? [])
    const updated = applyLocalFieldUpdate(store[idx], propertyName, value, options)
    store[idx] = updated
    return { ok: true, task: updated }
  }

  try {
    const client = new Client({ auth: config.notionToken })

    if (propertyName === '__page_body__') {
      await updatePageBodyDescription(
        client,
        pageId,
        typeof value === 'string' ? value : null,
      )
      const updated = applyLocalFieldUpdate(task, propertyName, value)
      return { ok: true, task: updated }
    }

    const props = await retrieveDbProperties(client, payload.databaseId || task.databaseId)

    if (propertyName === '__done__') {
      const resolved = resolveDoneWrite(task, config, Boolean(value), props)
      if ('error' in resolved) return { ok: false, message: resolved.error }
      propertyName = resolved.propertyName
      value = resolved.value
    }

    // Clé = nom (parfois vide) ou id Notion — chercher les deux.
    const prop =
      props[propertyName] ??
      Object.values(props).find((p) => p.id === propertyName)
    if (!prop?.type) {
      return { ok: false, message: `Propriété « ${propertyName} » introuvable.` }
    }
    // Préférer l'id si le nom est vide (API Notion n'aime pas la clé "").
    const writeKey = propertyName || prop.id || propertyName
    if (!writeKey) {
      return { ok: false, message: 'Propriété sans nom ni id utilisable.' }
    }

    const write = buildPropertyWrite(prop.type, value)
    if (!write) {
      return { ok: false, message: `Type de propriété non supporté : ${prop.type}` }
    }

    const response = await client.pages.update({
      page_id: pageId,
      properties: { [writeKey]: write },
    })

    const ctx: ParseContext = {
      properties: task.propertyMap,
      filters:
        (task.sourceLabel
          ? config.projectSources?.find((s) => s.label === task.sourceLabel)?.filters
          : null) ?? config.filters,
      sourceLabel: task.sourceLabel ?? null,
      databaseId: task.databaseId,
    }
    const updated = parsePage(response as unknown as Record<string, unknown>, ctx)
    // Le corps de page n'est pas dans la réponse pages.update — on conserve la description locale.
    if (updated.description == null && task.description != null) {
      updated.description = task.description
    }
    return { ok: true, task: updated }
  } catch (err) {
    const message = errorMessage(err, 'Échec de la mise à jour Notion.')
    console.error('Failed to update task field', err)
    return { ok: false, message }
  }
}

/** Crée une tâche dans la base principale (titre + date). */
export async function createTask(
  config: AppConfig,
  payload: CreateTaskPayload,
): Promise<CreateTaskResult> {
  const title = payload.title?.trim()
  if (!title) return { ok: false, message: 'Titre requis.' }
  const date = payload.date?.slice(0, 10)
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: 'Date invalide.' }
  }

  if (config.demoMode || !config.notionToken || !config.databaseId) {
    const task: NotionTask = {
      id: `demo-${Date.now()}`,
      title,
      date,
      tag: null,
      tagColor: null,
      status: null,
      urgency: null,
      urgencyColor: null,
      importance: null,
      importanceColor: null,
      importanceBg: null,
      description: null,
      url: '',
      done: false,
      sourceLabel: null,
      databaseId: DEMO_DATABASE_ID,
      propertyMap: DEMO_PROPERTY_MAP,
    }
    getDemoTasks().push(task)
    return { ok: true, task }
  }

  try {
    const client = new Client({ auth: config.notionToken })
    const databaseId = extractDatabaseId(config.databaseId)
    const map = config.properties
    const props = await retrieveDbProperties(client, databaseId)

    const titleProp = props[map.title]
    if (!titleProp?.type) {
      return { ok: false, message: `Propriété titre « ${map.title} » introuvable.` }
    }

    const properties: Record<string, unknown> = {}
    const titleWrite = buildPropertyWrite(titleProp.type, title)
    if (!titleWrite) {
      return { ok: false, message: `Type de titre non supporté : ${titleProp.type}` }
    }
    properties[map.title || titleProp.id || ''] = titleWrite

    const dateProp = props[map.date]
    if (dateProp?.type) {
      const dateWrite = buildPropertyWrite(dateProp.type, date)
      if (dateWrite) {
        properties[map.date || dateProp.id || ''] = dateWrite
      }
    }

    const response = await client.pages.create({
      parent: { database_id: databaseId },
      properties: properties as Parameters<Client['pages']['create']>[0]['properties'],
    })

    const ctx: ParseContext = {
      properties: map,
      filters: config.filters,
      sourceLabel: null,
      databaseId,
    }
    const task = parsePage(response as unknown as Record<string, unknown>, ctx)
    return { ok: true, task }
  } catch (err) {
    const message = errorMessage(err, 'Échec de la création Notion.')
    console.error('Failed to create task', err)
    return { ok: false, message }
  }
}

/** Archive une page Notion (ou la retire du store démo). */
export async function deleteTask(
  config: AppConfig,
  payload: DeleteTaskPayload,
): Promise<DeleteTaskResult> {
  const pageId = payload.pageId?.trim()
  if (!pageId) return { ok: false, message: 'Identifiant manquant.' }

  if (config.demoMode || !config.notionToken || pageId.startsWith('demo-')) {
    const store = getDemoTasks()
    const idx = store.findIndex((t) => t.id === pageId)
    if (idx < 0) return { ok: false, message: 'Tâche introuvable.' }
    store.splice(idx, 1)
    return { ok: true }
  }

  try {
    const client = new Client({ auth: config.notionToken })
    await client.pages.update({
      page_id: pageId,
      archived: true,
    })
    return { ok: true }
  } catch (err) {
    const message = errorMessage(err, 'Échec de la suppression Notion.')
    console.error('Failed to delete task', err)
    return { ok: false, message }
  }
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
    const message = errorMessage(err, 'Échec de la connexion Notion.')
    console.error('Notion connection test failed', err)
    return { ok: false, message }
  }
}

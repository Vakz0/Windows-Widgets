import type {
  NotionTask,
  TaskPropertyMapping,
  TaskSourceFilters,
} from '../../shared/types'

/** Couleur de texte/pastille et fond de carte (thème sombre Notion), par couleur de propriété. */
export const NOTION_COLOR_STYLES: Record<string, { fg: string; bg: string }> = {
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
export function colorStyle(colorName: string | null): { fg: string; bg: string } | null {
  if (!colorName) return null
  return NOTION_COLOR_STYLES[colorName] ?? NOTION_COLOR_STYLES.default
}

export interface ParseContext {
  properties: TaskPropertyMapping
  filters: TaskSourceFilters
  sourceLabel?: string | null
  databaseId: string
}

export function richTextArrayToPlain(
  value: unknown,
  key: 'rich_text' | 'title',
): string {
  if (!value || typeof value !== 'object') return ''
  const parts = (value as Record<string, unknown>)[key]
  if (!Array.isArray(parts)) return ''
  return parts
    .map((t) =>
      t && typeof t === 'object'
        ? String((t as { plain_text?: string }).plain_text ?? '')
        : '',
    )
    .join('')
}

function richTextToPlain(value: unknown): string {
  return richTextArrayToPlain(value, 'rich_text')
}

function titleToPlain(value: unknown): string {
  return richTextArrayToPlain(value, 'title')
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
      if (checked !== null && checked !== undefined) return checked
    }
    for (const [key, value] of Object.entries(props)) {
      const checked = readCheckbox(value)
      if (checked === null || checked === undefined) continue
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

export function parsePage(page: Record<string, unknown>, ctx: ParseContext): NotionTask {
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

export function sortTasks(tasks: NotionTask[]): NotionTask[] {
  return tasks.sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title, 'fr')
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'fr')
  })
}

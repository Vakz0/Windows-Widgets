import { Client } from '@notionhq/client'
import type {
  AppConfig,
  NotionDatabasePropertyInfo,
  NotionPropertyOption,
  TaskPropertyMapping,
} from '../../shared/types'
import { extractDatabaseId } from '../../shared/notionIds'
import { DEMO_DATABASE_ID, DEMO_OPTIONS, toOptionList } from './demo'
import { richTextArrayToPlain } from './parse'

export function databaseTitle(db: { title?: Array<{ plain_text?: string }> }): string {
  return richTextArrayToPlain(db, 'title').trim() || 'Database'
}

export function suggestPropertyMapping(
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

export type DbProp = {
  id?: string
  type?: string
  select?: { options?: Array<{ name?: string; color?: string }> }
  multi_select?: { options?: Array<{ name?: string; color?: string }> }
  status?: { options?: Array<{ name?: string; color?: string }> }
}

export function optionsFromDbProp(prop: DbProp | undefined): NotionPropertyOption[] {
  if (!prop) return []
  let raw: Array<{ name?: string; color?: string }> | undefined
  if (prop.type === 'select') raw = prop.select?.options
  else if (prop.type === 'multi_select') raw = prop.multi_select?.options
  else if (prop.type === 'status') raw = prop.status?.options
  if (!Array.isArray(raw)) return []
  return toOptionList(
    raw
      .filter((o): o is { name: string; color?: string } => Boolean(o?.name))
      .map((o) => ({ name: o.name, color: o.color ?? null })),
  )
}

export async function retrieveDbProperties(
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

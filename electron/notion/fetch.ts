import { Client } from '@notionhq/client'
import type {
  AppConfig,
  NotionTask,
  ProjectSourceConfig,
} from '../../shared/types'
import { extractDatabaseId, extractPageId } from '../../shared/notionIds'
import { getDemoTasks } from './demo'
import { type ParseContext, parsePage, richTextArrayToPlain, sortTasks } from './parse'

async function queryDatabasePages(
  client: Client,
  databaseId: string,
  filter?: Parameters<Client['databases']['query']>[0]['filter'],
): Promise<Record<string, unknown>[]> {
  const pages: Record<string, unknown>[] = []
  let cursor: string | undefined

  // intentional: Notion cursor pagination must stay sequential
  do {
    const response = await client.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      filter,
    })

    pages.push(
      ...response.results
        .filter((page) => 'properties' in page)
        .map((page) => page as unknown as Record<string, unknown>),
    )

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

  const projectBatches: NotionTask[][] = []
  // intentional rate-limit: Notion API — one project source at a time
  for (const source of config.projectSources ?? []) {
    try {
      projectBatches.push(await fetchProjectSourceTasks(client, source))
    } catch (err) {
      console.error(`Failed to fetch project source "${source.label}"`, err)
    }
  }
  for (const task of projectBatches.flat()) {
    if (seen.has(task.id)) continue
    seen.add(task.id)
    tasks.push(task)
  }

  return sortTasks(tasks)
}

function blockToPlain(block: Record<string, unknown>): string {
  const type = String(block.type ?? '')
  const payload = block[type]
  return richTextArrayToPlain(payload, 'rich_text').trim()
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

  // intentional: Notion cursor pagination must stay sequential
  do {
    const response = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 50,
    })

    parts.push(
      ...response.results
        .filter((block) => 'type' in block)
        .map((block) => blockToPlain(block as unknown as Record<string, unknown>))
        .filter(Boolean),
    )

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
  } while (cursor)

  const description = parts.join('\n\n').trim()
  return description || null
}

import { Client } from '@notionhq/client'
import type {
  AppConfig,
  CreateTaskPayload,
  CreateTaskResult,
  DeleteTaskPayload,
  DeleteTaskResult,
  NotionPropertyOption,
  NotionTask,
  UpdateTaskFieldPayload,
  UpdateTaskFieldResult,
} from '../../shared/types'
import { extractDatabaseId } from '../config'
import { errorMessage } from './client'
import {
  DEMO_DATABASE_ID,
  DEMO_OPTIONS,
  DEMO_PROPERTY_MAP,
  getDemoTasks,
  toOptionList,
} from './demo'
import { type ParseContext, NOTION_COLOR_STYLES, parsePage } from './parse'
import {
  type DbProp,
  optionsFromDbProp,
  retrieveDbProperties,
} from './properties'

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
    if (value === null || value === undefined || value === '') return { date: null }
    return { date: { start: String(value) } }
  }
  if (type === 'checkbox') {
    return { checkbox: Boolean(value) }
  }
  if (type === 'select') {
    if (value === null || value === undefined || value === '') return { select: null }
    return { select: { name: String(value) } }
  }
  if (type === 'multi_select') {
    if (value === null || value === undefined || value === '') return { multi_select: [] }
    return { multi_select: [{ name: String(value) }] }
  }
  if (type === 'status') {
    if (value === null || value === undefined || value === '') return { status: null }
    return { status: { name: String(value) } }
  }
  return null
}

const FG_TO_BG = new Map(
  Object.values(NOTION_COLOR_STYLES).map((style) => [style.fg, style.bg]),
)

function bgFromFg(fg: string | null): string | null {
  if (!fg) return null
  return FG_TO_BG.get(fg) ?? null
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
    const completedLower = new Set(completed.map((c) => c.toLowerCase()))
    const reopen =
      options.find((o) => !completedLower.has(o.name.toLowerCase()))?.name ?? null
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
    if ((updated.description === null || updated.description === undefined) && (task.description !== null && task.description !== undefined)) {
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

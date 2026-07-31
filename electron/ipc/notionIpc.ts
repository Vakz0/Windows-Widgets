import { ipcMain } from 'electron'
import {
  createTask,
  deleteTask,
  fetchPropertyOptions,
  fetchTaskDescription,
  testNotionConnection,
  updateTaskField,
} from '../notion'
import { hasValidNotionCredentials, saveConfig } from '../config'
import type {
  CreateTaskPayload,
  CreateTaskResult,
  DeleteTaskPayload,
  DeleteTaskResult,
  NotionSettingsPatch,
  TaskPropertyMapping,
  TaskSourceFilters,
  UpdateTaskFieldPayload,
  UpdateTaskFieldResult,
} from '../../shared/types'
import type { IpcDeps } from './types'

export function registerNotionIpc(deps: IpcDeps): void {
  ipcMain.handle('get-tasks', async () => {
    if (!deps.hasService('notion')) return []
    if (!deps.getTasksCache().length) await deps.refreshNotion(true)
    return deps.getTasksCache()
  })
  ipcMain.handle('refresh-tasks', async () => deps.refreshNotion(true))
  ipcMain.handle('get-task-description', async (_e, pageId: string) => {
    if (!pageId || !deps.hasService('notion')) return null
    const tasksCache = deps.getTasksCache()
    const cached = tasksCache.find((t) => t.id === pageId)
    if (cached?.description) return cached.description
    try {
      const description = await fetchTaskDescription(deps.getConfig(), pageId)
      if (cached) cached.description = description
      return description
    } catch (err) {
      console.error('Failed to fetch task description', err)
      return null
    }
  })
  ipcMain.handle(
    'get-property-options',
    async (_e, databaseId: string, propertyName: string) => {
      if (!deps.hasService('notion') || !databaseId || !propertyName) return []
      return fetchPropertyOptions(deps.getConfig(), databaseId, propertyName)
    },
  )
  ipcMain.handle(
    'update-task-field',
    async (_e, payload: UpdateTaskFieldPayload): Promise<UpdateTaskFieldResult> => {
      if (!deps.hasService('notion') || !payload?.pageId) {
        return { ok: false, message: 'Service Notion indisponible.' }
      }
      const tasksCache = deps.getTasksCache()
      const config = deps.getConfig()
      const cached = tasksCache.find((t) => t.id === payload.pageId)
      if (!cached) return { ok: false, message: 'Tâche introuvable.' }

      const result = await updateTaskField(config, payload, cached)
      if (!result.ok || !result.task) return result

      const hideDone =
        (cached.sourceLabel
          ? config.projectSources?.find((s) => s.label === cached.sourceLabel)?.filters
              .hideCompleted
          : config.filters.hideCompleted) ?? config.filters.hideCompleted

      if (hideDone && result.task.done) {
        deps.setTasksCache(tasksCache.filter((t) => t.id !== result.task!.id))
      } else {
        deps.setTasksCache(tasksCache.map((t) => (t.id === result.task!.id ? result.task! : t)))
      }
      deps.sendTo(deps.notionWidgetIds(), 'tasks-updated', deps.getTasksCache())
      return result
    },
  )
  ipcMain.handle(
    'create-task',
    async (_e, payload: CreateTaskPayload): Promise<CreateTaskResult> => {
      if (!deps.hasService('notion')) {
        return { ok: false, message: 'Service Notion indisponible.' }
      }
      const result = await createTask(deps.getConfig(), payload)
      if (!result.ok || !result.task) return result
      const tasksCache = deps.getTasksCache()
      deps.setTasksCache([...tasksCache.filter((t) => t.id !== result.task!.id), result.task])
      deps.sendTo(deps.notionWidgetIds(), 'tasks-updated', deps.getTasksCache())
      return result
    },
  )
  ipcMain.handle(
    'delete-task',
    async (_e, payload: DeleteTaskPayload): Promise<DeleteTaskResult> => {
      if (!deps.hasService('notion') || !payload?.pageId) {
        return { ok: false, message: 'Service Notion indisponible.' }
      }
      const result = await deleteTask(deps.getConfig(), payload)
      if (!result.ok) return result
      deps.setTasksCache(deps.getTasksCache().filter((t) => t.id !== payload.pageId))
      deps.sendTo(deps.notionWidgetIds(), 'tasks-updated', deps.getTasksCache())
      return result
    },
  )
  ipcMain.handle(
    'test-notion-connection',
    async (
      _e,
      payload: { notionToken?: string; databaseId?: string },
    ) => {
      const config = deps.getConfig()
      const token =
        typeof payload?.notionToken === 'string' && payload.notionToken.trim()
          ? payload.notionToken.trim()
          : config.notionToken
      const databaseId =
        typeof payload?.databaseId === 'string' && payload.databaseId.trim()
          ? payload.databaseId.trim()
          : config.databaseId
      return testNotionConnection({ token: token ?? '', databaseId: databaseId ?? '' })
    },
  )
  ipcMain.handle(
    'save-notion-settings',
    async (_e, patch: NotionSettingsPatch) => {
      if (!patch || typeof patch !== 'object') {
        return { ok: false, config: deps.toPublicConfig(), message: 'Payload invalide.' }
      }

      const config = deps.getConfig()

      if (typeof patch.notionToken === 'string' && patch.notionToken.trim()) {
        config.notionToken = patch.notionToken.trim()
      }
      if (typeof patch.databaseId === 'string') {
        config.databaseId = patch.databaseId.trim()
      }
      if (patch.properties && typeof patch.properties === 'object') {
        const next: TaskPropertyMapping = { ...config.properties }
        for (const key of [
          'title',
          'date',
          'tag',
          'status',
          'urgency',
          'doneCheckbox',
          'workflowStatus',
          'description',
        ] as const) {
          const value = patch.properties[key]
          if (typeof value === 'string') {
            if (key === 'urgency' || key === 'doneCheckbox' || key === 'workflowStatus' || key === 'description') {
              next[key] = value
            } else if (value.trim()) {
              next[key] = value
            }
          }
        }
        config.properties = next
      }
      if (patch.filters && typeof patch.filters === 'object') {
        const next: TaskSourceFilters = {
          hideCompleted: config.filters.hideCompleted,
          completedStatusValues: [...(config.filters.completedStatusValues ?? [])],
        }
        if (typeof patch.filters.hideCompleted === 'boolean') {
          next.hideCompleted = patch.filters.hideCompleted
        }
        if (Array.isArray(patch.filters.completedStatusValues)) {
          next.completedStatusValues = patch.filters.completedStatusValues
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim())
            .filter(Boolean)
        }
        config.filters = next
      }

      if (hasValidNotionCredentials(config)) {
        config.demoMode = false
      }

      deps.setConfig(config)
      await saveConfig(config)
      deps.applyPowerMode(true)
      if (deps.hasService('notion')) void deps.refreshNotion(true)

      return {
        ok: true,
        config: deps.toPublicConfig(),
        message: hasValidNotionCredentials(config)
          ? 'Paramètres Notion enregistrés.'
          : 'Enregistré — ajoutez un token et une base pour quitter le mode démo.',
      }
    },
  )
}

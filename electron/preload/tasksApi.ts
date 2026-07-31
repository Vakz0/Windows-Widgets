import { ipcRenderer } from 'electron'
import type {
  CreateTaskPayload,
  CreateTaskResult,
  DeleteTaskPayload,
  DeleteTaskResult,
  NotionPropertyOption,
  NotionTask,
  UpdateTaskFieldPayload,
  UpdateTaskFieldResult,
} from '../../shared/types'

export function createTasksApi() {
  return {
    getTasks: (): Promise<NotionTask[]> => ipcRenderer.invoke('get-tasks'),
    refreshTasks: (): Promise<NotionTask[]> => ipcRenderer.invoke('refresh-tasks'),
    getTaskDescription: (pageId: string): Promise<string | null> =>
      ipcRenderer.invoke('get-task-description', pageId),
    getPropertyOptions: (
      databaseId: string,
      propertyName: string,
    ): Promise<NotionPropertyOption[]> =>
      ipcRenderer.invoke('get-property-options', databaseId, propertyName),
    updateTaskField: (payload: UpdateTaskFieldPayload): Promise<UpdateTaskFieldResult> =>
      ipcRenderer.invoke('update-task-field', payload),
    createTask: (payload: CreateTaskPayload): Promise<CreateTaskResult> =>
      ipcRenderer.invoke('create-task', payload),
    deleteTask: (payload: DeleteTaskPayload): Promise<DeleteTaskResult> =>
      ipcRenderer.invoke('delete-task', payload),
  }
}

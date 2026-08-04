import type { NotionTask } from '../vite-env'
import { errorMessage } from '../../shared/errors'

export type StartFocusResult = {
  ok: boolean
  message?: string
}

/** Shared IPC call to start a Notion-linked focus session. */
export async function startFocusForTask(
  task: Pick<NotionTask, 'id' | 'title' | 'databaseId'>,
): Promise<StartFocusResult> {
  try {
    const result = await window.lattice.startFocusSession({
      notionTaskId: task.id,
      notionTaskTitle: task.title,
      databaseId: task.databaseId,
    })
    if (!result.ok) {
      return {
        ok: false,
        message: result.message ?? 'Impossible de démarrer la session focus.',
      }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, message: errorMessage(err, 'Session focus impossible.') }
  }
}

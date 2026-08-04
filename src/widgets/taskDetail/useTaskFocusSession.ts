import { useEffect, useState } from 'react'
import type { NotionTask } from '../../vite-env'
import { startFocusForTask } from '../startFocusForTask'

/** Start a Notion-linked focus session from the task detail panel. */
export function useTaskFocusSession(task: NotionTask) {
  const [focusBusy, setFocusBusy] = useState(false)
  const [focusHint, setFocusHint] = useState<string | null>(null)
  const [focusHintError, setFocusHintError] = useState(false)

  useEffect(() => {
    setFocusHint(null)
    setFocusHintError(false)
  }, [task.id])

  async function handleStartFocus(draft: Pick<NotionTask, 'id' | 'title' | 'databaseId'>) {
    setFocusBusy(true)
    setFocusHint(null)
    setFocusHintError(false)
    try {
      const res = await startFocusForTask(draft)
      if (!res.ok) {
        setFocusHint(res.message ?? 'Impossible de démarrer la session.')
        setFocusHintError(true)
        return
      }
      setFocusHint(`Session focus : ${draft.title}`)
    } finally {
      setFocusBusy(false)
    }
  }

  return { focusBusy, focusHint, focusHintError, handleStartFocus }
}

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import type { NotionTask } from '../vite-env'

export type TaskContextMenuState = {
  task: NotionTask
  x: number
  y: number
  confirm: boolean
}

type UseTaskContextMenuOpts = {
  shellRef: RefObject<HTMLElement | null>
  tasks: NotionTask[]
  /** Approx size used to keep the menu inside the shell. */
  menuSize?: { width: number; height: number }
  onOpen: (task: NotionTask) => void
}

export function useTaskContextMenu({
  shellRef,
  tasks,
  menuSize = { width: 180, height: 120 },
  onOpen,
}: UseTaskContextMenuOpts) {
  const [contextMenu, setContextMenu] = useState<TaskContextMenuState | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const menuSizeRef = useRef(menuSize)
  menuSizeRef.current = menuSize

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
    }
  }, [contextMenu])

  useEffect(() => {
    setHiddenIds((prev) => {
      const keys = Object.keys(prev)
      if (!keys.length) return prev
      let changed = false
      const next = { ...prev }
      for (const id of keys) {
        if (!tasks.some((t) => t.id === id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tasks])

  function openTaskContextMenu(task: NotionTask, e: ReactMouseEvent) {
    const shell = shellRef.current
    if (!shell) return
    const rect = shell.getBoundingClientRect()
    const { width: menuW, height: menuH } = menuSizeRef.current
    const x = Math.min(Math.max(8, e.clientX - rect.left), rect.width - menuW - 8)
    const y = Math.min(Math.max(8, e.clientY - rect.top), rect.height - menuH - 8)
    setContextMenu({ task, x, y, confirm: false })
    setActionError(null)
  }

  function unhideTask(id: string) {
    setHiddenIds((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function handleDeleteTask(task: NotionTask) {
    setContextMenu(null)
    setHiddenIds((prev) => ({ ...prev, [task.id]: true }))
    setActionError(null)
    try {
      const result = await window.lattice.deleteTask({ pageId: task.id })
      if (!result.ok) {
        unhideTask(task.id)
        setActionError(result.message ?? 'Impossible de supprimer la tâche.')
      }
    } catch (err) {
      unhideTask(task.id)
      setActionError(String(err))
    }
  }

  async function handleStartFocus(task: NotionTask) {
    setContextMenu(null)
    setActionError(null)
    try {
      const result = await window.lattice.startFocusSession({
        notionTaskId: task.id,
        notionTaskTitle: task.title,
        databaseId: task.databaseId,
      })
      if (!result.ok) {
        setActionError(result.message ?? 'Impossible de démarrer la session focus.')
      }
    } catch (err) {
      setActionError(String(err))
    }
  }

  const menu: ReactNode = contextMenu ? (
    <div
      className="cal-context-menu no-drag"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="cal-context-item"
        role="menuitem"
        onClick={() => {
          onOpen(contextMenu.task)
          setContextMenu(null)
        }}
      >
        Ouvrir
      </button>
      <button
        type="button"
        className="cal-context-item"
        role="menuitem"
        onClick={() => void handleStartFocus(contextMenu.task)}
      >
        Travailler dessus
      </button>
      {contextMenu.confirm ? (
        <button
          type="button"
          className="cal-context-item is-danger"
          role="menuitem"
          onClick={() => void handleDeleteTask(contextMenu.task)}
        >
          Confirmer la suppression
        </button>
      ) : (
        <button
          type="button"
          className="cal-context-item is-danger"
          role="menuitem"
          onClick={() => setContextMenu((m) => (m ? { ...m, confirm: true } : m))}
        >
          Supprimer
        </button>
      )}
    </div>
  ) : null

  return {
    hiddenIds,
    actionError,
    setActionError,
    openTaskContextMenu,
    menu,
  }
}

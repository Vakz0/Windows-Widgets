import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { formatFrShortDate, useTasks } from '../hooks'
import type { NotionTask } from '../vite-env'
import { TaskCard } from './TaskCard'
import { TaskDetailPanel } from './TaskDetailPanel'

type TaskContextMenu = {
  task: NotionTask
  x: number
  y: number
  confirm: boolean
}

export function TasksWidget() {
  const { tasks, error, loading, config, refresh } = useTasks()
  const [selected, setSelected] = useState<NotionTask | null>(null)
  const [contextMenu, setContextMenu] = useState<TaskContextMenu | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)

  const openTasks = tasks.filter((t) => !t.done && !hiddenIds[t.id])

  useEffect(() => {
    if (!selected) return
    const next = tasks.find((t) => t.id === selected.id)
    if (!next) setSelected(null)
    else if (next !== selected) setSelected(next)
  }, [tasks, selected])

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

  function openTaskContextMenu(task: NotionTask, e: ReactMouseEvent) {
    const shell = shellRef.current
    if (!shell) return
    const rect = shell.getBoundingClientRect()
    const menuW = 168
    const menuH = 84
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

  if (selected) {
    return (
      <div className="widget-shell">
        <TaskDetailPanel
          task={selected}
          onBack={() => setSelected(null)}
          onTaskUpdated={setSelected}
        />
      </div>
    )
  }

  const showLoading = loading && !openTasks.length
  const bannerError = actionError ?? error

  return (
    <div className="widget-shell cal-shell" ref={shellRef}>
      <div className="widget-header cal-header drag-region">
        <h1 className="cal-title">Tâches · {openTasks.length}</h1>
        <div className="header-actions no-drag">
          {config?.demoMode ? <span className="badge-demo">Démo</span> : null}
          <button
            className="icon-btn"
            type="button"
            onClick={() => void refresh()}
            aria-label="Rafraîchir"
          >
            ↻
          </button>
        </div>
      </div>

      {bannerError ? <div className="error-banner">{bannerError}</div> : null}

      {showLoading ? (
        <div className="cal-loading">
          <span className="cal-loading-dot" />
          Synchronisation des tâches Notion…
        </div>
      ) : null}

      <div className="tasks-body">
        {showLoading
          ? Array.from({ length: 5 }, (_, i) => (
              <span className="skeleton cal-card-skeleton" key={`skeleton-${i}`} aria-hidden />
            ))
          : null}

        {!loading && !openTasks.length ? (
          <div className="empty-state">Aucune tâche à afficher</div>
        ) : null}

        {openTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isStatic
            onOpen={setSelected}
            onContextMenu={openTaskContextMenu}
          >
            <span className="tasks-meta">
              <span>{formatFrShortDate(task.date)}</span>
              {task.sourceLabel ? <span className="tasks-source">{task.sourceLabel}</span> : null}
            </span>
          </TaskCard>
        ))}
      </div>

      {contextMenu ? (
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
              setSelected(contextMenu.task)
              setContextMenu(null)
            }}
          >
            Ouvrir
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
      ) : null}
    </div>
  )
}

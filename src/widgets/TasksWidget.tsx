import { useEffect, useRef, useState } from 'react'
import { formatFrShortDate, useTasks } from '../hooks'
import type { NotionTask } from '../vite-env'
import { TaskCard } from './TaskCard'
import { useTaskContextMenu } from './TaskContextMenu'
import { TaskDetailPanel } from './TaskDetailPanel'

export function TasksWidget() {
  const { tasks, error, loading, config, refresh } = useTasks()
  const [selected, setSelected] = useState<NotionTask | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const {
    hiddenIds,
    actionError,
    openTaskContextMenu,
    menu,
  } = useTaskContextMenu({
    shellRef,
    tasks,
    onOpen: setSelected,
  })

  const openTasks = tasks.filter((t) => !t.done && !hiddenIds[t.id])

  useEffect(() => {
    if (!selected) return
    const next = tasks.find((t) => t.id === selected.id)
    if (!next) setSelected(null)
    else if (next !== selected) setSelected(next)
  }, [tasks, selected])

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

      {menu}
    </div>
  )
}

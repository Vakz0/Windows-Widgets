import { useState } from 'react'
import { formatFrShortDate, useTasks } from '../hooks'
import type { NotionTask } from '../vite-env'
import { TaskDetailPanel } from './TaskDetailPanel'

export function TasksWidget() {
  const { tasks, error, loading, config, refresh } = useTasks()
  const [selected, setSelected] = useState<NotionTask | null>(null)

  const openTasks = tasks.filter((t) => !t.done)

  if (selected) {
    return (
      <div className="widget-shell">
        <TaskDetailPanel
          task={selected}
          onBack={() => setSelected(null)}
        />
      </div>
    )
  }

  return (
    <div className="widget-shell">
      <div className="widget-header drag-region">
        <h1>Tâches · {openTasks.length}</h1>
        <div className="header-actions no-drag">
          {config?.demoMode ? <span className="badge-demo">Démo</span> : null}
          <button className="icon-btn" type="button" onClick={() => void refresh()} aria-label="Rafraîchir">
            ↻
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="tasks-body">
        {loading && !openTasks.length ? (
          <div className="empty-state">Chargement…</div>
        ) : null}

        {!loading && !openTasks.length ? (
          <div className="empty-state">Aucune tâche à afficher</div>
        ) : null}

        {openTasks.map((task) => (
          <button
            key={task.id}
            className="task-row no-drag"
            type="button"
            onClick={() => setSelected(task)}
          >
            <div className="task-card-row">
              <span className="task-dot" />
              <span className="task-title">{task.title}</span>
            </div>
            <div className="task-meta">
              <span>{formatFrShortDate(task.date)}</span>
              {task.sourceLabel ? (
                <span className="task-source">{task.sourceLabel}</span>
              ) : null}
              {task.tag ? (
                <span
                  className="task-tag"
                  style={{ background: task.tagColor ?? '#c4a484' }}
                >
                  {task.tag}
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

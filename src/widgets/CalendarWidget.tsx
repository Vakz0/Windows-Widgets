import { useMemo, useState } from 'react'
import {
  addDays,
  formatFrDay,
  startOfWeek,
  toIsoDate,
  useTasks,
} from '../hooks'
import type { NotionTask } from '../vite-env'
import { TaskDetailPanel } from './TaskDetailPanel'

const DAY_COUNT = 7

function TaskCard({
  task,
  onOpen,
}: {
  task: NotionTask
  onOpen: (task: NotionTask) => void
}) {
  return (
    <button
      className="task-card no-drag"
      type="button"
      onClick={() => onOpen(task)}
      title={task.sourceLabel ? `${task.title} · ${task.sourceLabel}` : task.title}
    >
      <div className="task-card-row">
        <span className="task-dot" />
        <span className="task-title">{task.title}</span>
      </div>
      <div className="task-card-footer">
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
  )
}

export function CalendarWidget() {
  const { tasks, error, loading, config, refresh } = useTasks()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected] = useState<NotionTask | null>(null)

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date())
    return addDays(base, weekOffset * 7)
  }, [weekOffset])

  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const todayIso = toIsoDate(new Date())

  const byDay = useMemo(() => {
    const map = new Map<string, NotionTask[]>()
    for (const day of days) map.set(toIsoDate(day), [])
    for (const task of tasks) {
      if (!task.date) continue
      const bucket = map.get(task.date)
      if (bucket) bucket.push(task)
    }
    return map
  }, [days, tasks])

  const rangeLabel = `${days[0].getDate()} – ${days[6].getDate()} ${days[6].toLocaleDateString('fr-FR', { month: 'long' })}`

  if (selected) {
    return (
      <div className="widget-shell">
        <TaskDetailPanel task={selected} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="widget-shell">
      <div className="widget-header drag-region">
        <h1>Calendrier · {rangeLabel}</h1>
        <div className="header-actions no-drag">
          {config?.demoMode ? <span className="badge-demo">Démo</span> : null}
          <button className="icon-btn" type="button" onClick={() => setWeekOffset((v) => v - 1)} aria-label="Semaine précédente">
            ‹
          </button>
          <button className="icon-btn" type="button" onClick={() => setWeekOffset(0)} aria-label="Cette semaine">
            ●
          </button>
          <button className="icon-btn" type="button" onClick={() => setWeekOffset((v) => v + 1)} aria-label="Semaine suivante">
            ›
          </button>
          <button className="icon-btn" type="button" onClick={() => void refresh()} aria-label="Rafraîchir">
            ↻
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="calendar">
        {days.map((day) => {
          const iso = toIsoDate(day)
          const list = byDay.get(iso) ?? []
          return (
            <div className="day-col" key={iso}>
              <div className="day-head">
                <span className="day-name">{formatFrDay(day)}</span>
                <span className={`day-num${iso === todayIso ? ' today' : ''}`}>
                  {day.getDate()}
                </span>
              </div>
              <div className="day-cards">
                {loading && !list.length ? null : null}
                {list.map((task) => (
                  <TaskCard key={task.id} task={task} onOpen={setSelected} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import type { DragEvent, MouseEvent as ReactMouseEvent } from 'react'
import { toIsoDate } from '../../hooks'
import type { NotionTask } from '../../vite-env'
import { TaskCard } from '../TaskCard'
import { dayLabel } from './dateLabels'
import { DayComposer } from './DayComposer'

/** Nombre de cartes fantômes par jour, pour une grille de chargement à l’allure naturelle. */
const SKELETON_COUNTS = [1, 2, 0, 1, 2, 1, 0]

export function DayCell({
  day,
  tasks,
  todayIso,
  onOpen,
  onTaskContextMenu,
  loading,
  dropTarget,
  draggingId,
  composing,
  creating,
  onOpenCompose,
  onCancelCompose,
  onCreate,
  onDragOverDay,
  onDragLeaveDay,
  onDropDay,
  onDragStart,
  onDragEnd,
}: {
  day: Date
  tasks: NotionTask[]
  todayIso: string
  onOpen: (task: NotionTask) => void
  onTaskContextMenu: (task: NotionTask, e: ReactMouseEvent) => void
  loading?: boolean
  dropTarget: boolean
  draggingId: string | null
  composing: boolean
  creating: boolean
  onOpenCompose: () => void
  onCancelCompose: () => void
  onCreate: (title: string) => void
  onDragOverDay: (e: DragEvent, dayIso: string) => void
  onDragLeaveDay: (e: DragEvent, dayIso: string) => void
  onDropDay: (e: DragEvent, dayIso: string) => void
  onDragStart: (task: NotionTask, e: DragEvent) => void
  onDragEnd: () => void
}) {
  const iso = toIsoDate(day)
  const isToday = iso === todayIso
  const skeletonCount = SKELETON_COUNTS[day.getDay()]

  return (
    <div
      className={`cal-cell${iso < todayIso ? ' is-past' : ''}${dropTarget ? ' is-drop-target' : ''}`}
      onDragOver={(e) => onDragOverDay(e, iso)}
      onDragLeave={(e) => onDragLeaveDay(e, iso)}
      onDrop={(e) => onDropDay(e, iso)}
    >
      <div className="cal-cell-head">
        <button
          className="cal-add-btn no-drag"
          type="button"
          onClick={onOpenCompose}
          aria-label={`Ajouter une tâche le ${iso}`}
          title="Ajouter une tâche"
        >
          +
        </button>
        <span className={`cal-day-num${isToday ? ' is-today' : ''}`}>
          {isToday ? day.getDate() : dayLabel(day)}
        </span>
      </div>
      <div className="cal-cell-cards">
        {loading
          ? Array.from({ length: skeletonCount }, (_, i) => (
              <span className="skeleton cal-card-skeleton" key={`skeleton-${i}`} aria-hidden />
            ))
          : tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={onOpen}
                onContextMenu={onTaskContextMenu}
                dragging={draggingId === task.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
        {composing ? (
          <DayComposer busy={creating} onSubmit={onCreate} onCancel={onCancelCompose} />
        ) : null}
      </div>
    </div>
  )
}

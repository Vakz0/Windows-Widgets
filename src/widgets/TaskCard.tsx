import { useRef, type DragEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import type { NotionTask } from '../vite-env'
import { Pill } from './Pill'

type TaskCardProps = {
  task: NotionTask
  onOpen: (task: NotionTask) => void
  onContextMenu?: (task: NotionTask, e: ReactMouseEvent) => void
  /** Contenu sous le titre / tag (ex. date + source en liste). */
  children?: ReactNode
  /** Mode liste : pas de drag, curseur pointer. */
  isStatic?: boolean
  dragging?: boolean
  onDragStart?: (task: NotionTask, e: DragEvent) => void
  onDragEnd?: () => void
}

export function TaskCard({
  task,
  onOpen,
  onContextMenu,
  children,
  isStatic = false,
  dragging = false,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const suppressClick = useRef(false)
  const canDrag = !isStatic && Boolean(onDragStart && onDragEnd)

  return (
    <button
      className={`cal-card no-drag${isStatic ? ' is-static' : ''}${dragging ? ' is-dragging' : ''}`}
      type="button"
      draggable={canDrag}
      onDragStart={
        canDrag
          ? (e) => {
              suppressClick.current = true
              onDragStart!(task, e)
            }
          : undefined
      }
      onDragEnd={
        canDrag
          ? () => {
              onDragEnd!()
              // Le click synthétique suit dragEnd : on ne réarme qu'après.
              window.setTimeout(() => {
                suppressClick.current = false
              }, 0)
            }
          : undefined
      }
      onClick={() => {
        if (suppressClick.current) return
        onOpen(task)
      }}
      onContextMenu={
        onContextMenu
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              onContextMenu(task, e)
            }
          : undefined
      }
      title={task.sourceLabel ? `${task.title} · ${task.sourceLabel}` : task.title}
      style={task.importanceBg ? { background: task.importanceBg } : undefined}
    >
      <span className="cal-card-title">
        <span
          className="cal-dot"
          style={task.urgencyColor ? { background: task.urgencyColor } : undefined}
        />
        {task.title}
      </span>
      {task.tag ? <Pill label={task.tag} color={task.tagColor ?? '#c4a484'} size="sm" /> : null}
      {children}
    </button>
  )
}

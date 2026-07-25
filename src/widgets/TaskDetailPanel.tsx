import { useEffect, useState, type ReactNode } from 'react'
import { formatFrShortDate } from '../hooks'
import type { NotionTask } from '../vite-env'

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  if (!children) return null
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <div className="detail-value">{children}</div>
    </div>
  )
}

function Pill({
  label,
  color,
}: {
  label: string
  color?: string | null
}) {
  return (
    <span className="task-tag" style={{ background: color ?? '#9b9a97' }}>
      {label}
    </span>
  )
}

export function TaskDetailPanel({
  task,
  onBack,
}: {
  task: NotionTask
  onBack: () => void
}) {
  const [description, setDescription] = useState<string | null>(task.description)
  const [loadingDesc, setLoadingDesc] = useState(!task.description)

  useEffect(() => {
    let alive = true
    setDescription(task.description)
    if (task.description) {
      setLoadingDesc(false)
      return
    }

    setLoadingDesc(true)
    void window.widgets.getTaskDescription(task.id).then((text) => {
      if (!alive) return
      setDescription(text)
      setLoadingDesc(false)
    })

    return () => {
      alive = false
    }
  }, [task.id, task.description])

  return (
    <div className="task-detail no-drag">
      <div className="task-detail-toolbar">
        <button className="icon-btn" type="button" onClick={onBack} aria-label="Retour">
          ‹
        </button>
        <span className="task-detail-kicker">Détail</span>
      </div>

      <h2 className="task-detail-title">{task.title}</h2>

      <div className="task-detail-body">
        <DetailRow label="Date">{formatFrShortDate(task.date)}</DetailRow>

        <DetailRow label="État">
          {task.tag ? <Pill label={task.tag} color={task.tagColor} /> : <span className="detail-empty">—</span>}
        </DetailRow>

        <DetailRow label="Urgence">
          {task.urgency ? (
            <Pill label={task.urgency} color={task.urgencyColor} />
          ) : (
            <span className="detail-empty">—</span>
          )}
        </DetailRow>

        <DetailRow label="Importance">
          {task.importance || task.status ? (
            <Pill
              label={(task.importance || task.status)!}
              color={task.importanceColor}
            />
          ) : (
            <span className="detail-empty">—</span>
          )}
        </DetailRow>

        <DetailRow label="Statut">
          <span className="detail-plain">{task.done ? 'Terminée' : 'À faire'}</span>
        </DetailRow>

        <div className="detail-description">
          <span className="detail-label">Description</span>
          {loadingDesc ? (
            <p className="detail-empty">Chargement…</p>
          ) : description ? (
            <p className="detail-description-text">{description}</p>
          ) : (
            <p className="detail-empty">Aucune description</p>
          )}
        </div>
      </div>

      {task.url ? (
        <button
          className="detail-notion-btn"
          type="button"
          onClick={() => {
            void window.widgets.openExternal(task.url)
          }}
        >
          Ouvrir dans Notion
        </button>
      ) : null}
    </div>
  )
}

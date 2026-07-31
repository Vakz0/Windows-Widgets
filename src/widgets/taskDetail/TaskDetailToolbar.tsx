import { IconExternalLink, IconTrash } from './icons'

export function TaskDetailToolbar({
  sourceLabel,
  saving,
  confirmDelete,
  focusBusy,
  hasUrl,
  onBack,
  onDelete,
  onCancelDelete,
  onStartFocus,
  onOpenExternal,
}: {
  sourceLabel?: string | null
  saving: boolean
  confirmDelete: boolean
  focusBusy: boolean
  hasUrl: boolean
  onBack: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onStartFocus: () => void
  onOpenExternal: () => void
}) {
  return (
    <div className="task-detail-toolbar">
      <button className="icon-btn" type="button" onClick={onBack} aria-label="Retour">
        ‹
      </button>
      {sourceLabel ? (
        <span className="task-detail-breadcrumb">{sourceLabel}</span>
      ) : null}
      <span className="task-detail-toolbar-spacer" />
      {saving ? <span className="task-detail-saving">Enregistrement…</span> : null}
      {confirmDelete ? (
        <div className="task-detail-delete-confirm">
          <button
            className="task-detail-delete-btn is-danger"
            type="button"
            disabled={saving}
            onClick={onDelete}
          >
            Confirmer
          </button>
          <button
            className="task-detail-delete-btn"
            type="button"
            disabled={saving}
            onClick={onCancelDelete}
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          className="icon-btn is-danger"
          type="button"
          disabled={saving}
          onClick={onDelete}
          aria-label="Supprimer la tâche"
          title="Supprimer"
        >
          <IconTrash />
        </button>
      )}
      <button
        className="task-detail-focus-btn"
        type="button"
        disabled={saving || focusBusy}
        title="Démarrer une session focus Activité sur cette tâche"
        onClick={onStartFocus}
      >
        {focusBusy ? '…' : 'Travailler dessus'}
      </button>
      {hasUrl ? (
        <button
          className="icon-btn"
          type="button"
          onClick={onOpenExternal}
          aria-label="Ouvrir dans Notion"
          title="Ouvrir dans Notion"
        >
          <IconExternalLink />
        </button>
      ) : null}
    </div>
  )
}

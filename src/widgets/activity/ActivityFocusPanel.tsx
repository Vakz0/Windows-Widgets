import type { FocusSession } from '../../vite-env'

const FOCUS_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  interrupted: 'Interrompue',
  paused: 'En pause',
}

type ActivityFocusPanelProps = {
  session: FocusSession
  busy: boolean
  allowApps: string
  allowDomains: string
  allowProjects: string
  allowUrls: string
  onAllowAppsChange: (value: string) => void
  onAllowDomainsChange: (value: string) => void
  onAllowProjectsChange: (value: string) => void
  onAllowUrlsChange: (value: string) => void
  onPauseToggle: () => void
  onStop: () => void
  onSaveAllowlist: () => void
}

export function ActivityFocusPanel({
  session,
  busy,
  allowApps,
  allowDomains,
  allowProjects,
  allowUrls,
  onAllowAppsChange,
  onAllowDomainsChange,
  onAllowProjectsChange,
  onAllowUrlsChange,
  onPauseToggle,
  onStop,
  onSaveAllowlist,
}: ActivityFocusPanelProps) {
  return (
    <section className="activity-focus" aria-label="Session focus">
      <div className="activity-section-title">Session focus</div>
      <div className="activity-focus-card">
        <div className="activity-focus-main">
          <span className="activity-focus-task" title={session.notionTaskTitle}>
            {session.notionTaskTitle}
          </span>
          <span className={`activity-focus-status is-${session.status}`}>
            {FOCUS_STATUS_LABELS[session.status] ?? session.status}
          </span>
        </div>
        <div className="activity-focus-actions">
          <button
            type="button"
            className="activity-btn activity-btn-tiny"
            disabled={busy || session.status === 'interrupted'}
            onClick={onPauseToggle}
          >
            {session.status === 'paused' ? 'Reprendre' : 'Pause'}
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-danger activity-btn-tiny"
            disabled={busy}
            onClick={onStop}
          >
            Stop
          </button>
        </div>
        <label className="activity-focus-field">
          <span>Apps autorisées</span>
          <input
            className="activity-focus-input"
            value={allowApps}
            disabled={busy}
            onChange={(e) => onAllowAppsChange(e.target.value)}
            placeholder="cursor, code, notion…"
          />
        </label>
        <label className="activity-focus-field">
          <span>Domaines</span>
          <input
            className="activity-focus-input"
            value={allowDomains}
            disabled={busy}
            onChange={(e) => onAllowDomainsChange(e.target.value)}
            placeholder="github.com, localhost…"
          />
        </label>
        <label className="activity-focus-field">
          <span>Projets IDE</span>
          <input
            className="activity-focus-input"
            value={allowProjects}
            disabled={busy}
            onChange={(e) => onAllowProjectsChange(e.target.value)}
            placeholder="windows-widgets…"
          />
        </label>
        <label className="activity-focus-field">
          <span>URLs / vidéos</span>
          <input
            className="activity-focus-input"
            value={allowUrls}
            disabled={busy}
            onChange={(e) => onAllowUrlsChange(e.target.value)}
            placeholder="youtube:VIDEO_ID…"
            title="Clés URL autorisées (ex. youtube:dQw4w9WgXcQ)"
          />
        </label>
        <div className="activity-focus-actions">
          <button
            type="button"
            className="activity-btn activity-btn-tiny"
            disabled={busy}
            onClick={onSaveAllowlist}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </section>
  )
}

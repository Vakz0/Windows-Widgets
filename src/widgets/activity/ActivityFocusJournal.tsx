import type { FocusJournalEntry } from '../../vite-env'

type ActivityFocusJournalProps = {
  journal: FocusJournalEntry[]
}

export function ActivityFocusJournal({ journal }: ActivityFocusJournalProps) {
  if (journal.length === 0) return null

  return (
    <section className="activity-apps" aria-label="Journal focus">
      <div className="activity-section-title">Journal focus</div>
      <ul className="activity-journal-list">
        {journal.map((entry, i) => (
          <li key={`${entry.ts}-${i}`} className="activity-journal-row">
            <div className="activity-journal-meta">
              <span>
                {new Date(entry.ts).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>{entry.app}</span>
              {entry.domain ? <span>{entry.domain}</span> : null}
              <span className="activity-journal-action">{entry.action}</span>
            </div>
            {entry.note ? (
              <div className="activity-journal-note">{entry.note}</div>
            ) : (
              <div className="activity-journal-note is-empty">Sans note</div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

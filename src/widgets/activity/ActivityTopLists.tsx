import type {
  ActivityCategory,
  ActivityCorrectionScope,
  ActivityDaySummary,
} from '../../vite-env'
import { CATEGORY_LABELS, EDITABLE_CATEGORIES, formatShortDuration } from './format'

type ActivityTopListsProps = {
  data: ActivityDaySummary
  busy: boolean
  onCorrect: (
    app: string,
    category: ActivityCategory,
    scope: ActivityCorrectionScope,
    titleSample?: string | null,
    domain?: string | null,
  ) => void
}

export function ActivityTopLists({ data, busy, onCorrect }: ActivityTopListsProps) {
  const topTasks = data.topTasks ?? []

  return (
    <>
      <section className="activity-apps" aria-label="Applications">
        <div className="activity-section-title">Top apps</div>
        {data.topApps.length === 0 ? (
          <div className="activity-empty">
            {data.paused
              ? 'Suivi en pause — reprenez pour collecter des données.'
              : 'En attente d’activité…'}
          </div>
        ) : (
          <ul className="activity-app-list">
            {data.topApps.map((appRow) => (
              <li key={appRow.app} className="activity-app-row">
                <span className="activity-app-name" title={appRow.app}>
                  {appRow.app}
                </span>
                <select
                  className="activity-select activity-select-compact"
                  disabled={busy}
                  value={appRow.category}
                  aria-label={`Catégorie ${appRow.app}`}
                  onChange={(e) => {
                    void onCorrect(appRow.app, e.target.value as ActivityCategory, 'app')
                  }}
                >
                  {EDITABLE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                <span className="activity-app-time">{formatShortDuration(appRow.ms)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.topSites.length > 0 ? (
        <section className="activity-apps" aria-label="Sites">
          <div className="activity-section-title">Top sites</div>
          <ul className="activity-app-list">
            {data.topSites.map((site) => (
              <li key={site.domain} className="activity-app-row">
                <span className="activity-app-name" title={site.domain}>
                  {site.domain}
                </span>
                <select
                  className="activity-select activity-select-compact"
                  disabled={busy}
                  value={site.category}
                  aria-label={`Catégorie ${site.domain}`}
                  onChange={(e) => {
                    void onCorrect(
                      data.current?.app ?? 'browser',
                      e.target.value as ActivityCategory,
                      'domain',
                      null,
                      site.domain,
                    )
                  }}
                >
                  {EDITABLE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                <span className="activity-app-time">{formatShortDuration(site.ms)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.topWatch.length > 0 ? (
        <section className="activity-apps" aria-label="Visionnage">
          <div className="activity-section-title">Visionnage</div>
          <ul className="activity-app-list">
            {data.topWatch.map((site) => (
              <li key={site.domain} className="activity-app-row activity-app-row-simple">
                <span className="activity-app-name" title={site.domain}>
                  {site.domain}
                </span>
                <span className={`activity-app-cat cat-${site.category}`}>
                  {CATEGORY_LABELS[site.category]}
                </span>
                <span className="activity-app-time">{formatShortDuration(site.ms)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(data.topProjects?.length ?? 0) > 0 ? (
        <section className="activity-apps" aria-label="Projets">
          <div className="activity-section-title">Top projets</div>
          <ul className="activity-app-list">
            {data.topProjects.map((proj) => (
              <li key={proj.projectName} className="activity-app-row activity-app-row-simple">
                <span className="activity-app-name" title={proj.projectName}>
                  {proj.projectName}
                </span>
                <span className="activity-app-time">{formatShortDuration(proj.ms)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {topTasks.length > 0 ? (
        <section className="activity-apps" aria-label="Tâches Notion">
          <div className="activity-section-title">Temps par tâche</div>
          <ul className="activity-app-list">
            {topTasks.map((task) => (
              <li key={task.notionTaskId} className="activity-app-row activity-app-row-simple">
                <span className="activity-app-name" title={task.title}>
                  {task.title}
                </span>
                <span className="activity-app-time">{formatShortDuration(task.ms)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

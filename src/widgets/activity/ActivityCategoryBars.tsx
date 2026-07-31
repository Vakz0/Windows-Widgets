import type { ActivityCategory } from '../../vite-env'
import { formatShortDuration } from './format'

type CategoryRow = {
  id: ActivityCategory
  label: string
  ms: number
}

type ActivityCategoryBarsProps = {
  categoryRows: CategoryRow[]
  activeMs: number
}

export function ActivityCategoryBars({ categoryRows, activeMs }: ActivityCategoryBarsProps) {
  return (
    <section className="activity-categories" aria-label="Par catégorie">
      {categoryRows.map((row) => {
        const pct = activeMs > 0 && row.id !== 'afk' ? (row.ms / activeMs) * 100 : 0
        const barPct =
          row.id === 'afk'
            ? activeMs + row.ms > 0
              ? (row.ms / (activeMs + row.ms)) * 100
              : 0
            : pct
        return (
          <div key={row.id} className={`activity-cat-row cat-${row.id}`}>
            <div className="activity-cat-meta">
              <span className="activity-cat-label">{row.label}</span>
              <span className="activity-cat-time">{formatShortDuration(row.ms)}</span>
            </div>
            <div className="activity-cat-track">
              <div
                className="activity-cat-fill"
                style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }}
              />
            </div>
          </div>
        )
      })}
    </section>
  )
}

import type { PublicConfig } from '../../../shared/types'

export function CatalogAppSettings({
  config,
  busy,
  intervalDraft,
  onIntervalDraftChange,
  onSave,
}: {
  config: PublicConfig
  busy: boolean
  intervalDraft: string
  onIntervalDraftChange: (value: string) => void
  onSave: (patch: {
    refreshIntervalSeconds?: number
    demoMode?: boolean
    launchAtStartup?: boolean
    updates?: { autoDownload?: boolean }
  }) => Promise<void>
}) {
  return (
    <section className="catalog-settings-card">
      <h2 className="catalog-settings-title">Application</h2>
      <p className="catalog-settings-hint">
        Ces options écrivent dans <code>config.json</code> (userData).
      </p>

      <label className="catalog-field">
        <span className="catalog-field-label">Intervalle de rafraîchissement Notion</span>
        <div className="catalog-field-row">
          <input
            type="number"
            className="catalog-input"
            min={60}
            step={1}
            value={intervalDraft}
            disabled={busy}
            onChange={(e) => onIntervalDraftChange(e.target.value)}
            onBlur={() => {
              const n = Number(intervalDraft)
              if (!Number.isFinite(n)) {
                onIntervalDraftChange(String(config.refreshIntervalSeconds))
                return
              }
              const next = Math.max(60, Math.round(n))
              onIntervalDraftChange(String(next))
              if (next !== config.refreshIntervalSeconds) {
                void onSave({ refreshIntervalSeconds: next })
              }
            }}
          />
          <span className="catalog-field-suffix">secondes (min. 60)</span>
        </div>
      </label>

      <label className="catalog-toggle-row">
        <div className="catalog-toggle-copy">
          <span className="catalog-field-label">Lancer au démarrage</span>
          <span className="catalog-field-help">Ouvre Lattice avec Windows (`launchAtStartup`).</span>
        </div>
        <span className="catalog-switch catalog-switch-inline">
          <input
            type="checkbox"
            checked={config.launchAtStartup}
            disabled={busy}
            onChange={(e) => void onSave({ launchAtStartup: e.target.checked })}
          />
          <span className="catalog-switch-track" aria-hidden>
            <span className="catalog-switch-thumb" />
          </span>
        </span>
      </label>

      <label className="catalog-toggle-row">
        <div className="catalog-toggle-copy">
          <span className="catalog-field-label">Mode démo</span>
          <span className="catalog-field-help">
            Données d’exemple à la place de Notion (`demoMode`).
          </span>
        </div>
        <span className="catalog-switch catalog-switch-inline">
          <input
            type="checkbox"
            checked={config.demoMode}
            disabled={busy}
            onChange={(e) => void onSave({ demoMode: e.target.checked })}
          />
          <span className="catalog-switch-track" aria-hidden>
            <span className="catalog-switch-thumb" />
          </span>
        </span>
      </label>
    </section>
  )
}

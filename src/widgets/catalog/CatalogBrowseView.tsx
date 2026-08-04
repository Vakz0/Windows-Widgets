import { SkeletonCard } from '../Skeleton'
import { ButtonSpinner } from '../Spinner'
import type { CatalogWidgetInfo, WidgetUpdateInfo } from '../../../shared/types'

function sourceLabel(source: CatalogWidgetInfo['source']): string {
  return source === 'builtin' ? 'Intégré' : 'Externe'
}

function placementLabel(placement: CatalogWidgetInfo['placement']): string {
  return placement === 'desktop' ? 'Bureau' : 'Pop-up'
}

export function CatalogBrowseView({
  widgets,
  widgetsLoading,
  selectedId,
  pendingId,
  remoteWidgets,
  installingRemoteId,
  onSelect,
  onToggle,
  onInstallRemote,
}: {
  widgets: CatalogWidgetInfo[]
  widgetsLoading: boolean
  selectedId: string | null
  pendingId: string | null
  remoteWidgets: WidgetUpdateInfo[]
  installingRemoteId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
  onInstallRemote: (id: string) => void
}) {
  const enabledCount = widgets.filter((w) => w.enabled).length
  const builtinCount = widgets.filter((w) => w.source === 'builtin').length
  const externalCount = widgets.filter((w) => w.source === 'external').length
  const selected = widgets.find((w) => w.id === selectedId) ?? null
  const installableRemote = remoteWidgets.filter((w) => w.status === 'not-installed')
  const selectedRemote = remoteWidgets.find((w) => w.id === selectedId)

  const stats = [
    { key: 'active', label: 'Actifs', value: enabledCount },
    { key: 'total', label: 'Total', value: widgets.length },
    { key: 'builtin', label: 'Intégrés', value: builtinCount },
    { key: 'external', label: 'Externes', value: externalCount },
  ] as const

  return (
    <>
      <section className="catalog-stats" aria-label="Résumé">
        {stats.map(({ key, label, value }) => (
          <div key={key} className="catalog-stat-card">
            <div className="catalog-stat-top">
              <span className="catalog-stat-label">{label}</span>
            </div>
            <span className="catalog-stat-value">{value}</span>
          </div>
        ))}
      </section>

      <div className="catalog-main">
        <section className="catalog-list-panel" aria-label="Widgets">
          <div className="catalog-section-head">
            <h2 className="catalog-section-title">Widgets</h2>
            <span className="catalog-section-meta">{widgets.length} disponibles</span>
          </div>

          <ul className="catalog-list">
            {widgetsLoading &&
              Array.from({ length: 3 }, (_, i) => (
                <SkeletonCard
                  key={`skeleton-${i}`}
                  as="li"
                  lineWidths={['medium', 'wide', 'narrow']}
                />
              ))}
            {!widgetsLoading && widgets.length === 0 && (
              <li className="catalog-empty">Aucun widget disponible dans le registre.</li>
            )}
            {!widgetsLoading &&
              widgets.map((w) => {
                const isSelected = w.id === selectedId
                const isPending = pendingId === w.id
                return (
                  <li
                    key={w.id}
                    className={`catalog-item${isSelected ? ' is-selected' : ''}${w.enabled ? ' is-enabled' : ''}`}
                  >
                    <div
                      className="catalog-item-hit"
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => onSelect(w.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelect(w.id)
                        }
                      }}
                    >
                      <div className="catalog-item-body">
                        <div className="catalog-item-title-row">
                          <span className="catalog-item-label">{w.label}</span>
                          <span
                            className={`catalog-badge catalog-badge-status${w.enabled ? ' is-on' : ''}`}
                          >
                            {w.enabled ? 'Activé' : 'Désactivé'}
                          </span>
                        </div>
                        <p className="catalog-item-desc">{w.description}</p>
                        <div className="catalog-item-meta">
                          <span className="catalog-badge catalog-badge-muted">
                            {sourceLabel(w.source)}
                          </span>
                          <span className="catalog-badge catalog-badge-muted">
                            {placementLabel(w.placement)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isPending ? (
                      <span className="catalog-switch catalog-switch-pending" aria-label="Mise à jour…">
                        <span className="spinner is-muted" />
                      </span>
                    ) : (
                      <label className="catalog-switch">
                        <input
                          type="checkbox"
                          checked={w.enabled}
                          aria-label={
                            w.enabled ? `Désactiver ${w.label}` : `Activer ${w.label}`
                          }
                          onChange={(e) => onToggle(w.id, e.target.checked)}
                        />
                        <span className="catalog-switch-track" aria-hidden>
                          <span className="catalog-switch-thumb" />
                        </span>
                      </label>
                    )}
                  </li>
                )
              })}
          </ul>

          {installableRemote.length > 0 && (
            <>
              <div className="catalog-section-head" style={{ marginTop: '1.25rem' }}>
                <h2 className="catalog-section-title">Catalogue distant</h2>
                <span className="catalog-section-meta">
                  {installableRemote.length} à installer
                </span>
              </div>
              <ul className="catalog-list">
                {installableRemote.map((w) => (
                  <li
                    key={`remote-${w.id}`}
                    className={`catalog-item${selectedId === w.id ? ' is-selected' : ''}`}
                  >
                    <div
                      className="catalog-item-hit"
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(w.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelect(w.id)
                        }
                      }}
                    >
                      <div className="catalog-item-body">
                        <div className="catalog-item-title-row">
                          <span className="catalog-item-label">{w.label}</span>
                          <span className="catalog-badge catalog-badge-muted">
                            v{w.latestVersion}
                          </span>
                        </div>
                        <p className="catalog-item-desc">
                          {w.description || 'Widget distant disponible.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="catalog-detail-cta"
                      style={{ marginRight: 8, flexShrink: 0 }}
                      disabled={installingRemoteId === w.id || w.status === 'incompatible'}
                      onClick={() => onInstallRemote(w.id)}
                    >
                      {installingRemoteId === w.id ? (
                        <ButtonSpinner label="…" />
                      ) : (
                        'Installer'
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className="catalog-detail" aria-label="Détails">
          <div className="catalog-section-head">
            <h2 className="catalog-section-title">Détails</h2>
          </div>

          {!selected && !selectedRemote ? (
            <p className="catalog-detail-empty">
              Sélectionnez un widget pour voir ses détails.
            </p>
          ) : selected ? (
            <div className="catalog-detail-card">
              <h3 className="catalog-detail-name">{selected.label}</h3>
              <p className="catalog-detail-desc">{selected.description}</p>

              <dl className="catalog-detail-fields">
                <div className="catalog-detail-field">
                  <dt>Source</dt>
                  <dd>{sourceLabel(selected.source)}</dd>
                </div>
                <div className="catalog-detail-field">
                  <dt>Placement</dt>
                  <dd>{placementLabel(selected.placement)}</dd>
                </div>
                <div className="catalog-detail-field">
                  <dt>État</dt>
                  <dd>
                    <span
                      className={`catalog-badge catalog-badge-status${selected.enabled ? ' is-on' : ''}`}
                    >
                      {selected.enabled ? 'Activé' : 'Désactivé'}
                    </span>
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                className={`catalog-detail-cta${selected.enabled ? ' is-on' : ''}`}
                disabled={pendingId === selected.id}
                onClick={() => onToggle(selected.id, !selected.enabled)}
              >
                {selected.enabled ? 'Désactiver' : 'Activer'}
              </button>
              {selectedRemote?.status === 'update-available' && (
                <button
                  type="button"
                  className="catalog-detail-cta catalog-detail-cta-secondary"
                  style={{ marginTop: 8 }}
                  disabled={installingRemoteId === selected.id}
                  onClick={() => onInstallRemote(selected.id)}
                >
                  {installingRemoteId === selected.id
                    ? 'Mise à jour…'
                    : `Mettre à jour (v${selectedRemote.latestVersion})`}
                </button>
              )}
            </div>
          ) : selectedRemote ? (
            <div className="catalog-detail-card">
              <h3 className="catalog-detail-name">{selectedRemote.label}</h3>
              <p className="catalog-detail-desc">
                {selectedRemote.description || 'Widget distant.'}
              </p>
              <dl className="catalog-detail-fields">
                <div className="catalog-detail-field">
                  <dt>Source</dt>
                  <dd>Catalogue distant</dd>
                </div>
                <div className="catalog-detail-field">
                  <dt>Version</dt>
                  <dd>v{selectedRemote.latestVersion}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="catalog-detail-cta"
                disabled={
                  installingRemoteId === selectedRemote.id ||
                  selectedRemote.status === 'incompatible'
                }
                onClick={() => onInstallRemote(selectedRemote.id)}
              >
                {installingRemoteId === selectedRemote.id
                  ? 'Installation…'
                  : selectedRemote.status === 'incompatible'
                    ? 'Incompatible'
                    : 'Installer'}
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  )
}

import { useEffect, useState, useTransition } from 'react'
import type {
  CatalogWidgetInfo,
  PublicConfig,
  WidgetUpdateInfo,
} from '../../shared/types'
import type { CatalogView } from '../vite-env'
import { SkeletonCard } from './Skeleton'
import { ButtonSpinner } from './Spinner'
import {
  IconBuiltin,
  IconClose,
  IconExternal,
  IconGrid,
  IconMaximize,
  IconMinimize,
  IconPulse,
  IconRestore,
} from './catalog/CatalogIcons'
import { CatalogSettingsPanel } from './catalog/CatalogSettingsPanel'

function initialView(): CatalogView {
  const params = new URLSearchParams(window.location.search)
  return params.get('view') === 'settings' ? 'settings' : 'catalog'
}

function sourceLabel(source: CatalogWidgetInfo['source']): string {
  return source === 'builtin' ? 'Intégré' : 'Externe'
}

function placementLabel(placement: CatalogWidgetInfo['placement']): string {
  return placement === 'desktop' ? 'Bureau' : 'Pop-up'
}

export function CatalogWidget() {
  const [view, setView] = useState<CatalogView>(initialView)
  const [widgets, setWidgets] = useState<CatalogWidgetInfo[]>([])
  const [widgetsLoading, setWidgetsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [maximized, setMaximized] = useState(false)
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [version, setVersion] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [remoteWidgets, setRemoteWidgets] = useState<WidgetUpdateInfo[]>([])
  const [installingRemoteId, setInstallingRemoteId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    void window.lattice
      .listWidgets()
      .then((list) => {
        if (cancelled) return
        setWidgets(list)
        setSelectedId((prev) => prev ?? list[0]?.id ?? null)
      })
      .catch((err) => {
        if (!cancelled) setError(String(err))
      })
      .finally(() => {
        if (!cancelled) setWidgetsLoading(false)
      })
    void window.lattice.getConfig().then((cfg) => {
      if (!cancelled) setConfig(cfg)
    }).catch(() => undefined)
    void window.lattice.getAppVersion().then((v) => {
      if (!cancelled) setVersion(v)
    }).catch(() => undefined)
    void window.lattice.isCatalogMaximized().then((value) => {
      if (!cancelled) setMaximized(value)
    }).catch(() => undefined)
    void window.lattice
      .listRemoteWidgets()
      .then((list) => {
        if (!cancelled) setRemoteWidgets(list)
      })
      .catch(() => {
        /* catalogue distant optionnel */
      })
    const unsubWidgets = window.lattice.onWidgetsChanged((list) => {
      startTransition(() => {
        setWidgets(list)
        setSelectedId((prev) => {
          if (prev && list.some((w) => w.id === prev)) return prev
          return list[0]?.id ?? null
        })
        setWidgetsLoading(false)
      })
      void window.lattice.listRemoteWidgets().then(setRemoteWidgets).catch(() => undefined)
    })
    const unsubMaximized = window.lattice.onCatalogMaximizedChanged((value) => {
      setMaximized(value)
    })
    const unsubNavigate = window.lattice.onCatalogNavigate((next) => {
      setView(next)
    })
    return () => {
      cancelled = true
      unsubWidgets()
      unsubMaximized()
      unsubNavigate()
    }
  }, [])

  async function toggle(id: string, enabled: boolean) {
    setPendingId(id)
    setError(null)
    try {
      const result = await window.lattice.setWidgetEnabled(id, enabled)
      setWidgets(result.widgets)
      if (!result.ok) setError('Impossible de modifier ce widget.')
    } catch (err) {
      setError(String(err))
    } finally {
      setPendingId(null)
    }
  }

  async function installRemote(id: string) {
    setInstallingRemoteId(id)
    setError(null)
    try {
      const result = await window.lattice.installWidget(id)
      if (!result.ok) setError(result.message)
      else {
        const list = await window.lattice.listWidgets()
        setWidgets(list)
        setSelectedId(id)
        const remote = await window.lattice.listRemoteWidgets()
        setRemoteWidgets(remote)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setInstallingRemoteId(null)
    }
  }

  async function onToggleMaximize() {
    const next = await window.lattice.toggleMaximizeCatalog()
    setMaximized(next)
  }

  async function saveSettings(patch: {
    refreshIntervalSeconds?: number
    demoMode?: boolean
    launchAtStartup?: boolean
    updates?: { autoDownload?: boolean }
  }) {
    setSavingSettings(true)
    setSaveMessage(null)
    setError(null)
    try {
      const result = await window.lattice.updatePublicSettings(patch)
      setConfig(result.config)
      setSaveMessage(result.ok ? 'Enregistré dans config.json' : 'Échec de l’enregistrement')
    } catch (err) {
      setError(String(err))
      setSaveMessage(null)
    } finally {
      setSavingSettings(false)
    }
  }

  const enabledCount = widgets.filter((w) => w.enabled).length
  const builtinCount = widgets.filter((w) => w.source === 'builtin').length
  const externalCount = widgets.filter((w) => w.source === 'external').length
  const selected = widgets.find((w) => w.id === selectedId) ?? null
  const installableRemote = remoteWidgets.filter((w) => w.status === 'not-installed')
  const selectedRemote = remoteWidgets.find((w) => w.id === selectedId)

  const stats = [
    { key: 'active', label: 'Actifs', value: enabledCount, Icon: IconPulse },
    { key: 'total', label: 'Total', value: widgets.length, Icon: IconGrid },
    { key: 'builtin', label: 'Intégrés', value: builtinCount, Icon: IconBuiltin },
    { key: 'external', label: 'Externes', value: externalCount, Icon: IconExternal },
  ] as const

  const isSettings = view === 'settings'

  return (
    <div className="widget-shell catalog-shell">
      <header className="catalog-header drag-region">
        <div className="catalog-header-text">
          <p className="catalog-kicker">Lattice{version ? ` · v${version}` : ''}</p>
          <h1 className="catalog-title">{isSettings ? 'Paramètres' : 'Catalogue'}</h1>
          <p className="catalog-subtitle">
            {isSettings
              ? 'Options liées à config.json — intervalle, démarrage, mode démo.'
              : 'Activez les widgets à afficher. Une installation neuve démarre vide.'}
          </p>
          <nav className="catalog-nav no-drag" aria-label="Sections">
            <button
              type="button"
              className={`catalog-nav-btn${view === 'catalog' ? ' is-active' : ''}`}
              onClick={() => setView('catalog')}
            >
              Catalogue
            </button>
            <button
              type="button"
              className={`catalog-nav-btn${view === 'settings' ? ' is-active' : ''}`}
              onClick={() => setView('settings')}
            >
              Paramètres
            </button>
          </nav>
        </div>
        <div className="catalog-window-controls no-drag">
          <button
            type="button"
            className="catalog-window-btn"
            aria-label="Réduire"
            onClick={() => void window.lattice.minimizeCatalog()}
          >
            <IconMinimize />
          </button>
          <button
            type="button"
            className="catalog-window-btn"
            aria-label={maximized ? 'Restaurer' : 'Agrandir'}
            onClick={() => void onToggleMaximize()}
          >
            {maximized ? <IconRestore /> : <IconMaximize />}
          </button>
          <button
            type="button"
            className="catalog-window-btn catalog-window-btn-close"
            aria-label="Fermer"
            onClick={() => void window.lattice.closeCatalog()}
          >
            <IconClose />
          </button>
        </div>
      </header>

      {error && <p className="catalog-error">{error}</p>}

      <div className="catalog-body no-drag">
        {isSettings ? (
          <CatalogSettingsPanel
            config={config}
            version={version}
            saving={savingSettings}
            saveMessage={saveMessage}
            onSave={saveSettings}
            onConfigChange={setConfig}
            onMessage={setSaveMessage}
          />
        ) : (
          <>
            <section className="catalog-stats" aria-label="Résumé">
              {stats.map(({ key, label, value, Icon }) => (
                <div key={key} className="catalog-stat-card">
                  <div className="catalog-stat-top">
                    <span className="catalog-stat-label">{label}</span>
                    <Icon className="catalog-stat-icon" />
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
                          onClick={() => setSelectedId(w.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedId(w.id)
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
                              onChange={(e) => void toggle(w.id, e.target.checked)}
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
                            onClick={() => setSelectedId(w.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setSelectedId(w.id)
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
                            onClick={() => void installRemote(w.id)}
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
                      onClick={() => void toggle(selected.id, !selected.enabled)}
                    >
                      {selected.enabled ? 'Désactiver' : 'Activer'}
                    </button>
                    {selectedRemote?.status === 'update-available' && (
                      <button
                        type="button"
                        className="catalog-detail-cta catalog-detail-cta-secondary"
                        style={{ marginTop: 8 }}
                        disabled={installingRemoteId === selected.id}
                        onClick={() => void installRemote(selected.id)}
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
                      onClick={() => void installRemote(selectedRemote.id)}
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
        )}
      </div>
    </div>
  )
}

import type { AppUpdateState, PublicConfig, WidgetUpdatesState } from '../../../shared/types'
import { ButtonSpinner } from '../Spinner'

export function CatalogUpdateSettings({
  config,
  version,
  busy,
  appUpdate,
  widgetUpdate,
  widgetUpdatesAvailable,
  updateBusy,
  onSave,
  onCheckApp,
  onDownloadApp,
  onInstallApp,
  onCheckWidgets,
  onApplyWidgetUpdates,
}: {
  config: PublicConfig
  version: string
  busy: boolean
  appUpdate: AppUpdateState
  widgetUpdate: WidgetUpdatesState
  widgetUpdatesAvailable: number
  updateBusy: 'app' | 'widgets' | null
  onSave: (patch: {
    refreshIntervalSeconds?: number
    demoMode?: boolean
    launchAtStartup?: boolean
    updates?: { autoDownload?: boolean }
  }) => Promise<void>
  onCheckApp: () => void
  onDownloadApp: () => void
  onInstallApp: () => void
  onCheckWidgets: () => void
  onApplyWidgetUpdates: () => void
}) {
  return (
    <section className="catalog-settings-card">
      <h2 className="catalog-settings-title">Mises à jour</h2>
      <p className="catalog-settings-hint">
        Version installée : <strong>Lattice v{version || '…'}</strong>. Une vérification
        silencieuse a lieu au démarrage.
      </p>

      <label className="catalog-toggle-row">
        <div className="catalog-toggle-copy">
          <span className="catalog-field-label">Téléchargement automatique</span>
          <span className="catalog-field-help">
            Télécharge en arrière-plan et notifie Windows quand c’est prêt à installer.
          </span>
        </div>
        <span className="catalog-switch catalog-switch-inline">
          <input
            type="checkbox"
            checked={config.updates?.autoDownload === true}
            disabled={busy}
            onChange={(e) =>
              void onSave({ updates: { autoDownload: e.target.checked } })
            }
          />
          <span className="catalog-switch-track" aria-hidden>
            <span className="catalog-switch-thumb" />
          </span>
        </span>
      </label>

      <p className="catalog-settings-hint catalog-update-status">
        App : {appUpdate.message ?? appUpdate.status}
        {typeof appUpdate.progress === 'number' ? ` (${appUpdate.progress} %)` : ''}
      </p>

      <div className="catalog-settings-actions">
        <button
          type="button"
          className="catalog-detail-cta"
          disabled={busy}
          onClick={() => void onCheckApp()}
        >
          {updateBusy === 'app' && appUpdate.status === 'checking' ? (
            <ButtonSpinner label="Vérification…" />
          ) : (
            'Vérifier la mise à jour de l’app'
          )}
        </button>
        {appUpdate.status === 'available' && (
          <button
            type="button"
            className="catalog-detail-cta catalog-detail-cta-secondary"
            disabled={busy}
            onClick={() => void onDownloadApp()}
          >
            Télécharger
          </button>
        )}
        {appUpdate.status === 'ready' && (
          <button
            type="button"
            className="catalog-detail-cta"
            disabled={busy}
            onClick={() => void onInstallApp()}
          >
            Installer et redémarrer
          </button>
        )}
      </div>

      <p className="catalog-settings-hint catalog-update-status">
        Widgets : {widgetUpdate.message ?? widgetUpdate.status}
        {widgetUpdatesAvailable > 0 ? ` · ${widgetUpdatesAvailable} à mettre à jour` : ''}
      </p>

      <div className="catalog-settings-actions">
        <button
          type="button"
          className="catalog-detail-cta"
          disabled={busy}
          onClick={() => void onCheckWidgets()}
        >
          {updateBusy === 'widgets' && widgetUpdate.status === 'checking' ? (
            <ButtonSpinner label="Vérification…" />
          ) : (
            'Vérifier les mises à jour des widgets'
          )}
        </button>
        {widgetUpdatesAvailable > 0 && (
          <button
            type="button"
            className="catalog-detail-cta catalog-detail-cta-secondary"
            disabled={busy}
            onClick={() => void onApplyWidgetUpdates()}
          >
            Mettre à jour les widgets
          </button>
        )}
      </div>
    </section>
  )
}

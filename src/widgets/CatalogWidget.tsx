import { useEffect, useState, useTransition } from 'react'
import type {
  AppUpdateState,
  CatalogWidgetInfo,
  PublicConfig,
  TaskPropertyMapping,
  TaskSourceFilters,
  WidgetUpdateInfo,
  WidgetUpdatesState,
} from '../../shared/types'
import type { CatalogView } from '../vite-env'
import { ButtonSpinner, SkeletonCard, SkeletonLines } from './Skeleton'

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

function IconPulse({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12h3l2-5 4 10 2-5h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconBuiltin({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconExternal({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 4h6v6M20 4l-9 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconMinimize({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconMaximize({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="2.25" y="2.25" width="7.5" height="7.5" rx="1.25" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function IconRestore({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M4 3.5h4.5A1 1 0 0110 4.5V9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="2" y="4.25" width="6.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function notionStatusLabel(config: PublicConfig): string {
  if (config.demoMode) return 'Mode démo'
  if (config.notionConfigured) return 'Connecté'
  if (config.notionTokenStored) return 'Token enregistré — base manquante'
  return 'Non configuré'
}

function SettingsPanel({
  config,
  version,
  saving,
  saveMessage,
  onSave,
  onConfigChange,
  onMessage,
}: {
  config: PublicConfig | null
  version: string
  saving: boolean
  saveMessage: string | null
  onSave: (patch: {
    refreshIntervalSeconds?: number
    demoMode?: boolean
    launchAtStartup?: boolean
    updates?: { autoDownload?: boolean }
  }) => Promise<void>
  onConfigChange: (cfg: PublicConfig) => void
  onMessage: (message: string | null) => void
}) {
  const [intervalDraft, setIntervalDraft] = useState('')
  const [tokenDraft, setTokenDraft] = useState('')
  const [databaseId, setDatabaseId] = useState('')
  const [properties, setProperties] = useState<TaskPropertyMapping>({
    title: 'Name',
    date: 'Date',
    tag: 'Tags',
    status: 'Priority',
    urgency: 'Urgency',
    doneCheckbox: 'Done',
  })
  const [filters, setFilters] = useState<TaskSourceFilters>({
    hideCompleted: true,
    completedStatusValues: [],
  })
  const [completedDraft, setCompletedDraft] = useState('')
  const [notionAction, setNotionAction] = useState<'test' | 'save' | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [testOk, setTestOk] = useState(false)
  const [dbTitle, setDbTitle] = useState<string | null>(null)
  const [appUpdate, setAppUpdate] = useState<AppUpdateState>({ status: 'idle' })
  const [widgetUpdate, setWidgetUpdate] = useState<WidgetUpdatesState>({
    status: 'idle',
    updates: [],
  })
  const [updateBusy, setUpdateBusy] = useState<'app' | 'widgets' | null>(null)

  useEffect(() => {
    if (!config) return
    setIntervalDraft(String(config.refreshIntervalSeconds))
    setDatabaseId(config.databaseId ?? '')
    setProperties({ ...config.properties })
    setFilters({
      hideCompleted: config.filters.hideCompleted,
      completedStatusValues: [...(config.filters.completedStatusValues ?? [])],
    })
    setCompletedDraft((config.filters.completedStatusValues ?? []).join(', '))
    setTokenDraft('')
  }, [config])

  useEffect(() => {
    void window.lattice.getAppUpdateStatus().then(setAppUpdate)
    void window.lattice.getWidgetUpdateStatus().then(setWidgetUpdate)
    const unsubApp = window.lattice.onAppUpdateStatus(setAppUpdate)
    const unsubWidgets = window.lattice.onWidgetUpdateStatus(setWidgetUpdate)
    return () => {
      unsubApp()
      unsubWidgets()
    }
  }, [])

  if (!config) {
    return (
      <div className="catalog-settings" aria-hidden>
        {Array.from({ length: 2 }, (_, i) => (
          <section className="catalog-settings-card" key={`skeleton-${i}`}>
            <SkeletonLines widths={['narrow', 'wide', 'medium']} />
          </section>
        ))}
      </div>
    )
  }

  const busy = saving || notionAction != null || updateBusy != null
  const widgetUpdatesAvailable = widgetUpdate.updates.filter(
    (u) => u.status === 'update-available',
  ).length

  async function runUpdateAction(
    kind: 'app' | 'widgets',
    action: () => Promise<{ message?: string } | unknown>,
  ) {
    setUpdateBusy(kind)
    onMessage(null)
    try {
      const next = await action()
      if (next && typeof next === 'object' && 'message' in next) {
        onMessage((next as { message?: string }).message ?? null)
      }
    } catch (err) {
      onMessage(String(err))
    } finally {
      setUpdateBusy(null)
    }
  }

  async function checkApp() {
    await runUpdateAction('app', async () => {
      const next = await window.lattice.checkAppUpdate()
      setAppUpdate(next)
      return next
    })
  }

  async function downloadApp() {
    await runUpdateAction('app', async () => {
      const next = await window.lattice.downloadAppUpdate()
      setAppUpdate(next)
    })
  }

  async function installApp() {
    await runUpdateAction('app', () => window.lattice.installAppUpdate())
  }

  async function checkWidgets() {
    await runUpdateAction('widgets', async () => {
      const next = await window.lattice.checkWidgetUpdates()
      setWidgetUpdate(next)
      return next
    })
  }

  async function applyWidgetUpdates() {
    await runUpdateAction('widgets', async () => {
      const next = await window.lattice.updateWidgets()
      setWidgetUpdate(next)
      return next
    })
  }

  async function testConnection() {
    setNotionAction('test')
    setTestMessage(null)
    setTestOk(false)
    onMessage(null)
    try {
      const result = await window.lattice.testNotionConnection({
        notionToken: tokenDraft.trim() || undefined,
        databaseId: databaseId.trim() || undefined,
      })
      setTestMessage(result.message)
      setTestOk(result.ok)
      if (result.ok) {
        setDbTitle(result.databaseTitle ?? null)
        if (result.suggestedProperties) {
          setProperties((prev) => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(result.suggestedProperties!).filter(
                ([, v]) => typeof v === 'string' && v.trim(),
              ),
            ),
          }))
        }
        onMessage(
          result.databaseTitle
            ? `Base détectée : ${result.databaseTitle}`
            : 'Connexion réussie',
        )
      } else {
        setDbTitle(null)
      }
    } catch (err) {
      setTestMessage(String(err))
      setTestOk(false)
      setDbTitle(null)
    } finally {
      setNotionAction(null)
    }
  }

  async function saveNotion() {
    setNotionAction('save')
    setTestMessage(null)
    onMessage(null)
    try {
      const completedStatusValues = completedDraft
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const result = await window.lattice.saveNotionSettings({
        notionToken: tokenDraft.trim() || undefined,
        databaseId: databaseId.trim(),
        properties,
        filters: {
          hideCompleted: filters.hideCompleted,
          completedStatusValues,
        },
      })
      onConfigChange(result.config)
      setTokenDraft('')
      onMessage(result.message)
      setTestMessage(null)
    } catch (err) {
      onMessage(String(err))
    } finally {
      setNotionAction(null)
    }
  }

  function setProp<K extends keyof TaskPropertyMapping>(key: K, value: string) {
    setProperties((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="catalog-settings">
      <section className="catalog-settings-card">
        <h2 className="catalog-settings-title">Notion</h2>
        <p className="catalog-settings-hint">
          Créez une{' '}
          <button
            type="button"
            className="catalog-link-btn"
            onClick={() => void window.lattice.openExternal('https://www.notion.so/my-integrations')}
          >
            intégration interne
          </button>
          , partagez-la avec votre base, puis collez le secret et l’URL ici. Le token n’est jamais
          renvoyé à l’interface après enregistrement.
        </p>

        <div className="catalog-notion-status" data-state={config.notionConfigured ? 'ok' : 'warn'}>
          <span>{notionStatusLabel(config)}</span>
          {config.notionTokenStored && (
            <span className="catalog-notion-token-hint">Token enregistré · ••••••••</span>
          )}
          {dbTitle && <span className="catalog-notion-token-hint">Base : {dbTitle}</span>}
          {config.projectSourcesCount > 0 && (
            <span className="catalog-notion-token-hint">
              {config.projectSourcesCount} source
              {config.projectSourcesCount > 1 ? 's' : ''} secondaire
              {config.projectSourcesCount > 1 ? 's' : ''} (config.json)
            </span>
          )}
        </div>

        <label className="catalog-field">
          <span className="catalog-field-label">
            Token d’intégration
            {config.notionTokenStored ? ' (laisser vide pour conserver)' : ''}
          </span>
          <input
            type="password"
            className="catalog-input catalog-input-wide"
            autoComplete="off"
            placeholder={config.notionTokenStored ? '••••••••••••••••' : 'secret_… ou ntn_…'}
            value={tokenDraft}
            disabled={busy}
            onChange={(e) => setTokenDraft(e.target.value)}
          />
        </label>

        <label className="catalog-field">
          <span className="catalog-field-label">URL ou ID de la base</span>
          <input
            type="text"
            className="catalog-input catalog-input-wide"
            placeholder="https://www.notion.so/…"
            value={databaseId}
            disabled={busy}
            onChange={(e) => setDatabaseId(e.target.value)}
          />
        </label>

        <div className="catalog-prop-grid">
          {(
            [
              ['title', 'Titre'],
              ['date', 'Date'],
              ['tag', 'Pastille / tag'],
              ['status', 'Importance / priorité'],
              ['urgency', 'Urgence (optionnel)'],
              ['workflowStatus', 'Statut workflow (optionnel)'],
              ['doneCheckbox', 'Case terminé (optionnel)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="catalog-field">
              <span className="catalog-field-label">{label}</span>
              <input
                type="text"
                className="catalog-input catalog-input-wide"
                value={properties[key] ?? ''}
                disabled={busy}
                onChange={(e) => setProp(key, e.target.value)}
              />
            </label>
          ))}
        </div>

        <label className="catalog-toggle-row">
          <div className="catalog-toggle-copy">
            <span className="catalog-field-label">Masquer les tâches terminées</span>
            <span className="catalog-field-help">`filters.hideCompleted`</span>
          </div>
          <span className="catalog-switch catalog-switch-inline">
            <input
              type="checkbox"
              checked={filters.hideCompleted}
              disabled={busy}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, hideCompleted: e.target.checked }))
              }
            />
            <span className="catalog-switch-track" aria-hidden>
              <span className="catalog-switch-thumb" />
            </span>
          </span>
        </label>

        <label className="catalog-field">
          <span className="catalog-field-label">Statuts considérés comme terminés</span>
          <span className="catalog-field-help">Séparés par des virgules (ex. Done, Terminé)</span>
          <input
            type="text"
            className="catalog-input catalog-input-wide"
            value={completedDraft}
            disabled={busy}
            onChange={(e) => setCompletedDraft(e.target.value)}
          />
        </label>

        <p className="catalog-settings-hint">
          Sources secondaires (`projectSources`) : éditer dans le fichier config.
        </p>

        <div className="catalog-settings-actions">
          <button
            type="button"
            className="catalog-detail-cta catalog-detail-cta-secondary"
            disabled={busy}
            onClick={() => void testConnection()}
          >
            {notionAction === 'test' ? <ButtonSpinner label="Test en cours…" /> : 'Tester la connexion'}
          </button>
          <button
            type="button"
            className="catalog-detail-cta"
            disabled={busy}
            onClick={() => void saveNotion()}
          >
            {notionAction === 'save' ? <ButtonSpinner label="Enregistrement…" /> : 'Enregistrer Notion'}
          </button>
        </div>
        {testMessage && (
          <p className="catalog-notion-test-msg" data-ok={testOk}>
            {testMessage}
          </p>
        )}
      </section>

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
              onChange={(e) => setIntervalDraft(e.target.value)}
              onBlur={() => {
                const n = Number(intervalDraft)
                if (!Number.isFinite(n)) {
                  setIntervalDraft(String(config.refreshIntervalSeconds))
                  return
                }
                const next = Math.max(60, Math.round(n))
                setIntervalDraft(String(next))
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
            onClick={() => void checkApp()}
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
              onClick={() => void downloadApp()}
            >
              Télécharger
            </button>
          )}
          {appUpdate.status === 'ready' && (
            <button
              type="button"
              className="catalog-detail-cta"
              disabled={busy}
              onClick={() => void installApp()}
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
            onClick={() => void checkWidgets()}
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
              onClick={() => void applyWidgetUpdates()}
            >
              Mettre à jour les widgets
            </button>
          )}
        </div>
      </section>

      <section className="catalog-settings-card">
        <h2 className="catalog-settings-title">Fichier config</h2>
        <p className="catalog-settings-path" title={config.configPath}>
          {config.configPath}
        </p>
        <button
          type="button"
          className="catalog-detail-cta"
          onClick={() => void window.lattice.openConfigFile()}
        >
          Ouvrir config.json
        </button>
      </section>

      <footer className="catalog-settings-footer">
        <span className="catalog-version">Lattice v{version || '…'}</span>
        {saveMessage && <span className="catalog-save-status">{saveMessage}</span>}
      </footer>
    </div>
  )
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
    })
    void window.lattice.getAppVersion().then((v) => {
      if (!cancelled) setVersion(v)
    })
    void window.lattice.isCatalogMaximized().then((value) => {
      if (!cancelled) setMaximized(value)
    })
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
          <SettingsPanel
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

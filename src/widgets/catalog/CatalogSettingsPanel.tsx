import { useEffect, useState } from 'react'
import type {
  AppUpdateState,
  PublicConfig,
  TaskPropertyMapping,
  TaskSourceFilters,
  WidgetUpdatesState,
} from '../../../shared/types'
import { SkeletonLines } from '../Skeleton'
import { CatalogAppSettings } from './CatalogAppSettings'
import { CatalogNotionSettings } from './CatalogNotionSettings'
import { CatalogUpdateSettings } from './CatalogUpdateSettings'

export function CatalogSettingsPanel({
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
    void window.lattice.getAppUpdateStatus().then(setAppUpdate).catch(() => undefined)
    void window.lattice.getWidgetUpdateStatus().then(setWidgetUpdate).catch(() => undefined)
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

  const busy = saving || (notionAction !== null && notionAction !== undefined) || (updateBusy !== null && updateBusy !== undefined)
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
      <CatalogNotionSettings
        config={config}
        busy={busy}
        tokenDraft={tokenDraft}
        databaseId={databaseId}
        properties={properties}
        filters={filters}
        completedDraft={completedDraft}
        dbTitle={dbTitle}
        notionAction={notionAction}
        testMessage={testMessage}
        testOk={testOk}
        onTokenDraftChange={setTokenDraft}
        onDatabaseIdChange={setDatabaseId}
        onPropChange={setProp}
        onFiltersChange={setFilters}
        onCompletedDraftChange={setCompletedDraft}
        onTestConnection={testConnection}
        onSaveNotion={saveNotion}
      />

      <CatalogAppSettings
        config={config}
        busy={busy}
        intervalDraft={intervalDraft}
        onIntervalDraftChange={setIntervalDraft}
        onSave={onSave}
      />

      <CatalogUpdateSettings
        config={config}
        version={version}
        busy={busy}
        appUpdate={appUpdate}
        widgetUpdate={widgetUpdate}
        widgetUpdatesAvailable={widgetUpdatesAvailable}
        updateBusy={updateBusy}
        onSave={onSave}
        onCheckApp={checkApp}
        onDownloadApp={downloadApp}
        onInstallApp={installApp}
        onCheckWidgets={checkWidgets}
        onApplyWidgetUpdates={applyWidgetUpdates}
      />

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

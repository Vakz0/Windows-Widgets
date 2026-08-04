/**
 * Catalog / Settings shell window (internal — not a desktop Catalog entry).
 *
 * Why: product opens as an empty shell (D01). This UI lists builtin + external
 * widgets, toggles `enabled` via IPC, and hosts Notion/update settings. It is
 * registered in the React registry only; main creates it via catalogWindow,
 * not electron/widgets/registry builtins.
 */
import { useEffect, useState, useTransition } from 'react'
import type {
  CatalogWidgetInfo,
  PublicConfig,
  WidgetUpdateInfo,
} from '../../shared/types'
import type { CatalogView } from '../vite-env'
import {
  IconClose,
  IconMaximize,
  IconMinimize,
  IconRestore,
} from './catalog/CatalogIcons'
import { CatalogSettingsPanel } from './catalog/CatalogSettingsPanel'
import { CatalogBrowseView } from './catalog/CatalogBrowseView'

function initialView(): CatalogView {
  const params = new URLSearchParams(window.location.search)
  return params.get('view') === 'settings' ? 'settings' : 'catalog'
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
          <CatalogBrowseView
            widgets={widgets}
            widgetsLoading={widgetsLoading}
            selectedId={selectedId}
            pendingId={pendingId}
            remoteWidgets={remoteWidgets}
            installingRemoteId={installingRemoteId}
            onSelect={setSelectedId}
            onToggle={(id, enabled) => void toggle(id, enabled)}
            onInstallRemote={(id) => void installRemote(id)}
          />
        )}
      </div>
    </div>
  )
}

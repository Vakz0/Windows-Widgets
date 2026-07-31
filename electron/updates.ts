import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { AppUpdateState } from '../shared/types'
import { broadcastToAllWindows, showLatticeNotification } from './notify'

export interface AppUpdaterDeps {
  getAutoDownload: () => boolean
  markChecked: () => void
  openSettings: () => void
}

let state: AppUpdateState = { status: 'idle' }
let deps: AppUpdaterDeps | null = null
let wired = false

const MISSING_RELEASE_MESSAGE =
  'Impossible de trouver une release GitHub publiée (latest.yml manquant).'

function formatUpdaterError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (
    /ERR_UPDATER_LATEST_VERSION_NOT_FOUND|Cannot parse releases feed|HttpError:\s*406/i.test(
      message,
    )
  ) {
    return MISSING_RELEASE_MESSAGE
  }
  return message || 'Erreur de mise à jour'
}

function setState(next: AppUpdateState): void {
  state = next
  broadcastToAllWindows('app-update-status', state)
}

function wireEvents(): void {
  if (wired) return
  wired = true

  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    setState({ status: 'checking', message: 'Recherche de mise à jour…' })
  })

  autoUpdater.on('update-available', (info) => {
    const version = info.version
<<<<<<< HEAD
    const auto = Boolean(deps?.getAutoDownload())
=======
    const auto = deps?.getAutoDownload() === true
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    setState({
      status: auto ? 'downloading' : 'available',
      version,
      progress: auto ? 0 : undefined,
      message: auto
        ? `Téléchargement de v${version}…`
        : `Version ${version} disponible`,
    })
    if (!auto) {
      showLatticeNotification({
        body: `Lattice ${version} est disponible. Ouvrez Paramètres pour mettre à jour.`,
        onClick: () => deps?.openSettings(),
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    setState({ status: 'up-to-date', message: 'Lattice est à jour.' })
  })

  autoUpdater.on('download-progress', (p) => {
    const percent = Math.round(p.percent)
    setState({
      status: 'downloading',
      version: state.version,
      progress: percent,
      message: `Téléchargement… ${percent} %`,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    const version = info.version || state.version
    setState({
      status: 'ready',
      version,
      progress: 100,
      message: version
        ? `v${version} prête à installer`
        : 'Mise à jour prête à installer',
    })
    showLatticeNotification({
      body: 'Mise à jour téléchargée. Cliquez pour installer et redémarrer.',
      onClick: () => installAppUpdate(),
    })
  })

  autoUpdater.on('error', (err) => {
    setState({
      status: 'error',
      message: formatUpdaterError(err),
    })
  })
}

export function initAppUpdater(next: AppUpdaterDeps): void {
  deps = next
  wireEvents()
  applyAutoDownload(next.getAutoDownload())
}

export function applyAutoDownload(autoDownload: boolean): void {
  autoUpdater.autoDownload = autoDownload
}

export function getAppUpdateState(): AppUpdateState {
  return state
}

export async function checkForAppUpdates(opts?: {
  silent?: boolean
}): Promise<AppUpdateState> {
<<<<<<< HEAD
  const silent = Boolean(opts?.silent)
=======
  const silent = opts?.silent === true
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644

  if (!app.isPackaged) {
    const next: AppUpdateState = {
      status: 'unsupported',
      message:
        'Les mises à jour automatiques ne sont disponibles qu’avec l’installateur.',
    }
    if (!silent) setState(next)
    return next
  }

<<<<<<< HEAD
  applyAutoDownload(Boolean(deps?.getAutoDownload()))
=======
  applyAutoDownload(deps?.getAutoDownload() === true)
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  wireEvents()
  deps?.markChecked()

  try {
    setState({ status: 'checking', message: 'Recherche de mise à jour…' })
    await autoUpdater.checkForUpdates()
    return state
  } catch (err) {
    const next: AppUpdateState = {
      status: 'error',
      message: formatUpdaterError(err),
    }
    // Always surface errors so a silent startup check doesn't leave UI stuck on "checking"
    setState(next)
    return next
  }
}

export function downloadAppUpdate(): void {
  if (!app.isPackaged) return
  setState({
    status: 'downloading',
    version: state.version,
    progress: state.progress ?? 0,
    message: 'Téléchargement…',
  })
  void autoUpdater.downloadUpdate().catch((err) => {
    setState({
      status: 'error',
      message: formatUpdaterError(err),
    })
  })
}

export function installAppUpdate(): void {
  if (state.status !== 'ready') return
  try {
    autoUpdater.quitAndInstall(false, true)
  } catch (err) {
    setState({
      status: 'error',
      message: formatUpdaterError(err),
    })
  }
}

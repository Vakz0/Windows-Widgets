import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import extractZip from 'extract-zip'
import type {
  WidgetCatalogEntry,
  WidgetUpdateInfo,
  WidgetUpdatesState,
} from '../shared/types'
import {
  externalWidgetsRoot,
  getInstalledWidgetVersions,
  invalidateExternalWidgetsCache,
} from './widgets/discoverExternal'
import { broadcastToAllWindows, showLatticeNotification } from './notify'

const CATALOG_URLS = [
  'https://github.com/Vakz0/Lattice/releases/latest/download/widgets-catalog.json',
  'https://raw.githubusercontent.com/Vakz0/Lattice/main/widgets-catalog.json',
]

export interface WidgetUpdaterDeps {
  getAutoDownload: () => boolean
  getAppVersion: () => string
  openSettings: () => void
  onWidgetsInstalled: () => void
}

let state: WidgetUpdatesState = { status: 'idle', updates: [] }
let deps: WidgetUpdaterDeps | null = null
let catalogCache: WidgetCatalogEntry[] | null = null

function setState(next: WidgetUpdatesState): void {
  state = next
  broadcastToAllWindows('widget-update-status', state)
}

export function getWidgetUpdatesState(): WidgetUpdatesState {
  return state
}

function cmpSemver(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split(/[.+-]/).map((x) => parseInt(x, 10) || 0)
  const pb = b.replace(/^v/i, '').split(/[.+-]/).map((x) => parseInt(x, 10) || 0)
  const n = Math.max(pa.length, pb.length)
  for (let i = 0; i < n; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d > 0) return 1
    if (d < 0) return -1
  }
  return 0
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

function parseCatalog(raw: unknown): WidgetCatalogEntry[] {
  if (!isRecord(raw) || !Array.isArray(raw.widgets)) return []
  const out: WidgetCatalogEntry[] = []
  for (const item of raw.widgets) {
    if (!isRecord(item)) continue
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    const label = typeof item.label === 'string' ? item.label.trim() : id
    const version = typeof item.version === 'string' ? item.version.trim() : ''
    const downloadUrl =
      typeof item.downloadUrl === 'string' ? item.downloadUrl.trim() : ''
    const sha256 =
      typeof item.sha256 === 'string' ? item.sha256.trim().toLowerCase() : ''
    if (!id || !version || !downloadUrl || !sha256) continue
    out.push({
      id,
      label,
      description:
        typeof item.description === 'string' ? item.description : undefined,
      version,
      downloadUrl,
      sha256,
      minAppVersion:
        typeof item.minAppVersion === 'string'
          ? item.minAppVersion
          : undefined,
    })
  }
  return out
}

async function fetchCatalog(): Promise<WidgetCatalogEntry[]> {
  if (catalogCache) return catalogCache
  let lastError: unknown
  for (const url of CATALOG_URLS) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'Lattice-Desk' },
      })
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} for ${url}`)
        continue
      }
      const json = (await res.json()) as unknown
      catalogCache = parseCatalog(json)
      return catalogCache
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Impossible de récupérer le catalogue de widgets')
}

export function invalidateWidgetCatalogCache(): void {
  catalogCache = null
}

function buildUpdateInfos(
  catalog: WidgetCatalogEntry[],
  installed: Record<string, string>,
): WidgetUpdateInfo[] {
  const appVersion = deps?.getAppVersion() ?? app.getVersion()
  return catalog.map((entry) => {
    const installedVersion = installed[entry.id] ?? null
    let status: WidgetUpdateInfo['status'] = 'not-installed'
    if (
      entry.minAppVersion &&
      cmpSemver(appVersion, entry.minAppVersion) < 0
    ) {
      status = 'incompatible'
    } else if (installedVersion == null) {
      status = 'not-installed'
    } else if (cmpSemver(entry.version, installedVersion) > 0) {
      status = 'update-available'
    } else {
      status = 'up-to-date'
    }
    return {
      id: entry.id,
      label: entry.label,
      description: entry.description ?? '',
      installedVersion,
      latestVersion: entry.version,
      status,
    }
  })
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Lattice-Desk' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`Téléchargement échoué (HTTP ${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  await fsp.writeFile(dest, buf)
}

async function sha256File(file: string): Promise<string> {
  const hash = crypto.createHash('sha256')
  const data = await fsp.readFile(file)
  hash.update(data)
  return hash.digest('hex')
}

async function extractPackage(zipPath: string, targetId: string): Promise<void> {
  const root = externalWidgetsRoot()
  await fsp.mkdir(root, { recursive: true })
  const staging = path.join(root, `.staging-${targetId}-${Date.now()}`)
  const finalDir = path.join(root, targetId)
  const backup = path.join(root, `.backup-${targetId}-${Date.now()}`)

  await fsp.mkdir(staging, { recursive: true })
  try {
    await extractZip(zipPath, { dir: staging })

    let contentRoot = staging
    const entries = await fsp.readdir(staging)
    if (
      entries.length === 1 &&
      (await fsp.stat(path.join(staging, entries[0]))).isDirectory()
    ) {
      contentRoot = path.join(staging, entries[0])
    }

    const manifestPath = path.join(contentRoot, 'manifest.json')
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Package invalide : manifest.json manquant')
    }
    const manifest = JSON.parse(
      fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''),
    ) as { id?: string }
    if (manifest.id && manifest.id !== targetId) {
      throw new Error(
        `Package id « ${manifest.id} » ne correspond pas à « ${targetId} »`,
      )
    }

    if (fs.existsSync(finalDir)) {
      await fsp.rename(finalDir, backup)
    }
    await fsp.rename(contentRoot, finalDir)
    if (contentRoot !== staging && fs.existsSync(staging)) {
      await fsp.rm(staging, { recursive: true, force: true })
    }
    if (fs.existsSync(backup)) {
      await fsp.rm(backup, { recursive: true, force: true })
    }
  } catch (err) {
    if (fs.existsSync(backup) && !fs.existsSync(finalDir)) {
      try {
        await fsp.rename(backup, finalDir)
      } catch {
        /* ignore */
      }
    }
    await fsp.rm(staging, { recursive: true, force: true }).catch(() => undefined)
    throw err
  }
}

export function initWidgetUpdater(next: WidgetUpdaterDeps): void {
  deps = next
}

export async function checkWidgetUpdates(opts?: {
  silent?: boolean
}): Promise<WidgetUpdatesState> {
  const silent = opts?.silent === true
  setState({
    status: 'checking',
    updates: state.updates,
    message: 'Recherche de mises à jour widgets…',
  })

  try {
    invalidateWidgetCatalogCache()
    const catalog = await fetchCatalog()
    const updates = buildUpdateInfos(catalog, getInstalledWidgetVersions())
    const toUpdate = updates.filter((u) => u.status === 'update-available')

    if (toUpdate.length === 0) {
      const next: WidgetUpdatesState = {
        status: 'up-to-date',
        updates,
        message:
          catalog.length === 0
            ? 'Aucun widget distant dans le catalogue.'
            : 'Widgets installés à jour.',
      }
      setState(next)
      return next
    }

    setState({
      status: 'available',
      updates,
      message: `${toUpdate.length} widget(s) à mettre à jour`,
    })

    if (deps?.getAutoDownload() === true) {
      return updateWidgets(
        toUpdate.map((u) => u.id),
        { silent: true },
      )
    }

    if (silent) {
      showLatticeNotification({
        body: `${toUpdate.length} mise(s) à jour de widgets disponibles.`,
        onClick: () => deps?.openSettings(),
      })
    }
    return getWidgetUpdatesState()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const next: WidgetUpdatesState = {
      status: 'error',
      updates: state.updates,
      message,
    }
    setState(next)
    return next
  }
}

export async function installOrUpdateWidget(id: string): Promise<{
  ok: boolean
  message: string
}> {
  try {
    const catalog = await fetchCatalog()
    const entry = catalog.find((w) => w.id === id)
    if (!entry) return { ok: false, message: `Widget « ${id} » introuvable dans le catalogue.` }

    const appVersion = deps?.getAppVersion() ?? app.getVersion()
    if (entry.minAppVersion && cmpSemver(appVersion, entry.minAppVersion) < 0) {
      return {
        ok: false,
        message: `Nécessite Lattice ≥ ${entry.minAppVersion}`,
      }
    }

    setState({
      status: 'downloading',
      updates: state.updates,
      progress: 0,
      message: `Téléchargement de ${entry.label}…`,
    })

    const tmpDir = path.join(app.getPath('temp'), 'lattice-widget-updates')
    await fsp.mkdir(tmpDir, { recursive: true })
    const zipPath = path.join(tmpDir, `${id}-${entry.version}.zip`)

    await downloadToFile(entry.downloadUrl, zipPath)
    setState({
      status: 'downloading',
      updates: state.updates,
      progress: 60,
      message: 'Vérification du package…',
    })

    const hash = await sha256File(zipPath)
    if (hash !== entry.sha256) {
      await fsp.unlink(zipPath).catch(() => undefined)
      throw new Error('Checksum SHA-256 invalide — téléchargement corrompu ou altéré.')
    }

    setState({
      status: 'updating',
      updates: state.updates,
      progress: 80,
      message: `Installation de ${entry.label}…`,
    })

    await extractPackage(zipPath, id)
    await fsp.unlink(zipPath).catch(() => undefined)

    invalidateExternalWidgetsCache()
    deps?.onWidgetsInstalled()

    const installed = getInstalledWidgetVersions()
    const updates = buildUpdateInfos(catalog, installed)
    setState({
      status: 'ready',
      updates,
      progress: 100,
      message: `${entry.label} v${entry.version} installé`,
    })

    return { ok: true, message: `${entry.label} v${entry.version} installé` }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    setState({
      status: 'error',
      updates: state.updates,
      message,
    })
    return { ok: false, message }
  }
}

export async function updateWidgets(
  ids?: string[],
  _opts?: { silent?: boolean },
): Promise<WidgetUpdatesState> {
  try {
    const catalog = await fetchCatalog()
    const installed = getInstalledWidgetVersions()
    const infos = buildUpdateInfos(catalog, installed)
    const targets =
      ids?.length
        ? ids
        : infos
            .filter((u) => u.status === 'update-available')
            .map((u) => u.id)

    if (targets.length === 0) {
      const next: WidgetUpdatesState = {
        status: 'up-to-date',
        updates: infos,
        message: 'Aucun widget à mettre à jour.',
      }
      setState(next)
      return next
    }

    let okCount = 0
    for (let i = 0; i < targets.length; i++) {
      const id = targets[i]
      setState({
        status: 'updating',
        updates: state.updates.length ? state.updates : infos,
        progress: Math.round((i / targets.length) * 100),
        message: `Mise à jour ${i + 1}/${targets.length}…`,
      })
      const result = await installOrUpdateWidget(id)
      if (result.ok) okCount++
    }

    const refreshed = buildUpdateInfos(await fetchCatalog(), getInstalledWidgetVersions())
    const next: WidgetUpdatesState = {
      status: okCount === targets.length ? 'ready' : 'error',
      updates: refreshed,
      progress: 100,
      message:
        okCount === targets.length
          ? `${okCount} widget(s) mis à jour`
          : `${okCount}/${targets.length} widget(s) mis à jour`,
    }
    setState(next)

    if (okCount > 0) {
      showLatticeNotification({
        body:
          okCount === 1
            ? 'Un widget a été mis à jour.'
            : `${okCount} widgets ont été mis à jour.`,
        onClick: () => deps?.openSettings(),
      })
    }

    return next
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const next: WidgetUpdatesState = {
      status: 'error',
      updates: state.updates,
      message,
    }
    setState(next)
    return next
  }
}

export async function listRemoteCatalogWidgets(): Promise<WidgetUpdateInfo[]> {
  const catalog = await fetchCatalog()
  return buildUpdateInfos(catalog, getInstalledWidgetVersions())
}

import fsp from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import type { WidgetDefinition, WidgetPlacement, WidgetServiceId } from '../../shared/widget'

const PLACEMENTS: WidgetPlacement[] = ['desktop', 'popup']
const SERVICES: WidgetServiceId[] = [
  'notion',
  'system-stats',
  'temp-daemon',
  'activity-tracker',
]

export interface ExternalWidgetPackage {
  definition: WidgetDefinition
  rootDir: string
  entryFile: string
  version: string
}

/**
 * Emplacement des plugins runtime :
 * `%APPDATA%/lattice-desk/widgets/<id>/manifest.json`
 */
export function externalWidgetsRoot(): string {
  return path.join(app.getPath('userData'), 'widgets')
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

function parseServices(raw: unknown): WidgetServiceId[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((s): s is WidgetServiceId =>
    typeof s === 'string' && (SERVICES as string[]).includes(s),
  )
}

function parseManifest(
  dir: string,
  raw: unknown,
  entryFile: string,
): ExternalWidgetPackage | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!id || id !== path.basename(dir)) return null

  const label = typeof raw.label === 'string' ? raw.label.trim() : id
  const description =
    typeof raw.description === 'string' ? raw.description.trim() : ''
  const version =
    typeof raw.version === 'string' && raw.version.trim()
      ? raw.version.trim()
      : '0.0.0'
  const placement =
    typeof raw.placement === 'string' &&
    (PLACEMENTS as string[]).includes(raw.placement)
      ? (raw.placement as WidgetPlacement)
      : 'desktop'
  const services = parseServices(raw.services)
  const entryRel =
    typeof raw.entry === 'string' && raw.entry.trim()
      ? raw.entry.trim().replace(/\\/g, '/')
      : 'index.html'
  if (entryRel.includes('..') || path.isAbsolute(entryRel)) return null

  let width = 360
  let height = 480
  if (isRecord(raw.defaultBounds)) {
    if (typeof raw.defaultBounds.width === 'number') {
      width = Math.max(120, Math.round(raw.defaultBounds.width))
    }
    if (typeof raw.defaultBounds.height === 'number') {
      height = Math.max(120, Math.round(raw.defaultBounds.height))
    }
  }

  let windowOptions: WidgetDefinition['windowOptions']
  if (isRecord(raw.windowOptions)) {
    windowOptions = {
      resizable:
        typeof raw.windowOptions.resizable === 'boolean'
          ? raw.windowOptions.resizable
          : undefined,
      alwaysOnTop:
        typeof raw.windowOptions.alwaysOnTop === 'boolean'
          ? raw.windowOptions.alwaysOnTop
          : undefined,
    }
  }

  const definition: WidgetDefinition = {
    id,
    label,
    description,
    source: 'external',
    placement,
    services,
    defaultBounds: { width, height },
    windowOptions,
    version,
    entry: entryRel,
  }

  return { definition, rootDir: dir, entryFile, version }
}

let cache: ExternalWidgetPackage[] | null = null

export function invalidateExternalWidgetsCache(): void {
  cache = null
}

async function listExternalWidgetPackages(): Promise<ExternalWidgetPackage[]> {
  if (cache) return cache
  const root = externalWidgetsRoot()
  const found: ExternalWidgetPackage[] = []
  try {
    try {
      await fsp.access(root)
    } catch {
      cache = found
      return found
    }
    for (const name of await fsp.readdir(root)) {
      const dir = path.join(root, name)
      try {
        const st = await fsp.stat(dir)
        if (!st.isDirectory()) continue
        const manifestPath = path.join(dir, 'manifest.json')
        try {
          await fsp.access(manifestPath)
        } catch {
          continue
        }
        const text = (await fsp.readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, '')
        const raw = JSON.parse(text) as unknown
        if (!isRecord(raw)) continue
        const entryRel =
          typeof raw.entry === 'string' && raw.entry.trim()
            ? raw.entry.trim().replace(/\\/g, '/')
            : 'index.html'
        if (entryRel.includes('..') || path.isAbsolute(entryRel)) continue
        const entryFile = path.join(dir, entryRel)
        try {
          await fsp.access(entryFile)
        } catch {
          continue
        }
        const pkg = parseManifest(dir, raw, entryFile)
        if (pkg) found.push(pkg)
      } catch (err) {
        console.error('Invalid external widget', name, err)
      }
    }
  } catch (err) {
    console.error('Failed to scan external widgets', err)
  }
  cache = found
  return found
}

/**
 * Découvre les manifests externes installés sous userData/widgets.
 */
export async function discoverExternalWidgets(): Promise<WidgetDefinition[]> {
  return (await listExternalWidgetPackages()).map((p) => p.definition)
}

export async function getExternalWidgetPackage(
  id: string,
): Promise<ExternalWidgetPackage | undefined> {
  return (await listExternalWidgetPackages()).find((p) => p.definition.id === id)
}

export async function getInstalledWidgetVersions(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const pkg of await listExternalWidgetPackages()) {
    out[pkg.definition.id] = pkg.version
  }
  return out
}

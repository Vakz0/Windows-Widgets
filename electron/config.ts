import fsp from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import type { AppConfig, WindowBounds, WidgetState, UpdatesConfig } from '../shared/types'

const DEFAULT_UPDATES: UpdatesConfig = {
  autoDownload: false,
}

const DEFAULT_CONFIG: AppConfig = {
  notionToken: '',
  databaseId: '',
  properties: {
    title: 'Name',
    date: 'Date',
    tag: 'Tags',
    status: 'Priority',
    urgency: 'Urgency',
    doneCheckbox: 'Done',
  },
  filters: {
    hideCompleted: true,
    completedStatusValues: [],
  },
  refreshIntervalSeconds: 90,
  launchAtStartup: true,
  demoMode: true,
  widgets: {},
  windows: {},
  updates: { ...DEFAULT_UPDATES },
}

/** Legacy installs without `widgets` kept calendar + tasks always on. */
const LEGACY_WIDGETS: Record<string, WidgetState> = {
  calendar: { enabled: true },
  tasks: { enabled: true },
  monitor: { enabled: false },
}

function userConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

function projectConfigPath(): string {
  return path.join(app.getAppPath(), 'config.json')
}

function cwdConfigPath(): string {
  return path.join(process.cwd(), 'config.json')
}

function exampleConfigPath(): string {
  return path.join(app.getAppPath(), 'config.example.json')
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function isSafeObjectKey(key: string): boolean {
  return Boolean(key) && !DANGEROUS_KEYS.has(key)
}

/** Copy only own, non-prototype-polluting keys into a null-prototype map. */
function safeKeyMap<T>(
  source: Record<string, T> | null | undefined,
): Record<string, T> {
  const out = Object.create(null) as Record<string, T>
  if (!source) return out
  for (const key of Object.keys(source)) {
    if (!isSafeObjectKey(key)) continue
    out[key] = source[key]
  }
  return out
}

function deepMerge(base: AppConfig, patch: Partial<AppConfig>): AppConfig {
  return {
    ...base,
    ...patch,
    properties: { ...base.properties, ...(patch.properties ?? {}) },
    filters: { ...base.filters, ...(patch.filters ?? {}) },
    projectSources: patch.projectSources ?? base.projectSources,
    widgets: { ...safeKeyMap(base.widgets), ...safeKeyMap(patch.widgets) },
    windows: { ...safeKeyMap(base.windows), ...safeKeyMap(patch.windows) },
    updates: {
      ...DEFAULT_UPDATES,
      ...base.updates,
      ...patch.updates,
    },
  }
}

/** If the file never had a `widgets` key, restore historical defaults. */
function applyWidgetsMigration(
  cfg: AppConfig,
  raw: Partial<AppConfig>,
): AppConfig {
  if (raw.widgets === undefined) {
    return { ...cfg, widgets: { ...LEGACY_WIDGETS } }
  }
  return cfg
}

function isPlaceholderToken(token: string | undefined): boolean {
  if (!token) return true
  return (
    token.includes('REMPLACE') ||
    token.includes('COLLER_ICI') ||
    token.includes('YOUR_') ||
    token === 'secret_REMPLACE_MOI'
  )
}

function isPlaceholderDatabaseId(id: string | undefined): boolean {
  if (!id) return true
  return id.includes('REMPLACE') || id.includes('YOUR_DATABASE')
}

export function hasValidNotionCredentials(cfg: AppConfig): boolean {
  return (
    !isPlaceholderToken(cfg.notionToken) &&
    Boolean(cfg.databaseId) &&
    !isPlaceholderDatabaseId(String(cfg.databaseId))
  )
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fsp.access(file)
    return true
  } catch {
    return false
  }
}

/** Overlay window positions, widgets, and project sources from userData config. */
async function mergeUserDataOverlays(
  cfg: AppConfig,
  raw: Partial<AppConfig>,
): Promise<AppConfig> {
  let next = cfg
  const userFile = userConfigPath()
  if (!(await fileExists(userFile))) return next
  const userText = (await fsp.readFile(userFile, 'utf8')).replace(/^\uFEFF/, '')
  const userRaw = JSON.parse(userText) as Partial<AppConfig>
  if (userRaw.windows) {
    next = { ...next, windows: { ...safeKeyMap(next.windows), ...safeKeyMap(userRaw.windows) } }
  }
  if (userRaw.widgets) {
    next = { ...next, widgets: { ...safeKeyMap(next.widgets), ...safeKeyMap(userRaw.widgets) } }
  } else if (raw.widgets === undefined && userRaw.widgets === undefined) {
    next = applyWidgetsMigration(next, {})
  }
  if (userRaw.projectSources?.length && !next.projectSources?.length) {
    next = { ...next, projectSources: userRaw.projectSources }
  }
  return next
}

export async function loadConfig(): Promise<AppConfig> {
  const candidates = [cwdConfigPath(), projectConfigPath(), userConfigPath()]
  let fallback: AppConfig | null = null

  for (const file of candidates) {
    try {
      if (!(await fileExists(file))) continue
      const text = (await fsp.readFile(file, 'utf8')).replace(/^\uFEFF/, '')
      const raw = JSON.parse(text) as Partial<AppConfig>
      let cfg = applyWidgetsMigration(deepMerge(DEFAULT_CONFIG, raw), raw)

      if (!hasValidNotionCredentials(cfg)) {
        if (!fallback) fallback = { ...cfg, demoMode: true }
        continue
      }

      cfg.demoMode = Boolean(raw.demoMode)
      // Keep window positions, widgets, and project sources from userData if present
      try {
        const userFile = userConfigPath()
        if (file !== userFile) {
          cfg = await mergeUserDataOverlays(cfg, raw)
        }
      } catch (err) {
        console.debug('loadConfig: migrate user widgets ignored', err)
      }
      // Persist the working config into userData for next launches
      await saveConfig(cfg)
      return cfg
    } catch (err) {
      console.error('Failed to read config', file, err)
    }
  }

  if (fallback) return fallback

  // Seed userData with example so the user can edit it easily
  try {
    const example = exampleConfigPath()
    if (await fileExists(example)) {
      await fsp.copyFile(example, userConfigPath())
      const text = (await fsp.readFile(userConfigPath(), 'utf8')).replace(/^\uFEFF/, '')
      const raw = JSON.parse(text) as Partial<AppConfig>
      return applyWidgetsMigration(deepMerge(DEFAULT_CONFIG, raw), raw)
    }
    await fsp.writeFile(
      userConfigPath(),
      JSON.stringify(DEFAULT_CONFIG, null, 2),
      'utf8',
    )
  } catch (err) {
    console.error('Failed to seed config', err)
  }

  return { ...DEFAULT_CONFIG, widgets: {}, windows: {} }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const file = userConfigPath()
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(file, JSON.stringify(config, null, 2), 'utf8')
}

export async function updateWindowBounds(
  config: AppConfig,
  kind: string,
  bounds: WindowBounds,
): Promise<AppConfig> {
  if (!isSafeObjectKey(kind)) {
    throw new Error(`Invalid window key: ${kind}`)
  }
  const windows = safeKeyMap(config.windows)
  windows[kind] = { ...windows[kind], ...bounds }
  const next: AppConfig = {
    ...config,
    windows,
  }
  await saveConfig(next)
  return next
}

export async function setWidgetEnabled(
  config: AppConfig,
  id: string,
  enabled: boolean,
): Promise<AppConfig> {
  if (!isSafeObjectKey(id)) {
    throw new Error(`Invalid widget id: ${id}`)
  }
  const widgets = safeKeyMap(config.widgets)
  widgets[id] = { enabled }
  const next: AppConfig = {
    ...config,
    widgets,
  }
  await saveConfig(next)
  return next
}

export function isWidgetEnabledInConfig(config: AppConfig, id: string): boolean {
  if (!isSafeObjectKey(id)) return false
  return Boolean(config.widgets?.[id]?.enabled)
}

export function getConfigPath(): string {
  return userConfigPath()
}

export function getUpdatesConfig(config: AppConfig): UpdatesConfig {
  return {
    autoDownload: Boolean(config.updates?.autoDownload),
    lastCheckedAt: config.updates?.lastCheckedAt,
  }
}

export async function setUpdatesConfig(
  config: AppConfig,
  patch: Partial<UpdatesConfig>,
): Promise<AppConfig> {
  const next: AppConfig = {
    ...config,
    updates: {
      ...DEFAULT_UPDATES,
      ...config.updates,
      ...patch,
    },
  }
  await saveConfig(next)
  return next
}

function extractNotionId(input: string): string {
  const trimmed = input.trim()
  const fromPath = trimmed.match(/([0-9a-fA-F]{32})/)
  if (fromPath) {
    const raw = fromPath[1]
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
  }
  const uuid = trimmed.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  )
  return uuid ? uuid[0] : trimmed
}

export function extractDatabaseId(input: string): string {
  return extractNotionId(input)
}

export function extractPageId(input: string): string {
  return extractNotionId(input)
}

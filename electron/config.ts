import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { AppConfig, WindowBounds, WidgetState } from '../shared/types'

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

function deepMerge(base: AppConfig, patch: Partial<AppConfig>): AppConfig {
  return {
    ...base,
    ...patch,
    properties: { ...base.properties, ...(patch.properties ?? {}) },
    filters: { ...base.filters, ...(patch.filters ?? {}) },
    projectSources: patch.projectSources ?? base.projectSources,
    widgets: { ...base.widgets, ...(patch.widgets ?? {}) },
    windows: { ...base.windows, ...(patch.windows ?? {}) },
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

function hasValidCreds(cfg: AppConfig): boolean {
  return (
    !isPlaceholderToken(cfg.notionToken) &&
    Boolean(cfg.databaseId) &&
    !isPlaceholderDatabaseId(String(cfg.databaseId))
  )
}

export function hasValidNotionCredentials(cfg: AppConfig): boolean {
  return hasValidCreds(cfg)
}

export function loadConfig(): AppConfig {
  const candidates = [cwdConfigPath(), projectConfigPath(), userConfigPath()]
  let fallback: AppConfig | null = null

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue
      const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
      const raw = JSON.parse(text) as Partial<AppConfig>
      let cfg = applyWidgetsMigration(deepMerge(DEFAULT_CONFIG, raw), raw)

      if (!hasValidCreds(cfg)) {
        if (!fallback) fallback = { ...cfg, demoMode: true }
        continue
      }

      cfg.demoMode = raw.demoMode === true ? true : false
      // Keep window positions, widgets, and project sources from userData if present
      try {
        const userFile = userConfigPath()
        if (file !== userFile && fs.existsSync(userFile)) {
          const userText = fs.readFileSync(userFile, 'utf8').replace(/^\uFEFF/, '')
          const userRaw = JSON.parse(userText) as Partial<AppConfig>
          if (userRaw.windows) {
            cfg.windows = { ...cfg.windows, ...userRaw.windows }
          }
          if (userRaw.widgets) {
            cfg.widgets = { ...cfg.widgets, ...userRaw.widgets }
          } else if (raw.widgets === undefined && userRaw.widgets === undefined) {
            cfg = applyWidgetsMigration(cfg, {})
          }
          if (userRaw.projectSources?.length && !cfg.projectSources?.length) {
            cfg.projectSources = userRaw.projectSources
          }
        }
      } catch {
        /* ignore */
      }
      // Persist the working config into userData for next launches
      saveConfig(cfg)
      return cfg
    } catch (err) {
      console.error('Failed to read config', file, err)
    }
  }

  if (fallback) return fallback

  // Seed userData with example so the user can edit it easily
  try {
    const example = exampleConfigPath()
    if (fs.existsSync(example)) {
      fs.copyFileSync(example, userConfigPath())
      const text = fs.readFileSync(userConfigPath(), 'utf8').replace(/^\uFEFF/, '')
      const raw = JSON.parse(text) as Partial<AppConfig>
      return applyWidgetsMigration(deepMerge(DEFAULT_CONFIG, raw), raw)
    }
    fs.writeFileSync(userConfigPath(), JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to seed config', err)
  }

  return { ...DEFAULT_CONFIG, widgets: {}, windows: {} }
}

export function saveConfig(config: AppConfig): void {
  const file = userConfigPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf8')
}

export function updateWindowBounds(
  config: AppConfig,
  kind: string,
  bounds: WindowBounds,
): AppConfig {
  const next: AppConfig = {
    ...config,
    windows: {
      ...config.windows,
      [kind]: { ...config.windows?.[kind], ...bounds },
    },
  }
  saveConfig(next)
  return next
}

export function setWidgetEnabled(
  config: AppConfig,
  id: string,
  enabled: boolean,
): AppConfig {
  const next: AppConfig = {
    ...config,
    widgets: {
      ...config.widgets,
      [id]: { enabled },
    },
  }
  saveConfig(next)
  return next
}

export function isWidgetEnabledInConfig(config: AppConfig, id: string): boolean {
  return config.widgets?.[id]?.enabled === true
}

export function getConfigPath(): string {
  return userConfigPath()
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

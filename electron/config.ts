import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { AppConfig, WindowBounds } from '../shared/types'

const DEFAULT_CONFIG: AppConfig = {
  notionToken: '',
  databaseId: 'https://www.notion.so/3a7c67f21872804889cace3d58d51606',
  properties: {
    title: 'Tâche',
    date: 'Date',
    tag: 'État',
    status: 'Importance',
    urgency: 'Urgence',
    doneCheckbox: '',
  },
  filters: {
    hideCompleted: true,
    completedStatusValues: [],
  },
  refreshIntervalSeconds: 90,
  launchAtStartup: true,
  demoMode: true,
  windows: {},
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
    windows: { ...base.windows, ...(patch.windows ?? {}) },
  }
}

function isPlaceholderToken(token: string | undefined): boolean {
  if (!token) return true
  return (
    token.includes('REMPLACE') ||
    token.includes('COLLER_ICI') ||
    token === 'secret_REMPLACE_MOI'
  )
}

function hasValidCreds(cfg: AppConfig): boolean {
  return (
    !isPlaceholderToken(cfg.notionToken) &&
    Boolean(cfg.databaseId) &&
    !String(cfg.databaseId).includes('REMPLACE')
  )
}

export function loadConfig(): AppConfig {
  const candidates = [cwdConfigPath(), projectConfigPath(), userConfigPath()]
  let fallback: AppConfig | null = null

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue
      const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
      const raw = JSON.parse(text) as Partial<AppConfig>
      const cfg = deepMerge(DEFAULT_CONFIG, raw)

      if (!hasValidCreds(cfg)) {
        if (!fallback) fallback = { ...cfg, demoMode: true }
        continue
      }

      cfg.demoMode = raw.demoMode === true ? true : false
      // Keep window positions from userData if present
      try {
        const userFile = userConfigPath()
        if (file !== userFile && fs.existsSync(userFile)) {
          const userText = fs.readFileSync(userFile, 'utf8').replace(/^\uFEFF/, '')
          const userRaw = JSON.parse(userText) as Partial<AppConfig>
          if (userRaw.windows) {
            cfg.windows = { ...cfg.windows, ...userRaw.windows }
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
    } else {
      fs.writeFileSync(userConfigPath(), JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
    }
  } catch (err) {
    console.error('Failed to seed config', err)
  }

  return { ...DEFAULT_CONFIG }
}

export function saveConfig(config: AppConfig): void {
  const file = userConfigPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf8')
}

export function updateWindowBounds(
  config: AppConfig,
  kind: 'calendar' | 'tasks' | 'monitor',
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

export function getConfigPath(): string {
  return userConfigPath()
}

export function extractDatabaseId(input: string): string {
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

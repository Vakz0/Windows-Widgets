import { app, BrowserWindow, nativeImage } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export const DEV_URL = process.env.VITE_DEV_SERVER_URL
export const isDev = Boolean(DEV_URL)

export function resolveAsset(...parts: string[]): string {
  const candidates = [
    path.join(process.resourcesPath, ...parts),
    path.join(app.getAppPath(), ...parts),
    path.join(__dirname, '..', ...parts),
    path.join(process.cwd(), ...parts),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

export function preloadPath(): string {
  return path.join(__dirname, 'preload.js')
}

/** Icône app (barre des tâches / Alt-Tab). Préfère .ico sous Windows. */
export function appIconPath(): string {
  const ico = resolveAsset('assets', 'icon.ico')
  if (fs.existsSync(ico)) return ico
  return resolveAsset('assets', 'icon.png')
}

export function appIconImage(): Electron.NativeImage {
  const img = nativeImage.createFromPath(appIconPath())
  return img.isEmpty() ? nativeImage.createEmpty() : img
}

export function applyWindowIcon(win: BrowserWindow): void {
  const icon = appIconImage()
  if (!icon.isEmpty()) win.setIcon(icon)
}

export function defaultWebPreferences(
  overrides: Partial<Electron.WebPreferences> = {},
): Electron.WebPreferences {
  return {
    preload: preloadPath(),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    backgroundThrottling: true,
    spellcheck: false,
    v8CacheOptions: 'code',
    ...overrides,
  }
}

export function loadRendererWidget(
  win: BrowserWindow,
  widgetId: string,
  query: Record<string, string> = {},
): void {
  const params = { widget: widgetId, ...query }
  if (isDev && DEV_URL) {
    const search = new URLSearchParams(params).toString()
    void win.loadURL(`${DEV_URL}?${search}`)
    return
  }
  void win.loadFile(path.join(__dirname, '../dist/index.html'), { query: params })
}

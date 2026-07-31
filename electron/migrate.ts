import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

const LEGACY_APP_DATA_DIRS = ['windows-widgets', 'Windows Widgets']

const MIGRATED_FILES = [
  'config.json',
  'temp-cache.json',
  'cpu-temp.pid',
] as const

/** Copy user config and temp daemon state from pre-rename APPDATA folders. */
export function migrateLegacyUserData(): void {
  const userData = app.getPath('userData')
  if (fs.existsSync(path.join(userData, 'config.json'))) return

  const appData = app.getPath('appData')
  const userDataBase = path.basename(userData)
  const legacyDir = LEGACY_APP_DATA_DIRS.map((legacyName) => path.join(appData, legacyName)).find(
    (dir) => path.basename(dir) !== userDataBase && fs.existsSync(dir),
  )
  if (!legacyDir) return

  fs.mkdirSync(userData, { recursive: true })

  for (const file of MIGRATED_FILES) {
    const from = path.join(legacyDir, file)
    const to = path.join(userData, file)
    if (!fs.existsSync(from) || fs.existsSync(to)) continue
    fs.copyFileSync(from, to)
  }
}

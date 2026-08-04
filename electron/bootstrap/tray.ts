/** Tray icon + tooltip helpers. */
import { Tray, nativeImage } from 'electron'
import fs from 'node:fs'
import { isTempServiceRunning } from '../system'
import { resolveAsset } from '../windows/helpers'
import type { SystemStats } from '../../shared/types'

export function createTrayIcon(): Electron.NativeImage {
  const candidates = [
    resolveAsset('assets', 'tray.png'),
    resolveAsset('assets', 'tray-16.png'),
    resolveAsset('assets', 'icon.png'),
  ]
  for (const iconFile of candidates) {
    if (fs.existsSync(iconFile)) {
      const img = nativeImage.createFromPath(iconFile)
      if (!img.isEmpty()) {
        return img.resize({ width: 16, height: 16, quality: 'best' })
      }
    }
  }
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2NkYGD4z0ABYBzVMKoB' +
      'BgZGRgYGBgYGRgYGBgYAwv4CAf1yQ9kAAAAASUVORK5CYII=',
    'base64',
  )
  return nativeImage.createFromBuffer(png)
}

export function updateTrayTooltip(
  tray: Tray | null,
  statsCache: SystemStats | null,
): void {
  if (!tray) return
  if (!statsCache) {
    tray.setToolTip('Lattice')
    return
  }
  const cached = statsCache
  void isTempServiceRunning().then((running) => {
    if (!tray || statsCache !== cached) return
    let temp: string
    if (cached.temperatureC !== null && cached.temperatureC !== undefined) {
      temp = `${cached.temperatureC}°C`
    } else if (running) {
      temp = 'temp. …'
    } else {
      temp = 'temp. arrêtée'
    }
    tray.setToolTip(
      `CPU ${cached.cpuPercent}% · RAM ${cached.ramPercent}% · ${temp}`,
    )
  })
}

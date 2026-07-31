import { Notification, nativeImage, app, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

let cachedIcon: Electron.NativeImage | undefined | null = null

function resolveIcon(): Electron.NativeImage | undefined {
  if (cachedIcon !== null) return cachedIcon ?? undefined
  const candidates = [
    path.join(process.resourcesPath, 'assets', 'icon.png'),
    path.join(app.getAppPath(), 'assets', 'icon.png'),
    path.join(process.cwd(), 'assets', 'icon.png'),
  ]
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue
      const img = nativeImage.createFromPath(file)
      if (!img.isEmpty()) {
        cachedIcon = img
        return img
      }
<<<<<<< HEAD
    } catch (err) {
      console.debug('resolveAppIcon: unreadable icon path', err)
=======
    } catch {
      /* ignore unreadable icon paths */
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    }
  }
  cachedIcon = undefined
  return undefined
}

/** Broadcast an IPC event to every open BrowserWindow. */
export function broadcastToAllWindows(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

export function showLatticeNotification(opts: {
  title?: string
  body: string
  onClick?: () => void
}): void {
  if (!Notification.isSupported()) return
  try {
    const n = new Notification({
      title: opts.title ?? 'Lattice',
      body: opts.body,
      icon: resolveIcon(),
    })
    if (opts.onClick) {
      n.on('click', () => opts.onClick?.())
    }
    n.show()
  } catch (err) {
    console.error('Notification failed', err)
  }
}

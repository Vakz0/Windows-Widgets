import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
<<<<<<< HEAD
import fsp from 'node:fs/promises'
=======
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { app } from 'electron'
import si from 'systeminformation'
import type { SystemStats } from '../shared/types'

const execFileAsync = promisify(execFile)

<<<<<<< HEAD
/** Plausible CPU package temperature bounds (°C). */
const TEMP_CELSIUS_MIN = 1
const TEMP_CELSIUS_MAX = 125
/** Reuse a successful temp reading for this long. */
const TEMP_CACHE_TTL_MS = 45_000
/** After a failed read, wait before retrying all readers. */
const TEMP_MISS_COOLDOWN_MS = 15_000

=======
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
let lastCpuLoad = 0
let prevIdle = 0
let prevTotal = 0
let tempCache: number | null = null
let tempFetchedAt = 0
let tempSource: string | null = null

function sampleCpuPercent(): number {
  const cpus = os.cpus()
  let idle = 0
  let total = 0
  for (const cpu of cpus) {
    idle += cpu.times.idle
    total +=
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys +
      cpu.times.idle +
      cpu.times.irq
  }

  const idleDelta = idle - prevIdle
  const totalDelta = total - prevTotal
  prevIdle = idle
  prevTotal = total

  if (totalDelta <= 0) return lastCpuLoad
  const percent = Math.round(100 - (100 * idleDelta) / totalDelta)
  lastCpuLoad = Math.min(100, Math.max(0, percent))
  return lastCpuLoad
}

function tempCachePath(): string {
  return path.join(app.getPath('userData'), 'temp-cache.json')
}

<<<<<<< HEAD
function resolveCpuTempExe(): string | null {
=======
export function resolveCpuTempExe(): string | null {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  const candidates = [
    path.join(process.resourcesPath, 'cpu-temp', 'cpu-temp.exe'),
    path.join(app.getAppPath(), 'tools', 'cpu-temp', 'publish', 'cpu-temp.exe'),
    path.join(process.cwd(), 'tools', 'cpu-temp', 'publish', 'cpu-temp.exe'),
    path.join(__dirname, '..', 'tools', 'cpu-temp', 'publish', 'cpu-temp.exe'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

<<<<<<< HEAD
async function readTempCacheFile(): Promise<number | null> {
  try {
    const file = tempCachePath()
    try {
      await fsp.access(file)
    } catch {
      return null
    }
    const raw = JSON.parse(await fsp.readFile(file, 'utf8')) as {
=======
function readTempCacheFile(): number | null {
  try {
    const file = tempCachePath()
    if (!fs.existsSync(file)) return null
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
      ok?: boolean
      celsius?: number
      updatedAt?: string
    }
    if (!raw.ok || typeof raw.celsius !== 'number') return null
    if (raw.updatedAt) {
      const age = Date.now() - new Date(raw.updatedAt).getTime()
      if (age > 120_000) return null
    }
    return raw.celsius
<<<<<<< HEAD
  } catch (err) {
    console.debug('readTempCacheFile: ignored', err)
=======
  } catch {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    return null
  }
}

async function tempFromEmbeddedHelper(): Promise<number | null> {
<<<<<<< HEAD
  const cached = await readTempCacheFile()
  if (cached !== null && cached !== undefined) {
=======
  const cached = readTempCacheFile()
  if (cached != null) {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    tempSource = 'capteur intégré'
    return cached
  }

  const exe = resolveCpuTempExe()
  if (!exe) return null

  try {
    const { stdout } = await execFileAsync(exe, [], {
      timeout: 8000,
      windowsHide: true,
    })
    const line = String(stdout).trim().split(/\r?\n/).filter(Boolean).pop()
    if (!line) return null
    const parsed = JSON.parse(line) as { ok?: boolean; celsius?: number }
    if (parsed.ok && typeof parsed.celsius === 'number') {
      tempSource = 'capteur intégré'
      return parsed.celsius
    }
<<<<<<< HEAD
  } catch (err) {
    console.debug('tempFromEmbeddedHelper: needs admin/driver', err)
=======
  } catch {
    /* needs admin / driver */
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  }
  return null
}

export async function startTempDaemonElevated(): Promise<{ ok: boolean; message: string }> {
  const exe = resolveCpuTempExe()
  if (!exe) {
    return { ok: false, message: 'Helper cpu-temp.exe introuvable. Rebuild l’app.' }
  }

  const escaped = exe.replace(/'/g, "''")
  try {
    await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Start-Process -FilePath '${escaped}' -ArgumentList '--daemon' -WindowStyle Hidden -Verb RunAs`,
      ],
      { timeout: 60_000, windowsHide: true },
    )
    // Give the elevated process a moment to write the first sample
    await new Promise((r) => setTimeout(r, 1500))
<<<<<<< HEAD
    const value = await readTempCacheFile()
    if (value !== null && value !== undefined) {
=======
    const value = readTempCacheFile()
    if (value != null) {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
      tempCache = value
      tempFetchedAt = Date.now()
      tempSource = 'capteur intégré'
      return { ok: true, message: `Température active : ${value}°C. Tu peux fermer LibreHardwareMonitor.` }
    }
    return {
      ok: true,
      message:
        'Service température lancé (admin). Rouvre le monitoring dans 2–3 s. Tu peux fermer LibreHardwareMonitor.',
    }
  } catch (err) {
    return { ok: false, message: `Échec activation : ${String(err)}` }
  }
}

<<<<<<< HEAD
export async function isTempServiceRunning(): Promise<boolean> {
  try {
    const pidFile = path.join(app.getPath('userData'), 'cpu-temp.pid')
    try {
      await fsp.access(pidFile)
    } catch {
      return false
    }
    const pid = Number((await fsp.readFile(pidFile, 'utf8')).trim())
=======
export function isTempServiceRunning(): boolean {
  try {
    const pidFile = path.join(app.getPath('userData'), 'cpu-temp.pid')
    if (!fs.existsSync(pidFile)) return false
    const pid = Number(fs.readFileSync(pidFile, 'utf8').trim())
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    if (!Number.isFinite(pid) || pid <= 0) return false
    try {
      process.kill(pid, 0)
      return true
<<<<<<< HEAD
    } catch (err) {
      console.debug('isTempServiceRunning: process not alive', err)
      try {
        await fsp.unlink(pidFile)
      } catch (unlinkErr) {
        console.debug('isTempServiceRunning: unlink pid ignored', unlinkErr)
      }
      return false
    }
  } catch (err) {
    console.debug('isTempServiceRunning: ignored', err)
=======
    } catch {
      try {
        fs.unlinkSync(pidFile)
      } catch {
        /* ignore */
      }
      return false
    }
  } catch {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    return false
  }
}

<<<<<<< HEAD
async function clearTempCache(): Promise<void> {
=======
export function clearTempCache(): void {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  tempCache = null
  tempFetchedAt = 0
  tempSource = null
  try {
<<<<<<< HEAD
    await fsp.unlink(tempCachePath())
  } catch (err) {
    console.debug('clearTempCache: unlink ignored', err)
  }
}

export async function stopTempDaemon(): Promise<{
  ok: boolean
  message: string
  stopped: boolean
}> {
  try {
    const wasRunning = await isTempServiceRunning()
    const pidFile = path.join(app.getPath('userData'), 'cpu-temp.pid')
    try {
      await fsp.access(pidFile)
      const pid = Number((await fsp.readFile(pidFile, 'utf8')).trim())
      if (Number.isFinite(pid) && pid > 0) {
        try {
          process.kill(pid)
        } catch (err) {
          console.debug('stopTempDaemon: kill already dead', err)
        }
      }
      try {
        await fsp.unlink(pidFile)
      } catch (err) {
        console.debug('stopTempDaemon: unlink pid ignored', err)
      }
    } catch (err) {
      console.debug('stopTempDaemon: no pid file', err)
    }
    await clearTempCache()
=======
    const file = tempCachePath()
    if (fs.existsSync(file)) fs.unlinkSync(file)
  } catch {
    /* ignore */
  }
}

export function stopTempDaemon(): { ok: boolean; message: string; stopped: boolean } {
  try {
    const wasRunning = isTempServiceRunning()
    const pidFile = path.join(app.getPath('userData'), 'cpu-temp.pid')
    if (fs.existsSync(pidFile)) {
      const pid = Number(fs.readFileSync(pidFile, 'utf8').trim())
      if (Number.isFinite(pid) && pid > 0) {
        try {
          process.kill(pid)
        } catch {
          /* already dead */
        }
      }
      try {
        fs.unlinkSync(pidFile)
      } catch {
        /* ignore */
      }
    }
    clearTempCache()
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    if (!wasRunning) {
      return {
        ok: true,
        stopped: true,
        message: 'Service température : déjà arrêté.',
      }
    }
    return {
      ok: true,
      stopped: true,
      message: 'Service température : arrêté.\nLes mesures ne seront plus mises à jour.',
    }
  } catch (err) {
    return { ok: false, stopped: false, message: String(err) }
  }
}

function parseCelsius(text: string): number | null {
  const m = text.replace(',', '.').match(/(-?\d+(?:\.\d+)?)\s*°?\s*C/i)
  if (!m) return null
  const n = Number(m[1])
<<<<<<< HEAD
  if (!Number.isFinite(n) || n < TEMP_CELSIUS_MIN || n > TEMP_CELSIUS_MAX) return null
=======
  if (!Number.isFinite(n) || n < 1 || n > 125) return null
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  return Math.round(n)
}

function walkLhmJson(node: unknown, out: Array<{ name: string; value: number }>): void {
  if (!node || typeof node !== 'object') return
  const obj = node as Record<string, unknown>
  const text = String(obj.Text ?? obj.Name ?? '')
  const valueRaw = obj.Value
  if (
    typeof valueRaw === 'string' &&
    /temperature|package|core|cpu|tdie|tctl/i.test(text + String(obj.Type ?? ''))
  ) {
    const c = parseCelsius(valueRaw)
<<<<<<< HEAD
    if (c !== null && c !== undefined) out.push({ name: text, value: c })
=======
    if (c != null) out.push({ name: text, value: c })
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  } else if (
    typeof valueRaw === 'number' &&
    /temperature/i.test(String(obj.Type ?? obj.SensorType ?? ''))
  ) {
<<<<<<< HEAD
    if (valueRaw > TEMP_CELSIUS_MIN && valueRaw < TEMP_CELSIUS_MAX) {
      out.push({ name: text, value: Math.round(valueRaw) })
    }
=======
    if (valueRaw > 1 && valueRaw < 125) out.push({ name: text, value: Math.round(valueRaw) })
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  }

  const children = obj.Children
  if (Array.isArray(children)) {
    for (const child of children) walkLhmJson(child, out)
  }
}

function pickBestTemp(samples: Array<{ name: string; value: number }>): number | null {
  if (!samples.length) return null
  const preferred = samples.find((s) =>
    /package|tctl|tdie|cpu\(tcpu\)|cpu average|cpu temperature/i.test(s.name),
  )
  if (preferred) return preferred.value
  const cores = samples.filter((s) => /core/i.test(s.name))
  if (cores.length) {
    return Math.round(cores.reduce((a, b) => a + b.value, 0) / cores.length)
  }
  return Math.max(...samples.map((s) => s.value))
}

function fetchJson(url: string, timeoutMs = 800): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      if ((res.statusCode ?? 500) >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`))
        res.resume()
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch (err) {
          reject(err)
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

async function tempFromLibreHardwareMonitorWeb(): Promise<number | null> {
<<<<<<< HEAD
  // intentional: try ports sequentially — first successful response wins
=======
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  for (const port of [8085, 8086, 8090]) {
    try {
      const data = await fetchJson(`http://127.0.0.1:${port}/data.json`)
      const samples: Array<{ name: string; value: number }> = []
      walkLhmJson(data, samples)
      const best = pickBestTemp(samples)
<<<<<<< HEAD
      if (best !== null && best !== undefined) {
        tempSource = `LibreHardwareMonitor :${port}`
        return best
      }
    } catch (err) {
      console.debug('tempFromLibreHardwareMonitorWeb: try next', err)
=======
      if (best != null) {
        tempSource = `LibreHardwareMonitor :${port}`
        return best
      }
    } catch {
      /* try next */
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    }
  }
  return null
}

async function tempFromSystemInformation(): Promise<number | null> {
  try {
    const temp = await si.cpuTemperature()
    if (typeof temp.main === 'number' && temp.main > 0) return Math.round(temp.main)
    if (typeof temp.max === 'number' && temp.max > 0) return Math.round(temp.max)
    if (Array.isArray(temp.cores) && temp.cores.length) {
      const valid = temp.cores.filter((c): c is number => typeof c === 'number' && c > 0)
      if (valid.length) return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
    }
<<<<<<< HEAD
  } catch (err) {
    console.debug('tempFromSystemInformation: ignored', err)
=======
  } catch {
    /* ignore */
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  }
  return null
}

async function readTemperature(): Promise<number | null> {
  const now = Date.now()
<<<<<<< HEAD
  if (now - tempFetchedAt < TEMP_CACHE_TTL_MS && tempCache !== null && tempCache !== undefined) {
    return tempCache
  }
  if (
    now - tempFetchedAt < TEMP_MISS_COOLDOWN_MS &&
    (tempCache === null || tempCache === undefined) &&
    tempFetchedAt > 0
  ) {
=======
  if (now - tempFetchedAt < 45_000 && tempCache != null) return tempCache
  if (now - tempFetchedAt < 15_000 && tempCache == null && tempFetchedAt > 0) {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    return null
  }

  const readers = [
    tempFromEmbeddedHelper,
    tempFromLibreHardwareMonitorWeb,
    tempFromSystemInformation,
  ]

<<<<<<< HEAD
  // intentional: fallback chain — stop at the first reader that returns a value
  for (const reader of readers) {
    try {
      const value = await reader()
      if (value !== null && value !== undefined) {
=======
  for (const reader of readers) {
    try {
      const value = await reader()
      if (value != null) {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
        tempCache = value
        tempFetchedAt = now
        if (!tempSource) tempSource = 'system'
        return value
      }
<<<<<<< HEAD
    } catch (err) {
      console.debug('readTemperature: next reader', err)
=======
    } catch {
      /* next */
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    }
  }

  tempFetchedAt = now
  tempSource = null
  return tempCache
}

<<<<<<< HEAD
=======
export function getTempSource(): string | null {
  return tempSource
}

>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
export async function getSystemStats(opts: {
  includeTemp?: boolean
} = {}): Promise<SystemStats> {
  const cpuPercent = sampleCpuPercent()
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free

  const temperatureC = opts.includeTemp ? await readTemperature() : tempCache

  return {
    cpuPercent,
    ramPercent: Math.round((used / total) * 100),
    ramUsedGb: Math.round((used / 1024 / 1024 / 1024) * 10) / 10,
    ramTotalGb: Math.round((total / 1024 / 1024 / 1024) * 10) / 10,
    temperatureC,
<<<<<<< HEAD
    tempSource: temperatureC !== null && temperatureC !== undefined ? tempSource : null,
=======
    tempSource: temperatureC != null ? tempSource : null,
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    updatedAt: new Date().toISOString(),
  }
}

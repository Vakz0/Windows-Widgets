/**
 * Local HTTP bridge for the Lattice Media browser extension.
 * Bound to 127.0.0.1 only — reports active HTML5 / Media Session playback
 * so the activity tracker can suppress AFK while a video/audio is playing,
 * and accumulates per-domain watch time (Visionnage).
 */
import http from 'node:http'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import type { ActivityCategory, ActivitySiteBreakdown } from '../shared/types'
import { categoryFromDomain, normalizeDomain } from './activityContext'
import {
  activityDir,
  bridgeMetaPath,
  daysDir,
  ensureDirs,
  todayKey,
  watchPath,
  assertWithin,
  resolveWithin,
} from './activity/paths'

const MEDIA_BRIDGE_PORT = 17_384
const MEDIA_BRIDGE_HOST = '127.0.0.1'

/** Heartbeat must refresh within this window or playing is considered stale. */
const MEDIA_TTL_MS = 45_000
/** Must match extensions/lattice-media/background.js MAX_DELTA_MS. */
const MAX_DELTA_MS = 30_000

type MediaState = {
  playing: boolean
  expiresAt: number
  title: string | null
  origin: string | null
}

type WatchDelta = { domain: string; deltaMs: number }

let state: MediaState = {
  playing: false,
  expiresAt: 0,
  title: null,
  origin: null,
}

let server: http.Server | null = null
let bridgeToken: string | null = null
let onWatchChange: (() => void) | null = null
let watchCache: { date: string; map: Record<string, number> } | null = null
let persistTimer: ReturnType<typeof setTimeout> | null = null
let notifyTimer: ReturnType<typeof setTimeout> | null = null

export function setMediaWatchListener(cb: (() => void) | null): void {
  onWatchChange = cb
}

async function ensureToken(): Promise<string> {
  if (bridgeToken) return bridgeToken
  const file = assertWithin(activityDir(), bridgeMetaPath())
  try {
    await fsp.access(file)
    const raw = JSON.parse(await fsp.readFile(file, 'utf8')) as {
      token?: string
      port?: number
    }
    if (typeof raw.token === 'string' && raw.token.length >= 16) {
      bridgeToken = raw.token
      return bridgeToken
    }
  } catch (err) {
    console.debug('ensureToken: regenerate below', err)
  }
  bridgeToken = randomBytes(24).toString('hex')
  try {
    ensureDirs()
    await fsp.writeFile(
      file,
      `${JSON.stringify(
        {
          port: MEDIA_BRIDGE_PORT,
          host: MEDIA_BRIDGE_HOST,
          token: bridgeToken,
          endpoint: `http://${MEDIA_BRIDGE_HOST}:${MEDIA_BRIDGE_PORT}/v1/media`,
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
  } catch (err) {
    console.error('Activity media bridge: failed to write token file', err)
  }
  return bridgeToken
}

function setCors(res: http.ServerResponse, req: http.IncomingMessage): void {
  const origin = req.headers.origin
  if (
    origin === 'null' ||
    (typeof origin === 'string' &&
      (origin.startsWith('chrome-extension://') ||
        origin.startsWith('moz-extension://')))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Lattice-Token',
  )
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > 32_768) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function tokenOk(req: http.IncomingMessage): boolean {
  // Token is loaded at startMediaBridge; sync check uses in-memory value only.
  const expected = bridgeToken
  if (!expected) return false
  const header = req.headers['x-lattice-token']
  const got = Array.isArray(header) ? header[0] : header
  return typeof got === 'string' && got === expected
}

function snapshot(): {
  playing: boolean
  title: string | null
  origin: string | null
  expiresAt: number | null
} {
  const now = Date.now()
  if (!state.playing || now > state.expiresAt) {
    return { playing: false, title: null, origin: null, expiresAt: null }
  }
  return {
    playing: true,
    title: state.title,
    origin: state.origin,
    expiresAt: state.expiresAt,
  }
}

export function isMediaKeepAwakeActive(): boolean {
  return snapshot().playing
}

function loadWatchMapFromDisk(date: string): Record<string, number> {
  const file = assertWithin(daysDir(), watchPath(date))
  try {
    if (!fs.existsSync(file)) return {}
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        out[normalizeDomain(k)] = Math.round(v)
      }
    }
    return out
  } catch (err) {
    console.debug('loadWatchMapFromDisk: ignored', err)
    return {}
  }
}

export function readWatchMap(date: string): Record<string, number> {
  if (watchCache?.date === date) return watchCache.map
  const map = loadWatchMapFromDisk(date)
  watchCache = { date, map }
  return map
}

export function getTopWatch(
  date: string,
  limit = 8,
  overrides?: Record<string, ActivityCategory> | null,
): ActivitySiteBreakdown[] {
  const map = readWatchMap(date)
  return Object.entries(map)
    .map(([domain, ms]) => {
      const hit = categoryFromDomain(domain, overrides)
      const category: ActivityCategory = hit?.category ?? 'entertainment'
      return { domain, ms, category }
    })
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit)
}

function scheduleWatchPersist(date: string): void {
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    if (!watchCache || watchCache.date !== date) return
    void (async () => {
      try {
        ensureDirs()
        const file = watchPath(date)
        const tmp = resolveWithin(daysDir(), `${path.basename(file)}.${process.pid}.tmp`)
        await fsp.writeFile(tmp, `${JSON.stringify(watchCache!.map)}\n`, 'utf8')
        await fsp.rename(tmp, assertWithin(daysDir(), file))
      } catch (err) {
        console.error('Activity media bridge: watch persist failed', err)
      }
    })()
  }, 1_500)
}

function scheduleWatchNotify(): void {
  if (notifyTimer) return
  notifyTimer = setTimeout(() => {
    notifyTimer = null
    onWatchChange?.()
  }, 750)
}

function applyWatchDeltas(deltas: WatchDelta[], date = todayKey()): void {
  if (!deltas.length) return
  const map =
    watchCache?.date === date ? watchCache.map : { ...loadWatchMapFromDisk(date) }
  let changed = false
  for (const entry of deltas) {
    const domain = normalizeDomain(entry.domain || '')
    if (!domain) continue
    let delta = Math.round(Number(entry.deltaMs))
    if (!Number.isFinite(delta) || delta <= 0) continue
    if (delta > MAX_DELTA_MS) delta = MAX_DELTA_MS
    map[domain] = (map[domain] ?? 0) + delta
    changed = true
  }
  if (!changed) return
  watchCache = { date, map }
  scheduleWatchPersist(date)
  scheduleWatchNotify()
}

/** Drop in-memory watch totals (after clearActivityData). */
export function invalidateWatchCache(): void {
  watchCache = null
}

function parseWatchArray(raw: unknown): WatchDelta[] {
  if (!Array.isArray(raw)) return []
  const out: WatchDelta[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as { domain?: unknown; deltaMs?: unknown }
    if (typeof row.domain !== 'string' || typeof row.deltaMs !== 'number') continue
    out.push({ domain: row.domain, deltaMs: row.deltaMs })
  }
  return out
}

function json(
  res: http.ServerResponse,
  req: http.IncomingMessage,
  status: number,
  body: unknown,
): void {
  setCors(res, req)
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

async function handleMediaPost(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  if (!tokenOk(req)) {
    json(res, req, 401, { ok: false, message: 'token invalide' })
    return
  }
  let body: {
    playing?: unknown
    title?: unknown
    origin?: unknown
    watch?: unknown
  }
  try {
    const raw = await readBody(req)
    body = raw ? (JSON.parse(raw) as typeof body) : {}
  } catch (err) {
    console.debug('handleMediaPost: invalid JSON', err)
    json(res, req, 400, { ok: false, message: 'JSON invalide' })
    return
  }

  const playing = Boolean(body.playing)
  const now = Date.now()
  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : null
  const origin =
    typeof body.origin === 'string' && body.origin.trim()
      ? body.origin.trim().slice(0, 200)
      : null

  state = playing
    ? {
        playing: true,
        expiresAt: now + MEDIA_TTL_MS,
        title,
        origin,
      }
    : {
        playing: false,
        expiresAt: 0,
        title: null,
        origin: null,
      }

  applyWatchDeltas(parseWatchArray(body.watch))
  json(res, req, 200, { ok: true, ...snapshot() })
}

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const url = new URL(req.url || '/', `http://${MEDIA_BRIDGE_HOST}`)
  const method = req.method || 'GET'

  if (method === 'OPTIONS') {
    setCors(res, req)
    res.writeHead(204)
    res.end()
    return
  }

  if (url.pathname === '/v1/health' && method === 'GET') {
    json(res, req, 200, {
      ok: true,
      service: 'lattice-media-bridge',
      port: MEDIA_BRIDGE_PORT,
    })
    return
  }

  if (url.pathname === '/v1/media' && method === 'GET') {
    if (!tokenOk(req)) {
      json(res, req, 401, { ok: false, message: 'token invalide' })
      return
    }
    json(res, req, 200, { ok: true, ...snapshot() })
    return
  }

  if (url.pathname === '/v1/media' && method === 'POST') {
    await handleMediaPost(req, res)
    return
  }

  json(res, req, 404, { ok: false, message: 'not found' })
}

export function startMediaBridge(): void {
  if (server) return
  void ensureToken().then(() => {
    if (server) return
    server = http.createServer((req, res) => {
      void handleRequest(req, res).catch((err) => {
        console.error('Activity media bridge request failed', err)
        try {
          json(res, req, 500, { ok: false, message: 'internal error' })
        } catch (err) {
          console.debug('media bridge: response end fallback', err)
          res.end()
        }
      })
    })
    server.on('error', (err) => {
      console.error('Activity media bridge listen error', err)
      server = null
    })
    server.listen(MEDIA_BRIDGE_PORT, MEDIA_BRIDGE_HOST, () => {
      console.info(
        `Activity media bridge on http://${MEDIA_BRIDGE_HOST}:${MEDIA_BRIDGE_PORT}`,
      )
    })
  })
}

export function stopMediaBridge(): void {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  if (notifyTimer) {
    clearTimeout(notifyTimer)
    notifyTimer = null
  }
  // Flush pending watch map before closing.
  if (watchCache) {
    const snapshot = watchCache
    void (async () => {
      try {
        ensureDirs()
        const file = watchPath(snapshot.date)
        const tmp = resolveWithin(daysDir(), `${path.basename(file)}.${process.pid}.tmp`)
        await fsp.writeFile(tmp, `${JSON.stringify(snapshot.map)}\n`, 'utf8')
        await fsp.rename(tmp, assertWithin(daysDir(), file))
      } catch (err) {
        console.error('Activity media bridge: final watch flush failed', err)
      }
    })()
  }
  if (!server) return
  const s = server
  server = null
  state = {
    playing: false,
    expiresAt: 0,
    title: null,
    origin: null,
  }
  s.close()
}

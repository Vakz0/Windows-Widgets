const ENDPOINT = 'http://127.0.0.1:17384/v1/media'
/** Must match electron/activityMediaBridge.ts MAX_DELTA_MS. */
const MAX_DELTA_MS = 30_000

/**
 * Per-tab, per-frame state. YouTube has many iframes: a false from an ad
 * frame must not overwrite playing:true from the main player frame.
 * @type {Map<number, Map<number, { playing: boolean, title: string | null, origin: string | null, at: number }>>}
 */
const tabFrames = new Map()

/** @type {number | null} */
let lastFlushAt = null
/** @type {string | null} */
let cachedToken = null

async function getToken() {
  if (cachedToken !== null) return cachedToken
  const { token } = await chrome.storage.sync.get({ token: '' })
  cachedToken = typeof token === 'string' ? token.trim() : ''
  return cachedToken
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.token) cachedToken = null
})

function normalizeDomain(originOrHost) {
  if (!originOrHost || typeof originOrHost !== 'string') return null
  try {
    const raw = originOrHost.includes('://')
      ? originOrHost
      : `https://${originOrHost}`
    let host = new URL(raw).hostname.toLowerCase().replace(/\.$/, '')
    if (host.startsWith('www.')) host = host.slice(4)
    return host || null
  } catch (err) {
    console.debug('normalizeDomain: ignored', err)
    return null
  }
}

/**
 * Domains that currently have at least one playing frame (wall-clock union).
 * @returns {Map<string, { title: string | null, origin: string | null, at: number }>}
 */
function playingDomains() {
  /** @type {Map<string, { title: string | null, origin: string | null, at: number }>} */
  const map = new Map()
  const states = [...tabFrames.values()].flatMap((frames) => [...frames.values()])
  for (const st of states) {
    if (!st.playing) continue
    const domain = normalizeDomain(st.origin)
    if (!domain) continue
    const prev = map.get(domain)
    if (!prev || st.at >= prev.at) {
      map.set(domain, {
        title: st.title,
        origin: st.origin,
        at: st.at,
      })
    }
  }
  return map
}

function aggregatePlaying() {
  const domains = playingDomains()
  let playing = false
  let title = null
  let origin = null
  let latest = 0
  for (const [domain, st] of domains) {
    playing = true
    if (st.at >= latest) {
      latest = st.at
      title = st.title
      origin = st.origin ?? `https://${domain}`
    }
  }
  return { playing, title, origin, domains }
}

/**
 * @param {Map<string, { title: string | null, origin: string | null, at: number }>} domains
 * @param {number} now
 */
function buildWatchDeltas(domains, now) {
  /** @type {{ domain: string, deltaMs: number }[]} */
  const watch = []
  if (domains.size === 0) {
    lastFlushAt = now
    return watch
  }
  const prev = lastFlushAt ?? now
  let delta = now - prev
  if (delta < 0) delta = 0
  if (delta > MAX_DELTA_MS) delta = MAX_DELTA_MS
  lastFlushAt = now
  if (delta <= 0) return watch
  for (const domain of domains.keys()) {
    watch.push({ domain, deltaMs: delta })
  }
  return watch
}

async function postMedia(payload) {
  const token = await getToken()
  if (!token) {
    await chrome.storage.session.set({
      lastError: 'Token manquant — ouvrir les options de l’extension.',
      lastOk: false,
    })
    return
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lattice-Token': token,
      },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    await chrome.storage.session.set({
      lastOk: res.ok,
      lastError: res.ok ? null : body.message || `HTTP ${res.status}`,
      lastPayload: payload,
      lastAt: Date.now(),
    })
  } catch (err) {
    await chrome.storage.session.set({
      lastOk: false,
      lastError:
        err instanceof Error
          ? err.message
          : 'Lattice injoignable (widget Activité démarré ?)',
      lastAt: Date.now(),
    })
  }
}

async function flush() {
  const now = Date.now()
  const { playing, title, origin, domains } = aggregatePlaying()
  const watch = buildWatchDeltas(domains, now)
  await postMedia({
    playing,
    title,
    origin,
    watch,
  })
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'lattice-media') return
  const tabId = sender.tab?.id
  if (typeof tabId !== 'number') {
    sendResponse?.({ ok: false })
    return
  }
  const frameId = typeof sender.frameId === 'number' ? sender.frameId : 0
  let frames = tabFrames.get(tabId)
  if (!frames) {
    frames = new Map()
    tabFrames.set(tabId, frames)
  }
  const beforeDomains = playingDomains()
  const wasPlaying = beforeDomains.size > 0
  frames.set(frameId, {
    playing: Boolean(msg.playing),
    title: typeof msg.title === 'string' ? msg.title : null,
    origin: typeof msg.origin === 'string' ? msg.origin : null,
    at: Date.now(),
  })
  const afterDomains = playingDomains()
  const nowPlaying = afterDomains.size > 0
  // First transition into playing: reset flush clock so we don't credit a huge gap.
  if (!wasPlaying && nowPlaying) {
    lastFlushAt = Date.now()
  }
  void (async () => {
    // On stop: credit the last interval against domains that were still playing.
    if (wasPlaying && !nowPlaying) {
      const now = Date.now()
      const watch = buildWatchDeltas(beforeDomains, now)
      await postMedia({
        playing: false,
        title: null,
        origin: null,
        watch,
      })
    } else {
      await flush()
    }
    sendResponse?.({ ok: true })
  })()
  return true
})

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabFrames.delete(tabId)) void flush()
})

chrome.webNavigation?.onCommitted?.addListener?.((details) => {
  if (details.frameId === 0 && tabFrames.has(details.tabId)) {
    tabFrames.set(details.tabId, new Map())
    void flush()
  }
})

async function injectOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })
    await Promise.all(
      tabs.map(async (tab) => {
        if (typeof tab.id !== 'number') return
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ['content.js'],
          })
        } catch (err) {
          console.debug('injectOpenTabs: skip tab', err)
        }
      }),
    )
  } catch (err) {
    console.debug('injectOpenTabs: missing permission', err)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void injectOpenTabs()
})
chrome.runtime.onStartup.addListener(() => {
  void injectOpenTabs()
})

setInterval(() => {
  void flush()
}, 10_000)

void injectOpenTabs()
void flush()

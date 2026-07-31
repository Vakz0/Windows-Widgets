/**
 * Detects HTMLMediaElement / Media Session / YouTube player playback.
 */
;(() => {
  if (window.__latticeMediaBridge) return
  window.__latticeMediaBridge = true

  const HEARTBEAT_MS = 8_000
  let playing = false
  let lastSent = 0
  let scanTimer = null

  function mediaTitle() {
    try {
      const ms = navigator.mediaSession?.metadata
      if (ms?.title) return String(ms.title)
    } catch {
      /* ignore */
    }
    return (document.title || '').slice(0, 200) || null
  }

  function anyMediaPlaying() {
    try {
      if (navigator.mediaSession?.playbackState === 'playing') return true
    } catch {
      /* ignore */
    }

    try {
      const host = location.hostname.replace(/^www\./, '')
      if (
        host.endsWith('youtube.com') ||
        host.endsWith('youtu.be') ||
        host.endsWith('youtube-nocookie.com')
      ) {
        const player =
          document.getElementById('movie_player') ||
          document.querySelector('.html5-video-player')
        if (player?.classList?.contains('playing-mode')) return true
        if (player?.classList?.contains('paused-mode')) return false
        const video =
          document.querySelector('video.html5-main-video') ||
          document.querySelector('#movie_player video')
        if (video && !video.paused && !video.ended) return true
      }
    } catch {
      /* ignore */
    }

    try {
      for (const el of document.querySelectorAll('audio, video')) {
        if (!el.paused && !el.ended) return true
      }
    } catch {
      /* ignore */
    }
    return false
  }

  function push(force = false) {
    const next = anyMediaPlaying()
    const now = Date.now()
    if (!force && next === playing && now - lastSent < HEARTBEAT_MS - 500) return
    playing = next
    lastSent = now
    try {
      chrome.runtime.sendMessage({
        type: 'lattice-media',
        playing,
        title: playing ? mediaTitle() : null,
        origin: location.origin,
      })
    } catch {
      /* extension context invalidated */
    }
  }

  function scheduleScan() {
    if (scanTimer) return
    scanTimer = setTimeout(() => {
      scanTimer = null
      scan()
    }, 250)
  }

  function hook(el) {
    if (!el || el.dataset.latticeMediaHooked === '1') return
    el.dataset.latticeMediaHooked = '1'
    // Discrete state events only — never timeupdate (bypasses throttle → POST flood).
    for (const ev of ['play', 'playing', 'pause', 'ended', 'emptied', 'abort']) {
      el.addEventListener(ev, () => push(true), { passive: true })
    }
  }

  function scan() {
    document.querySelectorAll('audio, video').forEach(hook)
    push(false)
  }

  new MutationObserver(() => scheduleScan()).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  scan()
  setInterval(() => push(true), HEARTBEAT_MS)
  document.addEventListener('visibilitychange', () => push(true), { passive: true })
  window.addEventListener('focus', () => push(true), { passive: true })
})()

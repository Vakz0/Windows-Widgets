const statusEl = document.getElementById('status')
document.getElementById('opts').addEventListener('click', (e) => {
  e.preventDefault()
  chrome.runtime.openOptionsPage()
})

function domainFromOrigin(origin) {
  if (!origin) return null
  try {
    let host = new URL(origin).hostname.replace(/^www\./, '')
    return host || null
  } catch {
    return null
  }
}

chrome.storage.session.get(
  { lastOk: null, lastError: null, lastPayload: null, lastAt: null },
  (data) => {
    if (data.lastOk && data.lastPayload?.playing) {
      const domain =
        domainFromOrigin(data.lastPayload.origin) ||
        data.lastPayload.watch?.[0]?.domain ||
        null
      statusEl.className = 'row ok'
      statusEl.textContent = domain
        ? `Lecture · ${domain} (temps → Lattice)`
        : 'Lecture signalée (temps → Lattice)'
      return
    }
    if (data.lastOk) {
      statusEl.className = 'row'
      statusEl.textContent = 'Connecté · pas de lecture'
      return
    }
    if (data.lastError) {
      statusEl.className = 'row err'
      statusEl.textContent = data.lastError
      return
    }
    statusEl.textContent = 'En attente — configurez le token.'
  },
)

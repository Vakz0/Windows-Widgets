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
<<<<<<< HEAD
    if (data.lastOk && data.lastPayload?.playing) {
=======
    if (data.lastOk === true && data.lastPayload?.playing) {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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
<<<<<<< HEAD
    if (data.lastOk) {
=======
    if (data.lastOk === true) {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
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

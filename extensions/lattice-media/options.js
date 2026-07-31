const tokenEl = document.getElementById('token')
const statusEl = document.getElementById('status')
const saveBtn = document.getElementById('save')

chrome.storage.sync.get({ token: '' }, (data) => {
  tokenEl.value = data.token || ''
})

saveBtn.addEventListener('click', async () => {
  const token = tokenEl.value.trim()
  await chrome.storage.sync.set({ token })
  statusEl.textContent = token
    ? 'Token enregistré. Lancez une vidéo pour tester.'
    : 'Token vide — le pont ne fonctionnera pas.'
  statusEl.className = token ? 'ok' : 'err'

  if (!token) return
  try {
    const res = await fetch('http://127.0.0.1:17384/v1/health')
    statusEl.textContent = res.ok
      ? 'Token enregistré · Lattice joignable.'
      : `Token enregistré · Lattice HTTP ${res.status}`
    statusEl.className = res.ok ? 'ok' : 'err'
  } catch {
    statusEl.textContent =
      'Token enregistré · Lattice injoignable (démarrez le widget Activité).'
    statusEl.className = 'err'
  }
})

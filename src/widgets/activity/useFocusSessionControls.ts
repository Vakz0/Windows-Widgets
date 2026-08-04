import { useEffect, useRef, useState } from 'react'
import type {
  FocusJournalEntry,
  FocusSession,
} from '../../vite-env'
import { errMessage } from './format'

function syncAllowlistFields(
  session: FocusSession | null,
  setters: {
    setAllowApps: (v: string) => void
    setAllowDomains: (v: string) => void
    setAllowProjects: (v: string) => void
    setAllowUrls: (v: string) => void
  },
) {
  setters.setAllowApps((session?.allowlist.apps ?? []).join(', '))
  setters.setAllowDomains((session?.allowlist.domains ?? []).join(', '))
  setters.setAllowProjects((session?.allowlist.ideProjects ?? []).join(', '))
  setters.setAllowUrls((session?.allowlist.urls ?? []).join(', '))
}

type FocusControlsDeps = {
  viewDate: string
  viewDateRef: React.MutableRefObject<string>
  setBusy: (v: boolean) => void
  setStatus: (message: string | null, isError?: boolean) => void
  setSummary: (s: Awaited<ReturnType<typeof window.lattice.getActivitySummary>>) => void
  onFocusSessionFromActivity?: (session: FocusSession | null) => void
}

/** Focus session + journal + allowlist controls for the activity widget. */
export function useFocusSessionControls(deps: FocusControlsDeps) {
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null)
  const [journal, setJournal] = useState<FocusJournalEntry[]>([])
  const [allowApps, setAllowApps] = useState('')
  const [allowDomains, setAllowDomains] = useState('')
  const [allowProjects, setAllowProjects] = useState('')
  const [allowUrls, setAllowUrls] = useState('')

  const allowSetters = useRef({
    setAllowApps,
    setAllowDomains,
    setAllowProjects,
    setAllowUrls,
  })
  allowSetters.current = { setAllowApps, setAllowDomains, setAllowProjects, setAllowUrls }

  function applyAllowlist(session: FocusSession | null) {
    syncAllowlistFields(session, allowSetters.current)
  }

  function loadJournal(date: string) {
    void window.lattice.getFocusJournal(date).then(setJournal).catch(() => setJournal([]))
  }

  useEffect(() => {
    let alive = true
    void window.lattice
      .getFocusSession()
      .then((s) => {
        if (!alive) return
        setFocusSession(s)
        applyAllowlist(s)
      })
      .catch(() => undefined)
    loadJournal(deps.viewDateRef.current)
    const offFocus = window.lattice.onFocusSessionUpdated((s) => {
      setFocusSession(s)
      applyAllowlist(s)
      loadJournal(deps.viewDateRef.current)
    })
    return () => {
      alive = false
      offFocus()
    }
  }, [])

  useEffect(() => {
    loadJournal(deps.viewDate)
  }, [deps.viewDate])

  function ingestFromActivitySummary(session: FocusSession | null | undefined) {
    if (session === undefined) return
    setFocusSession(session)
    applyAllowlist(session)
    deps.onFocusSessionFromActivity?.(session)
  }

  async function focusPauseToggle() {
    if (!focusSession) return
    deps.setBusy(true)
    try {
      const next =
        focusSession.status === 'paused'
          ? await window.lattice.resumeFocusSession()
          : await window.lattice.pauseFocusSession()
      setFocusSession(next)
      applyAllowlist(next)
      const s = await window.lattice.getActivitySummary(deps.viewDate)
      deps.setSummary(s)
    } catch (err) {
      deps.setStatus(errMessage(err, 'Session focus impossible.'), true)
    } finally {
      deps.setBusy(false)
    }
  }

  async function focusStop() {
    deps.setBusy(true)
    try {
      await window.lattice.stopFocusSession()
      setFocusSession(null)
      applyAllowlist(null)
      const s = await window.lattice.getActivitySummary(deps.viewDate)
      deps.setSummary(s)
      deps.setStatus('Session focus terminée.')
    } catch (err) {
      deps.setStatus(errMessage(err, 'Arrêt de session impossible.'), true)
    } finally {
      deps.setBusy(false)
    }
  }

  async function saveAllowlist() {
    if (!focusSession) return
    deps.setBusy(true)
    try {
      const next = await window.lattice.updateFocusAllowlist({
        apps: allowApps.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
        domains: allowDomains.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
        ideProjects: allowProjects.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
        urls: allowUrls.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
      })
      setFocusSession(next)
      applyAllowlist(next)
      deps.setStatus('Allowlist mise à jour.')
    } catch (err) {
      deps.setStatus(errMessage(err, 'Allowlist impossible à enregistrer.'), true)
    } finally {
      deps.setBusy(false)
    }
  }

  return {
    focusSession,
    setFocusSession,
    journal,
    allowApps,
    allowDomains,
    allowProjects,
    allowUrls,
    setAllowApps,
    setAllowDomains,
    setAllowProjects,
    setAllowUrls,
    applyAllowlist,
    ingestFromActivitySummary,
    loadJournal,
    focusPauseToggle,
    focusStop,
    saveAllowlist,
  }
}

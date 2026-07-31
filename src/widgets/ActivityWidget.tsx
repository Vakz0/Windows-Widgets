<<<<<<< HEAD
import { ActivityCategoryBars } from './activity/ActivityCategoryBars'
import { ActivityFocusJournal } from './activity/ActivityFocusJournal'
import { ActivityFocusPanel } from './activity/ActivityFocusPanel'
import { ActivityNowCard } from './activity/ActivityNowCard'
import { ActivityOptionsFooter } from './activity/ActivityOptionsFooter'
import { ActivityTopLists } from './activity/ActivityTopLists'
import { errMessage, formatDayTitle, formatDuration, todayKey } from './activity/format'
import { useActivityWidget } from './activity/useActivityWidget'

export function ActivityWidget() {
  const {
    data,
    settings,
    viewDate,
    busy,
    hint,
    hintError,
    confirmClear,
    optionsOpen,
    journal,
    allowApps,
    allowDomains,
    allowProjects,
    isToday,
    activeMs,
    categoryRows,
    qualityHint,
    session,
    afkLabel,
    setAllowApps,
    setAllowDomains,
    setAllowProjects,
    setOptionsOpen,
    setConfirmClear,
    setStatus,
    goDay,
    togglePause,
    toggleStoreTitles,
    toggleParseIde,
    setIdleThreshold,
    cycleFocusDwell,
    doExport,
    cycleBrowserDetail,
    doClear,
    correct,
    reloadRules,
    focusPauseToggle,
    focusStop,
    saveAllowlist,
    addCurrentToAllowlist,
  } = useActivityWidget()
=======
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActivityBrowserDetail,
  ActivityCategory,
  ActivityCorrectionScope,
  ActivityDaySummary,
  ActivitySettings,
  FocusJournalEntry,
  FocusSession,
} from '../vite-env'

const CATEGORY_ORDER: ActivityCategory[] = [
  'work',
  'entertainment',
  'communication',
  'system',
  'other',
  'afk',
]

const EDITABLE_CATEGORIES: ActivityCategory[] = [
  'work',
  'entertainment',
  'communication',
  'system',
  'other',
]

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  work: 'Travail',
  entertainment: 'Divertissement',
  communication: 'Communication',
  system: 'Système',
  other: 'Autre',
  afk: 'AFK',
}

const AFK_PRESETS = [
  { sec: 60, label: '1 min' },
  { sec: 120, label: '2 min' },
  { sec: 180, label: '3 min' },
  { sec: 300, label: '5 min' },
  { sec: 600, label: '10 min' },
] as const

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + deltaDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayTitle(date: string, today: string): string {
  if (date === today) return 'Aujourd’hui'
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, '0')}`
}

function formatShortDuration(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMin = Math.max(1, Math.round(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m}m`
  return `${h}h${String(m).padStart(2, '0')}`
}

function emptySummary(date = todayKey()): ActivityDaySummary {
  return {
    date,
    totalMs: 0,
    byCategory: {
      work: 0,
      entertainment: 0,
      communication: 0,
      system: 0,
      other: 0,
      afk: 0,
    },
    topApps: [],
    topSites: [],
    topProjects: [],
    paused: false,
    tracking: false,
    quality: {
      otherShare: 0,
      lowConfidenceShare: 0,
      unknownAppCount: 0,
      feedbackCountToday: 0,
    },
    current: null,
    urlHelperAvailable: true,
    mediaKeepAwake: false,
    topWatch: [],
    focusSession: null,
    topTasks: [],
  }
}

const FOCUS_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  interrupted: 'Interrompue',
  paused: 'En pause',
}

function contextLine(current: NonNullable<ActivityDaySummary['current']>): string | null {
  if (current.domain) return current.domain
  if (current.projectName && current.fileName) {
    return `${current.fileName} · ${current.projectName}`
  }
  if (current.projectName) return current.projectName
  if (current.fileName) return current.fileName
  return null
}

function errMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  return fallback
}

export function ActivityWidget() {
  const [summary, setSummary] = useState<ActivityDaySummary | null>(null)
  const [settings, setSettings] = useState<ActivitySettings | null>(null)
  const [viewDate, setViewDate] = useState(todayKey)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [hintError, setHintError] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null)
  const [journal, setJournal] = useState<FocusJournalEntry[]>([])
  const [allowApps, setAllowApps] = useState('')
  const [allowDomains, setAllowDomains] = useState('')
  const [allowProjects, setAllowProjects] = useState('')
  const viewDateRef = useRef(viewDate)
  viewDateRef.current = viewDate

  function setStatus(message: string | null, isError = false) {
    setHint(message)
    setHintError(isError)
  }

  function syncAllowlistFields(session: FocusSession | null) {
    setAllowApps((session?.allowlist.apps ?? []).join(', '))
    setAllowDomains((session?.allowlist.domains ?? []).join(', '))
    setAllowProjects((session?.allowlist.ideProjects ?? []).join(', '))
  }

  function loadJournal(date: string) {
    void window.lattice.getFocusJournal(date).then(setJournal).catch(() => setJournal([]))
  }

  useEffect(() => {
    let alive = true
    void window.lattice.getActivitySummary(viewDate).then((s) => {
      if (alive) setSummary(s)
    })
    void window.lattice.getActivitySettings().then((s) => {
      if (alive) setSettings(s)
    })
    void window.lattice.getFocusSession().then((s) => {
      if (!alive) return
      setFocusSession(s)
      syncAllowlistFields(s)
    })
    loadJournal(viewDate)
    const offActivity = window.lattice.onActivityUpdated((s) => {
      if (viewDateRef.current === todayKey()) {
        setSummary(s)
      }
      if (s.focusSession !== undefined) {
        setFocusSession(s.focusSession)
        syncAllowlistFields(s.focusSession)
      }
      setSettings((prev) =>
        prev
          ? { ...prev, paused: s.paused }
          : {
              paused: s.paused,
              storeTitles: true,
              idleThresholdSec: 180,
              browserDetail: 'domain',
              parseIdeTitles: true,
              focusOffProjectDwellSec: 8,
            },
      )
    })
    const offFocus = window.lattice.onFocusSessionUpdated((s) => {
      setFocusSession(s)
      syncAllowlistFields(s)
      loadJournal(viewDateRef.current)
    })
    return () => {
      alive = false
      offActivity()
      offFocus()
    }
  }, [])

  useEffect(() => {
    let alive = true
    void window.lattice.getActivitySummary(viewDate).then((s) => {
      if (alive) setSummary(s)
    })
    loadJournal(viewDate)
    return () => {
      alive = false
    }
  }, [viewDate])

  const data = summary ?? emptySummary(viewDate)
  const isToday = data.date === todayKey()
  const activeMs = useMemo(() => {
    return CATEGORY_ORDER.filter((c) => c !== 'afk').reduce(
      (acc, c) => acc + (data.byCategory[c] ?? 0),
      0,
    )
  }, [data])

  const categoryRows = useMemo(() => {
    return CATEGORY_ORDER.map((id) => ({
      id,
      label: CATEGORY_LABELS[id],
      ms: data.byCategory[id] ?? 0,
    })).filter((row) => row.ms > 0 || row.id === 'work' || row.id === 'entertainment')
  }, [data])

  const qualityHint = useMemo(() => {
    const pct = Math.round((data.quality?.otherShare ?? 0) * 100)
    if (pct < 8) return null
    return `${pct} % Autre — à corriger`
  }, [data.quality])

  async function goDay(delta: number) {
    const next = shiftDate(viewDate, delta)
    if (delta > 0 && viewDate >= todayKey()) return
    if (next > todayKey()) {
      setViewDate(todayKey())
      return
    }
    setViewDate(next)
    setConfirmClear(false)
  }

  async function patchSettings(patch: Partial<ActivitySettings>, okHint?: string) {
    setBusy(true)
    setStatus(null)
    try {
      const next = await window.lattice.updateActivitySettings(patch)
      setSettings(next)
      if (okHint) setStatus(okHint)
      if (isToday) {
        const s = await window.lattice.getActivitySummary(viewDate)
        setSummary(s)
      }
    } catch (err) {
      setStatus(errMessage(err, 'Impossible de mettre à jour les réglages.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function togglePause() {
    await patchSettings({ paused: !data.paused })
  }

  async function toggleStoreTitles() {
    if (!settings) return
    await patchSettings(
      { storeTitles: !settings.storeTitles },
      !settings.storeTitles
        ? 'Titres de fenêtres enregistrés.'
        : 'Seuls les noms d’apps sont stockés (hash conservé).',
    )
  }

  async function toggleParseIde() {
    if (!settings) return
    await patchSettings(
      { parseIdeTitles: !settings.parseIdeTitles },
      !settings.parseIdeTitles
        ? 'Parse titres IDE activé.'
        : 'Parse titres IDE désactivé.',
    )
  }

  async function setIdleThreshold(sec: number) {
    await patchSettings(
      { idleThresholdSec: sec },
      `Seuil AFK : ${AFK_PRESETS.find((p) => p.sec === sec)?.label ?? `${sec}s`}.`,
    )
  }

  async function cycleFocusDwell() {
    if (!settings) return
    const presets = [5, 8, 12, 20]
    const cur = settings.focusOffProjectDwellSec ?? 8
    const idx = presets.indexOf(cur)
    const next = presets[(idx + 1) % presets.length]
    await patchSettings(
      { focusOffProjectDwellSec: next },
      `Interruption focus après ${next}s hors allowlist.`,
    )
  }

  async function doExport(format: 'csv' | 'json') {
    setBusy(true)
    setStatus(null)
    try {
      const res = await window.lattice.exportActivity({
        format,
        from: data.date,
        to: data.date,
      })
      setStatus(
        res.ok ? `Exporté : ${res.path}` : res.message ?? 'Export annulé.',
        !res.ok && Boolean(res.message),
      )
    } catch (err) {
      setStatus(errMessage(err, 'Export impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function cycleBrowserDetail() {
    if (!settings) return
    const order: ActivityBrowserDetail[] = ['domain', 'url', 'off']
    const idx = order.indexOf(settings.browserDetail ?? 'domain')
    const nextDetail = order[(idx + 1) % order.length]
    await patchSettings(
      { browserDetail: nextDetail },
      nextDetail === 'domain'
        ? 'Navigateur : domaine uniquement.'
        : nextDetail === 'url'
          ? 'Navigateur : URL complète.'
          : 'Navigateur : détail désactivé.',
    )
  }

  async function doClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      setStatus('Confirmer : effacer tout l’historique ? (règles conservées)')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const res = await window.lattice.clearActivityData()
      if (res.summary) {
        setViewDate(todayKey())
        setSummary(res.summary)
      }
      setStatus(res.message, !res.ok)
      setConfirmClear(false)
    } catch (err) {
      setStatus(errMessage(err, 'Effacement impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function correct(
    app: string,
    category: ActivityCategory,
    scope: ActivityCorrectionScope,
    titleSample?: string | null,
    domain?: string | null,
  ) {
    setBusy(true)
    setStatus(null)
    try {
      const res = await window.lattice.correctActivityCategory({
        app,
        category,
        scope,
        titleSample,
        domain,
      })
      if (res.summary && isToday) setSummary(res.summary)
      else if (res.ok) {
        const s = await window.lattice.getActivitySummary(viewDate)
        setSummary(s)
      }
      setStatus(
        res.ok ? res.message ?? 'Correction enregistrée.' : res.message ?? 'Échec.',
        !res.ok,
      )
    } catch (err) {
      setStatus(errMessage(err, 'Correction impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function reloadRules() {
    setBusy(true)
    setStatus(null)
    try {
      await window.lattice.reloadActivityRules()
      const s = await window.lattice.getActivitySummary(viewDate)
      setSummary(s)
      setStatus('Règles rechargées.')
      setConfirmClear(false)
    } catch (err) {
      setStatus(errMessage(err, 'Rechargement des règles impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function focusPauseToggle() {
    if (!focusSession) return
    setBusy(true)
    try {
      const next =
        focusSession.status === 'paused'
          ? await window.lattice.resumeFocusSession()
          : await window.lattice.pauseFocusSession()
      setFocusSession(next)
      syncAllowlistFields(next)
      const s = await window.lattice.getActivitySummary(viewDate)
      setSummary(s)
    } catch (err) {
      setStatus(errMessage(err, 'Session focus impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function focusStop() {
    setBusy(true)
    try {
      await window.lattice.stopFocusSession()
      setFocusSession(null)
      syncAllowlistFields(null)
      const s = await window.lattice.getActivitySummary(viewDate)
      setSummary(s)
      setStatus('Session focus terminée.')
    } catch (err) {
      setStatus(errMessage(err, 'Arrêt de session impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function saveAllowlist() {
    if (!focusSession) return
    setBusy(true)
    try {
      const next = await window.lattice.updateFocusAllowlist({
        apps: allowApps.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
        domains: allowDomains.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
        ideProjects: allowProjects.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
      })
      setFocusSession(next)
      syncAllowlistFields(next)
      setStatus('Allowlist mise à jour.')
    } catch (err) {
      setStatus(errMessage(err, 'Allowlist impossible à enregistrer.'), true)
    } finally {
      setBusy(false)
    }
  }

  function addCurrentToAllowlist() {
    if (!data.current || data.current.ignored) return
    if (data.current.app) {
      const apps = new Set(
        allowApps.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
      )
      apps.add(data.current.app)
      setAllowApps([...apps].join(', '))
    }
    if (data.current.domain) {
      const domains = new Set(
        allowDomains.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
      )
      domains.add(data.current.domain)
      setAllowDomains([...domains].join(', '))
    }
    if (data.current.projectName) {
      const projects = new Set(
        allowProjects.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
      )
      projects.add(data.current.projectName)
      setAllowProjects([...projects].join(', '))
    }
  }

  const session = focusSession ?? data.focusSession
  const topTasks = data.topTasks ?? []

  const afkLabel =
    AFK_PRESETS.find((p) => p.sec === settings?.idleThresholdSec)?.label ??
    (settings ? `${settings.idleThresholdSec}s` : '…')
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644

  return (
    <div className="widget-shell activity-shell drag-region">
      <header className="activity-header">
        <div>
          <div className="activity-kicker">Activité</div>
          <div className="activity-title-row">
            <button
              type="button"
              className="activity-day-nav no-drag"
              disabled={busy}
              aria-label="Jour précédent"
              onClick={() => void goDay(-1)}
            >
              ‹
            </button>
            <h1 className="activity-title">{formatDayTitle(viewDate, todayKey())}</h1>
            <button
              type="button"
              className="activity-day-nav no-drag"
              disabled={busy || isToday || viewDate >= todayKey()}
              aria-label="Jour suivant"
              onClick={() => void goDay(1)}
            >
              ›
            </button>
          </div>
        </div>
        <div className="activity-header-meta no-drag">
          {data.mediaKeepAwake ? (
            <span
              className="activity-media-badge"
              title="Lecture média signalée par l’extension — AFK suspendu"
            >
              Média
            </span>
          ) : null}
          <span
            className={`activity-live${data.tracking ? '' : ' is-paused'}`}
            title={data.tracking ? 'Suivi actif' : 'Suivi en pause'}
          >
            <span className="activity-live-dot" />
            {data.tracking ? 'Suivi' : 'Pause'}
          </span>
        </div>
      </header>

      <div className="activity-body no-drag">
        {!data.urlHelperAvailable && (settings?.browserDetail ?? 'domain') !== 'off' ? (
          <div className="activity-banner activity-banner-warn" role="status">
            Helper URL introuvable — domaines via titre uniquement. Rebuild :{' '}
            <code>npm run build:helpers</code>
          </div>
        ) : null}

        <section className="activity-hero">
          <div className="activity-hero-total">{formatDuration(activeMs)}</div>
          <div className="activity-hero-sub">
            temps actif · {formatDuration(data.byCategory.afk)} AFK
          </div>
          {qualityHint ? (
            <div className="activity-quality" title="Part du temps classé « Autre »">
              {qualityHint}
              {(data.quality?.feedbackCountToday ?? 0) > 0
                ? ` · ${data.quality.feedbackCountToday} correction(s)`
                : ''}
            </div>
          ) : null}
        </section>

        {session ? (
<<<<<<< HEAD
          <ActivityFocusPanel
            session={session}
            busy={busy}
            current={data.current}
            allowApps={allowApps}
            allowDomains={allowDomains}
            allowProjects={allowProjects}
            onAllowAppsChange={setAllowApps}
            onAllowDomainsChange={setAllowDomains}
            onAllowProjectsChange={setAllowProjects}
            onPauseToggle={() => void focusPauseToggle()}
            onStop={() => void focusStop()}
            onAddCurrent={addCurrentToAllowlist}
            onSaveAllowlist={() => void saveAllowlist()}
          />
        ) : null}

        {data.current && isToday ? (
          <ActivityNowCard current={data.current} busy={busy} onCorrect={correct} />
        ) : null}

        <ActivityCategoryBars categoryRows={categoryRows} activeMs={activeMs} />

        <ActivityTopLists data={data} busy={busy} onCorrect={correct} />

        <ActivityFocusJournal journal={journal} />
      </div>

      <ActivityOptionsFooter
        busy={busy}
        paused={data.paused}
        settings={settings}
        optionsOpen={optionsOpen}
        confirmClear={confirmClear}
        hint={hint}
        hintError={hintError}
        afkLabel={afkLabel}
        onToggleOptions={() => {
          setOptionsOpen((o) => !o)
          setConfirmClear(false)
        }}
        onExport={(fmt) => void doExport(fmt)}
        onOpenRules={() =>
          void window.lattice.openActivityRules().catch((err) => {
            setStatus(errMessage(err, 'Impossible d’ouvrir rules.json.'), true)
          })
        }
        onClear={() => void doClear()}
        onCancelClear={() => {
          setConfirmClear(false)
          setStatus(null)
        }}
        onTogglePause={() => void togglePause()}
        onCycleBrowserDetail={() => void cycleBrowserDetail()}
        onToggleStoreTitles={() => void toggleStoreTitles()}
        onToggleParseIde={() => void toggleParseIde()}
        onSetIdleThreshold={(sec) => void setIdleThreshold(sec)}
        onCycleFocusDwell={() => void cycleFocusDwell()}
        onReloadRules={() => void reloadRules()}
      />
=======
          <section className="activity-focus" aria-label="Session focus">
            <div className="activity-section-title">Session focus</div>
            <div className="activity-focus-card">
              <div className="activity-focus-main">
                <span className="activity-focus-task" title={session.notionTaskTitle}>
                  {session.notionTaskTitle}
                </span>
                <span className={`activity-focus-status is-${session.status}`}>
                  {FOCUS_STATUS_LABELS[session.status] ?? session.status}
                </span>
              </div>
              <div className="activity-focus-actions">
                <button
                  type="button"
                  className="activity-btn activity-btn-tiny"
                  disabled={busy || session.status === 'interrupted'}
                  onClick={() => void focusPauseToggle()}
                >
                  {session.status === 'paused' ? 'Reprendre' : 'Pause'}
                </button>
                <button
                  type="button"
                  className="activity-btn activity-btn-danger activity-btn-tiny"
                  disabled={busy}
                  onClick={() => void focusStop()}
                >
                  Stop
                </button>
              </div>
              <label className="activity-focus-field">
                <span>Apps autorisées</span>
                <input
                  className="activity-focus-input"
                  value={allowApps}
                  disabled={busy}
                  onChange={(e) => setAllowApps(e.target.value)}
                  placeholder="cursor, code, notion…"
                />
              </label>
              <label className="activity-focus-field">
                <span>Domaines</span>
                <input
                  className="activity-focus-input"
                  value={allowDomains}
                  disabled={busy}
                  onChange={(e) => setAllowDomains(e.target.value)}
                  placeholder="github.com, localhost…"
                />
              </label>
              <label className="activity-focus-field">
                <span>Projets IDE</span>
                <input
                  className="activity-focus-input"
                  value={allowProjects}
                  disabled={busy}
                  onChange={(e) => setAllowProjects(e.target.value)}
                  placeholder="windows-widgets…"
                />
              </label>
              <div className="activity-focus-actions">
                <button
                  type="button"
                  className="activity-btn activity-btn-ghost activity-btn-tiny"
                  disabled={busy || !data.current || Boolean(data.current?.ignored)}
                  onClick={addCurrentToAllowlist}
                  title="Ajouter l’app / domaine / projet actuel"
                >
                  + Maintenant
                </button>
                <button
                  type="button"
                  className="activity-btn activity-btn-tiny"
                  disabled={busy}
                  onClick={() => void saveAllowlist()}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {data.current && isToday ? (
          <section className="activity-now" aria-label="Maintenant">
            <div className="activity-section-title">Maintenant</div>
            <div className="activity-now-card">
              <div className="activity-now-main">
                <span className="activity-now-app" title={data.current.app}>
                  {data.current.ignored ? 'Lattice' : data.current.app}
                </span>
                {data.current.ignored ? (
                  <span className="activity-now-context">
                    Widgets Lattice — non comptés
                  </span>
                ) : (
                  (() => {
                    const line = contextLine(data.current)
                    if (line) {
                      return (
                        <span className="activity-now-context" title={line}>
                          {line}
                        </span>
                      )
                    }
                    if (data.current.title) {
                      return (
                        <span className="activity-now-title" title={data.current.title}>
                          {data.current.title}
                        </span>
                      )
                    }
                    return null
                  })()
                )}
              </div>
              {!data.current.ignored ? (
                <>
                  <label className="activity-correct">
                    <span className="activity-correct-label">Catégorie</span>
                    <select
                      className="activity-select"
                      disabled={busy}
                      value={data.current.category}
                      onChange={(e) => {
                        const current = data.current
                        if (!current) return
                        void correct(
                          current.app,
                          e.target.value as ActivityCategory,
                          'app',
                          current.title,
                        )
                      }}
                    >
                      {EDITABLE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {data.current.domain ? (
                    <button
                      type="button"
                      className="activity-btn activity-btn-ghost activity-btn-tiny"
                      disabled={busy}
                      title="Créer une règle pour ce domaine"
                      onClick={() => {
                        const current = data.current
                        if (!current?.domain) return
                        void correct(
                          current.app,
                          current.category === 'other' ? 'work' : current.category,
                          'domain',
                          current.title,
                          current.domain,
                        )
                      }}
                    >
                      Règle domaine
                    </button>
                  ) : data.current.title ? (
                    <button
                      type="button"
                      className="activity-btn activity-btn-ghost activity-btn-tiny"
                      disabled={busy}
                      title="Créer une règle basée sur le titre"
                      onClick={() => {
                        const current = data.current
                        if (!current) return
                        void correct(
                          current.app,
                          current.category === 'other' ? 'work' : current.category,
                          'title',
                          current.title,
                        )
                      }}
                    >
                      Règle titre
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="activity-categories" aria-label="Par catégorie">
          {categoryRows.map((row) => {
            const pct = activeMs > 0 && row.id !== 'afk' ? (row.ms / activeMs) * 100 : 0
            const barPct =
              row.id === 'afk'
                ? activeMs + row.ms > 0
                  ? (row.ms / (activeMs + row.ms)) * 100
                  : 0
                : pct
            return (
              <div key={row.id} className={`activity-cat-row cat-${row.id}`}>
                <div className="activity-cat-meta">
                  <span className="activity-cat-label">{row.label}</span>
                  <span className="activity-cat-time">{formatShortDuration(row.ms)}</span>
                </div>
                <div className="activity-cat-track">
                  <div
                    className="activity-cat-fill"
                    style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }}
                  />
                </div>
              </div>
            )
          })}
        </section>

        <section className="activity-apps" aria-label="Applications">
          <div className="activity-section-title">Top apps</div>
          {data.topApps.length === 0 ? (
            <div className="activity-empty">
              {data.paused
                ? 'Suivi en pause — reprenez pour collecter des données.'
                : 'En attente d’activité…'}
            </div>
          ) : (
            <ul className="activity-app-list">
              {data.topApps.map((appRow) => (
                <li key={appRow.app} className="activity-app-row">
                  <span className="activity-app-name" title={appRow.app}>
                    {appRow.app}
                  </span>
                  <select
                    className="activity-select activity-select-compact"
                    disabled={busy}
                    value={appRow.category}
                    aria-label={`Catégorie ${appRow.app}`}
                    onChange={(e) => {
                      void correct(appRow.app, e.target.value as ActivityCategory, 'app')
                    }}
                  >
                    {EDITABLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <span className="activity-app-time">{formatShortDuration(appRow.ms)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(data.topSites.length > 0) ? (
          <section className="activity-apps" aria-label="Sites">
            <div className="activity-section-title">Top sites</div>
            <ul className="activity-app-list">
              {data.topSites.map((site) => (
                <li key={site.domain} className="activity-app-row">
                  <span className="activity-app-name" title={site.domain}>
                    {site.domain}
                  </span>
                  <select
                    className="activity-select activity-select-compact"
                    disabled={busy}
                    value={site.category}
                    aria-label={`Catégorie ${site.domain}`}
                    onChange={(e) => {
                      void correct(
                        data.current?.app ?? 'browser',
                        e.target.value as ActivityCategory,
                        'domain',
                        null,
                        site.domain,
                      )
                    }}
                  >
                    {EDITABLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <span className="activity-app-time">{formatShortDuration(site.ms)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.topWatch.length > 0 ? (
          <section className="activity-apps" aria-label="Visionnage">
            <div className="activity-section-title">Visionnage</div>
            <ul className="activity-app-list">
              {data.topWatch.map((site) => (
                <li key={site.domain} className="activity-app-row activity-app-row-simple">
                  <span className="activity-app-name" title={site.domain}>
                    {site.domain}
                  </span>
                  <span className={`activity-app-cat cat-${site.category}`}>
                    {CATEGORY_LABELS[site.category]}
                  </span>
                  <span className="activity-app-time">{formatShortDuration(site.ms)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(data.topProjects?.length ?? 0) > 0 ? (
          <section className="activity-apps" aria-label="Projets">
            <div className="activity-section-title">Top projets</div>
            <ul className="activity-app-list">
              {data.topProjects.map((proj) => (
                <li key={proj.projectName} className="activity-app-row activity-app-row-simple">
                  <span className="activity-app-name" title={proj.projectName}>
                    {proj.projectName}
                  </span>
                  <span className="activity-app-time">{formatShortDuration(proj.ms)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {topTasks.length > 0 ? (
          <section className="activity-apps" aria-label="Tâches Notion">
            <div className="activity-section-title">Temps par tâche</div>
            <ul className="activity-app-list">
              {topTasks.map((task) => (
                <li key={task.notionTaskId} className="activity-app-row activity-app-row-simple">
                  <span className="activity-app-name" title={task.title}>
                    {task.title}
                  </span>
                  <span className="activity-app-time">{formatShortDuration(task.ms)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {journal.length > 0 ? (
          <section className="activity-apps" aria-label="Journal focus">
            <div className="activity-section-title">Journal focus</div>
            <ul className="activity-journal-list">
              {journal.map((entry, i) => (
                <li key={`${entry.ts}-${i}`} className="activity-journal-row">
                  <div className="activity-journal-meta">
                    <span>
                      {new Date(entry.ts).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>{entry.app}</span>
                    {entry.domain ? <span>{entry.domain}</span> : null}
                    <span className="activity-journal-action">{entry.action}</span>
                  </div>
                  {entry.note ? (
                    <div className="activity-journal-note">{entry.note}</div>
                  ) : (
                    <div className="activity-journal-note is-empty">Sans note</div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <footer className="activity-footer no-drag">
        <div className="activity-actions">
          <button
            type="button"
            className={`activity-btn${optionsOpen ? '' : ' activity-btn-ghost'}`}
            disabled={busy}
            aria-expanded={optionsOpen}
            onClick={() => {
              setOptionsOpen((o) => !o)
              setConfirmClear(false)
            }}
          >
            Options
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={() => void doExport('csv')}
          >
            CSV
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={() => void doExport('json')}
          >
            JSON
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={() => void window.lattice.openActivityRules().catch((err) => {
              setStatus(errMessage(err, 'Impossible d’ouvrir rules.json.'), true)
            })}
          >
            Règles…
          </button>
          {confirmClear ? (
            <>
              <button
                type="button"
                className="activity-btn activity-btn-danger"
                disabled={busy}
                onClick={() => void doClear()}
              >
                Confirmer
              </button>
              <button
                type="button"
                className="activity-btn activity-btn-ghost"
                disabled={busy}
                onClick={() => {
                  setConfirmClear(false)
                  setStatus(null)
                }}
              >
                Annuler
              </button>
            </>
          ) : (
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy}
              onClick={() => void doClear()}
              title="Effacer l’historique et le feedback (conserve les règles)"
            >
              Effacer…
            </button>
          )}
        </div>

        {optionsOpen ? (
          <div className="activity-options" aria-label="Options de suivi">
            <button
              type="button"
              className="activity-btn"
              disabled={busy}
              onClick={() => void togglePause()}
            >
              {data.paused ? 'Reprendre' : 'Pause'}
            </button>
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy || !settings}
              onClick={() => void cycleBrowserDetail()}
              title="Niveau de détail navigateur (domaine / URL / off)"
            >
              Web:{' '}
              {settings?.browserDetail === 'url'
                ? 'URL'
                : settings?.browserDetail === 'off'
                  ? 'off'
                  : 'domaine'}
            </button>
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy || !settings}
              onClick={() => void toggleStoreTitles()}
              title="Stocker ou non les titres de fenêtres"
            >
              {settings?.storeTitles ? 'Titres on' : 'Titres off'}
            </button>
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy || !settings}
              onClick={() => void toggleParseIde()}
              title="Parser les titres Cursor / VS Code / Slack"
            >
              {settings?.parseIdeTitles ? 'IDE on' : 'IDE off'}
            </button>
            <label className="activity-afk-label">
              <span>AFK</span>
              <select
                className="activity-select activity-select-compact"
                disabled={busy || !settings}
                value={settings?.idleThresholdSec ?? 180}
                aria-label="Seuil AFK"
                onChange={(e) => {
                  void setIdleThreshold(Number(e.target.value))
                }}
              >
                {AFK_PRESETS.map((p) => (
                  <option key={p.sec} value={p.sec}>
                    {p.label}
                  </option>
                ))}
                {settings &&
                !AFK_PRESETS.some((p) => p.sec === settings.idleThresholdSec) ? (
                  <option value={settings.idleThresholdSec}>{afkLabel}</option>
                ) : null}
              </select>
            </label>
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy || !settings}
              onClick={() => void cycleFocusDwell()}
              title="Délai hors allowlist avant interruption de session focus"
            >
              Focus: {settings?.focusOffProjectDwellSec ?? 8}s
            </button>
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy}
              onClick={() => void reloadRules()}
            >
              Recharger
            </button>
          </div>
        ) : null}

        {hint ? (
          <div className={`activity-hint${hintError ? ' is-error' : ''}`}>{hint}</div>
        ) : null}
      </footer>
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    </div>
  )
}

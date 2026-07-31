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
    </div>
  )
}

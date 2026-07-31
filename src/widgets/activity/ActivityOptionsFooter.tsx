import type { ActivitySettings } from '../../vite-env'
import { AFK_PRESETS } from './format'

type ActivityOptionsFooterProps = {
  busy: boolean
  paused: boolean
  settings: ActivitySettings | null
  optionsOpen: boolean
  confirmClear: boolean
  hint: string | null
  hintError: boolean
  afkLabel: string
  onToggleOptions: () => void
  onExport: (format: 'csv' | 'json') => void
  onOpenRules: () => void
  onClear: () => void
  onCancelClear: () => void
  onTogglePause: () => void
  onCycleBrowserDetail: () => void
  onToggleStoreTitles: () => void
  onToggleParseIde: () => void
  onSetIdleThreshold: (sec: number) => void
  onCycleFocusDwell: () => void
  onReloadRules: () => void
}

export function ActivityOptionsFooter({
  busy,
  paused,
  settings,
  optionsOpen,
  confirmClear,
  hint,
  hintError,
  afkLabel,
  onToggleOptions,
  onExport,
  onOpenRules,
  onClear,
  onCancelClear,
  onTogglePause,
  onCycleBrowserDetail,
  onToggleStoreTitles,
  onToggleParseIde,
  onSetIdleThreshold,
  onCycleFocusDwell,
  onReloadRules,
}: ActivityOptionsFooterProps) {
  return (
    <footer className="activity-footer no-drag">
      <div className="activity-actions">
        <button
          type="button"
          className={`activity-btn${optionsOpen ? '' : ' activity-btn-ghost'}`}
          disabled={busy}
          aria-expanded={optionsOpen}
          onClick={onToggleOptions}
        >
          Options
        </button>
        <button
          type="button"
          className="activity-btn activity-btn-ghost"
          disabled={busy}
          onClick={() => void onExport('csv')}
        >
          CSV
        </button>
        <button
          type="button"
          className="activity-btn activity-btn-ghost"
          disabled={busy}
          onClick={() => void onExport('json')}
        >
          JSON
        </button>
        <button
          type="button"
          className="activity-btn activity-btn-ghost"
          disabled={busy}
          onClick={onOpenRules}
        >
          Règles…
        </button>
        {confirmClear ? (
          <>
            <button
              type="button"
              className="activity-btn activity-btn-danger"
              disabled={busy}
              onClick={() => void onClear()}
            >
              Confirmer
            </button>
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy}
              onClick={onCancelClear}
            >
              Annuler
            </button>
          </>
        ) : (
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={() => void onClear()}
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
            onClick={() => void onTogglePause()}
          >
            {paused ? 'Reprendre' : 'Pause'}
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy || !settings}
            onClick={() => void onCycleBrowserDetail()}
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
            onClick={() => void onToggleStoreTitles()}
            title="Stocker ou non les titres de fenêtres"
          >
            {settings?.storeTitles ? 'Titres on' : 'Titres off'}
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy || !settings}
            onClick={() => void onToggleParseIde()}
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
                void onSetIdleThreshold(Number(e.target.value))
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
            onClick={() => void onCycleFocusDwell()}
            title="Délai hors allowlist avant interruption de session focus"
          >
            Focus: {settings?.focusOffProjectDwellSec ?? 8}s
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={() => void onReloadRules()}
          >
            Recharger
          </button>
        </div>
      ) : null}

      {hint ? (
        <div className={`activity-hint${hintError ? ' is-error' : ''}`}>{hint}</div>
      ) : null}
    </footer>
  )
}

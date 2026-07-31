import { useEffect, useMemo, useState } from 'react'
import type { SystemStats } from '../vite-env'

function toneForPercent(value: number): 'ok' | 'warn' | 'hot' {
  if (value >= 85) return 'hot'
  if (value >= 65) return 'warn'
  return 'ok'
}

function toneForTemp(temp: number | null): 'ok' | 'warn' | 'hot' | 'muted' {
  if (temp == null) return 'muted'
  if (temp >= 85) return 'hot'
  if (temp >= 70) return 'warn'
  return 'ok'
}

function RingGauge({
  label,
  valueLabel,
  percent,
  tone,
  sub,
  loading,
}: {
  label: string
  valueLabel: string
  percent: number
  tone: 'ok' | 'warn' | 'hot' | 'muted'
  sub?: string
  loading?: boolean
}) {
  const size = 88
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // Tant que les stats n'ont jamais été reçues, l'anneau reste plein et pulse
  // au lieu d'afficher une fausse valeur à 0 %.
  const displayPercent = loading ? 100 : percent
  const clamped = Math.min(100, Math.max(0, displayPercent))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className={`monitor-gauge tone-${loading ? 'loading' : tone}`}>
      <div className="monitor-ring-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            className="monitor-ring-track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
          />
          <circle
            className="monitor-ring-value"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="monitor-ring-center">
          <span className={`monitor-ring-number${loading ? ' is-loading' : ''}`}>
            {loading ? '···' : valueLabel}
          </span>
        </div>
      </div>
      <div className="monitor-gauge-label">{label}</div>
      {sub ? <div className="monitor-gauge-sub">{sub}</div> : null}
    </div>
  )
}

function formatClock(iso?: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

export function MonitorWidget() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void window.lattice
      .getStats()
      .then((s) => {
        if (alive) setStats(s)
      })
      .catch((err) => {
        // On réessaiera via onStatsUpdated ; les anneaux restent en attente.
        console.error('Failed to load system stats', err)
      })
    const off = window.lattice.onStatsUpdated((s) => setStats(s))
    return () => {
      alive = false
      off()
    }
  }, [])

  const initialLoading = stats == null
  const cpu = stats?.cpuPercent ?? 0
  const ram = stats?.ramPercent ?? 0
  const temp = stats?.temperatureC ?? null
  const tempMissing = stats != null && temp == null

  const tempPercent = useMemo(() => {
    if (temp == null) return 0
    return Math.min(100, Math.max(0, ((temp - 30) / 70) * 100))
  }, [temp])

  return (
    <div className="monitor-shell drag-region">
      <header className="monitor-header">
        <div>
          <div className="monitor-kicker">Monitoring</div>
          <h1 className="monitor-title">Système</h1>
        </div>
        <div className="monitor-header-meta no-drag">
          {stats?.updatedAt ? (
            <span className="monitor-live">
              <span className="monitor-live-dot" />
              {formatClock(stats.updatedAt)}
            </span>
          ) : (
            <span className="monitor-live muted">Connexion…</span>
          )}
        </div>
      </header>

      <div className="monitor-gauges no-drag">
        <RingGauge
          label="Processeur"
          valueLabel={`${cpu}%`}
          percent={cpu}
          tone={toneForPercent(cpu)}
          loading={initialLoading}
        />
        <RingGauge
          label="Mémoire"
          valueLabel={`${ram}%`}
          percent={ram}
          tone={toneForPercent(ram)}
          loading={initialLoading}
          sub={
            stats
              ? `${stats.ramUsedGb.toFixed(1)} / ${stats.ramTotalGb.toFixed(0)} Go`
              : undefined
          }
        />
        <RingGauge
          label="Température"
          valueLabel={temp != null ? `${temp}°` : '—'}
          percent={tempPercent}
          tone={toneForTemp(temp)}
          loading={initialLoading}
          sub={stats?.tempSource ? stats.tempSource : tempMissing ? 'Non disponible' : undefined}
        />
      </div>

      <div className="monitor-footer no-drag">
        {tempMissing ? (
          <button
            type="button"
            className="monitor-action"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              setHint(null)
              void window.lattice.enableTemp().then((res) => {
                setHint(res.message)
                setBusy(false)
                void window.lattice.getStats().then(setStats)
              })
            }}
          >
            {busy ? 'Activation… (UAC)' : 'Activer la température'}
          </button>
        ) : (
          <div className="monitor-footnote">
            Clic hors du panneau pour le fermer
          </div>
        )}
        {hint ? <div className="monitor-hint">{hint}</div> : null}
      </div>
    </div>
  )
}

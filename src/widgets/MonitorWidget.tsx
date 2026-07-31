import { useEffect, useMemo, useState } from 'react'
import type { SystemStats } from '../vite-env'
import { RingGauge } from './RingGauge'

function toneForPercent(value: number): 'ok' | 'warn' | 'hot' {
  if (value >= 85) return 'hot'
  if (value >= 65) return 'warn'
  return 'ok'
}

function toneForTemp(temp: number | null): 'ok' | 'warn' | 'hot' | 'muted' {
  if (temp === null || temp === undefined) return 'muted'
  if (temp >= 85) return 'hot'
  if (temp >= 70) return 'warn'
  return 'ok'
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

  const initialLoading = stats === null || stats === undefined
  const cpu = stats?.cpuPercent ?? 0
  const ram = stats?.ramPercent ?? 0
  const temp = stats?.temperatureC ?? null
  const tempMissing = (stats !== null && stats !== undefined) && (temp === null || temp === undefined)

  const tempPercent = useMemo(() => {
    if (temp === null || temp === undefined) return 0
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
          valueLabel={temp !== null && temp !== undefined ? `${temp}°` : '—'}
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
                void window.lattice.getStats().then(setStats).catch(() => undefined)
              }).catch((err) => {
                setHint(String(err))
                setBusy(false)
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

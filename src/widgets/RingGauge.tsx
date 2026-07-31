export function RingGauge({
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

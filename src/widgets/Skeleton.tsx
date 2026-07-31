type LineWidth = 'wide' | 'medium' | 'narrow'

/** Une ligne de texte fantôme, largeur au choix. */
<<<<<<< HEAD
function SkeletonLine({ width = 'wide' }: { width?: LineWidth }) {
=======
export function SkeletonLine({ width = 'wide' }: { width?: LineWidth }) {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  return <span className={`skeleton skeleton-line is-${width}`} />
}

/** Plusieurs lignes fantômes empilées (une par entrée de `widths`). */
export function SkeletonLines({ widths }: { widths: LineWidth[] }) {
  return (
    <>
      {widths.map((width, i) => (
        <SkeletonLine key={i} width={width} />
      ))}
    </>
  )
}

/**
 * Carte fantôme calquée sur les lignes de tâches / widgets (point optionnel
 * + première ligne, puis lignes secondaires). `as` permet de l'utiliser dans
 * une liste (`<ul>`/`<ol>`) ou un conteneur générique.
 */
export function SkeletonCard({
  as: Tag = 'div',
  showDot = false,
  lineWidths = ['medium', 'narrow'],
}: {
  as?: 'div' | 'li'
  showDot?: boolean
  lineWidths?: LineWidth[]
}) {
  const [firstWidth, ...restWidths] = lineWidths
  return (
    <Tag className="skeleton-card" aria-hidden>
      <div className="skeleton-card-row">
        {showDot ? <span className="skeleton skeleton-dot" /> : null}
        <SkeletonLine width={firstWidth} />
      </div>
      {restWidths.map((width, i) => (
        <SkeletonLine key={i} width={width} />
      ))}
    </Tag>
  )
}
<<<<<<< HEAD
=======

/** Libellé de bouton avec petit spinner inline, pour une action en cours. */
export function ButtonSpinner({ label }: { label: string }) {
  return (
    <span className="btn-spinner-row">
      <span className="spinner" />
      {label}
    </span>
  )
}
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644

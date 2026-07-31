/** Libellé de bouton avec petit spinner inline, pour une action en cours. */
export function ButtonSpinner({ label }: { label: string }) {
  return (
    <span className="btn-spinner-row">
      <span className="spinner" />
      {label}
    </span>
  )
}

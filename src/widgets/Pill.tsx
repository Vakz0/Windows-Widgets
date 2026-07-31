/**
 * Pastille colorée réutilisée pour les tags/urgences/importances Notion.
 * `size="sm"` correspond au style compact utilisé dans les cartes du calendrier.
 */
export function Pill({
  label,
  color,
  size = 'default',
}: {
  label: string
  color?: string | null
  size?: 'default' | 'sm'
}) {
  return (
    <span className={size === 'sm' ? 'cal-tag' : 'task-tag'} style={{ background: color ?? '#9b9a97' }}>
      {label}
    </span>
  )
}

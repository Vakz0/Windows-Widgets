import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { NotionPropertyOption } from '../../vite-env'
import { Pill } from '../Pill'

export function PropRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="detail-prop-row">
      <span className="detail-prop-key">
        <span className="detail-prop-icon">{icon}</span>
        {label}
      </span>
      <div className="detail-prop-value">{children}</div>
    </div>
  )
}

export function SelectField({
  value,
  color,
  options,
  loading,
  onOpen,
  onChange,
  disabled,
}: {
  value: string | null
  color?: string | null
  options: NotionPropertyOption[]
  loading: boolean
  onOpen: () => void
  onChange: (next: string | null) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="detail-select" ref={rootRef}>
      <button
        type="button"
        className="detail-select-trigger"
        disabled={disabled}
        onClick={() => {
          if (!open) onOpen()
          setOpen((v) => !v)
        }}
      >
        {value ? (
          <Pill label={value} color={color} />
        ) : (
          <span className="detail-empty">Vide</span>
        )}
      </button>
      {open ? (
        <div className="detail-select-menu" role="listbox">
          <button
            type="button"
            className="detail-select-option is-clear"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            Vide
          </button>
          {loading ? (
            <div className="detail-select-loading">Chargement…</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.name}
                type="button"
                className={`detail-select-option${opt.name === value ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(opt.name)
                  setOpen(false)
                }}
              >
                <Pill label={opt.name} color={opt.color} />
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

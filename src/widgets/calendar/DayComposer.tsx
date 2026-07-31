import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

export function DayComposer({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  onSubmit: (title: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function submit() {
    const value = title.trim()
    if (!value || busy) return
    onSubmit(value)
  }

  return (
    <form
      className="cal-composer no-drag"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        submit()
      }}
    >
      <input
        ref={inputRef}
        className="cal-composer-input"
        type="text"
        value={title}
        disabled={busy}
        placeholder="Nouvelle tâche…"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        onBlur={() => {
          if (!title.trim() && !busy) onCancel()
        }}
        aria-label="Titre de la nouvelle tâche"
      />
    </form>
  )
}

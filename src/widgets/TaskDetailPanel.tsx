import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { NotionPropertyOption, NotionTask } from '../vite-env'
import { Pill } from './Pill'
import { SkeletonLines } from './Skeleton'

/** Icônes minimalistes façon Notion (trait fin, sans dépendance externe). */

function IconExternalLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6.5 3H3.5C3.22 3 3 3.22 3 3.5V12.5C3 12.78 3.22 13 3.5 13H12.5C12.78 13 13 12.78 13 12.5V9.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.3 3H13V6.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 3L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 6.5H13.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 2V4.2M10.5 2V4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconRelation() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.5" y="5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
    </svg>
  )
}

function IconSelect() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="5.5" width="11" height="5" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function IconStatus() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 8V2.7M8 8L11.7 11.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconCheckbox({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
        <path
          d="M5.4 8.1L7.1 9.8L10.6 6.1"
          stroke="var(--bg)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 4.5H12.5M6 4.5V3.2C6 2.8 6.3 2.5 6.7 2.5H9.3C9.7 2.5 10 2.8 10 3.2V4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M5 4.5H11V12.2C11 12.6 10.7 13 10.3 13H5.7C5.3 13 5 12.6 5 12.2V4.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.75 7V10.5M9.25 7V10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function PropRow({
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

function SelectField({
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

export function TaskDetailPanel({
  task,
  onBack,
  onTaskUpdated,
}: {
  task: NotionTask
  onBack: () => void
  onTaskUpdated?: (task: NotionTask) => void
}) {
  const [draft, setDraft] = useState(task)
  const [description, setDescription] = useState(task.description ?? '')
  const [loadingDesc, setLoadingDesc] = useState(!task.description)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusBusy, setFocusBusy] = useState(false)
  const [focusHint, setFocusHint] = useState<string | null>(null)
  const [focusHintError, setFocusHintError] = useState(false)
  const [optionsByProp, setOptionsByProp] = useState<Record<string, NotionPropertyOption[]>>({})
  const [loadingOptions, setLoadingOptions] = useState<string | null>(null)
  const titleRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    setDraft(task)
    setDescription(task.description ?? '')
    setError(null)
    setConfirmDelete(false)
    setFocusHint(null)
    setFocusHintError(false)
  }, [task])

  async function handleStartFocus() {
    setFocusBusy(true)
    setFocusHint(null)
    setFocusHintError(false)
    try {
      const res = await window.lattice.startFocusSession({
        notionTaskId: draft.id,
        notionTaskTitle: draft.title,
        databaseId: draft.databaseId,
      })
      if (!res.ok) {
        setFocusHint(res.message ?? 'Impossible de démarrer la session.')
        setFocusHintError(true)
        return
      }
      setFocusHint(`Session focus : ${draft.title}`)
    } catch (err) {
      setFocusHint(err instanceof Error ? err.message : 'Session focus impossible.')
      setFocusHintError(true)
    } finally {
      setFocusBusy(false)
    }
  }

  useEffect(() => {
    let alive = true
    if (task.description) {
      setLoadingDesc(false)
      return
    }

    setLoadingDesc(true)
    void window.lattice
      .getTaskDescription(task.id)
      .then((text) => {
        if (!alive) return
        setDescription(text ?? '')
        if (text) setDraft((d) => ({ ...d, description: text }))
      })
      .catch((err) => {
        console.error('Failed to load task description', err)
      })
      .finally(() => {
        if (alive) setLoadingDesc(false)
      })

    return () => {
      alive = false
    }
  }, [task.id, task.description])

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft.title])

  // Bouton souris « précédent » : Chromium mappe ça sur history.back / popstate.
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack
  const closedByHistoryRef = useRef(false)
  useEffect(() => {
    closedByHistoryRef.current = false
    history.pushState({ latticeTaskDetail: task.id }, '')

    const close = () => {
      closedByHistoryRef.current = true
      onBackRef.current()
    }

    const onPopState = () => close()
    const onMouseUp = (e: MouseEvent) => {
      // Bouton X1 = retour (certains drivers ne passent pas par l'historique).
      if (e.button === 3) {
        e.preventDefault()
        if (
          history.state &&
          (history.state as { latticeTaskDetail?: string }).latticeTaskDetail === task.id
        ) {
          history.back()
        } else {
          close()
        }
      }
    }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) e.preventDefault()
    }

    window.addEventListener('popstate', onPopState)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousedown', onMouseDown)
      // Fermeture hors historique (ex. tâche masquée) : retirer l'entrée poussée.
      if (
        !closedByHistoryRef.current &&
        history.state &&
        (history.state as { latticeTaskDetail?: string }).latticeTaskDetail === task.id
      ) {
        history.back()
      }
    }
  }, [task.id])

  function handleBack() {
    if (
      history.state &&
      (history.state as { latticeTaskDetail?: string }).latticeTaskDetail === task.id
    ) {
      history.back()
      return
    }
    onBack()
  }

  async function saveField(propertyName: string, value: string | boolean | null) {
    if (!propertyName || saving) return
    setSaving(true)
    setError(null)
    const previous = draft
    try {
      const result = await window.lattice.updateTaskField({
        pageId: draft.id,
        databaseId: draft.databaseId,
        propertyName,
        value,
      })
      if (!result.ok || !result.task) {
        setDraft(previous)
        setDescription(previous.description ?? '')
        setError(result.message ?? 'Échec de la sauvegarde')
        return
      }
      setDraft(result.task)
      if (result.task.description != null) setDescription(result.task.description)
      onTaskUpdated?.(result.task)
    } catch (err) {
      setDraft(previous)
      setDescription(previous.description ?? '')
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (saving) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await window.lattice.deleteTask({ pageId: draft.id })
      if (!result.ok) {
        setError(result.message ?? 'Échec de la suppression')
        setConfirmDelete(false)
        return
      }
      handleBack()
    } catch (err) {
      setError(String(err))
      setConfirmDelete(false)
    } finally {
      setSaving(false)
    }
  }

  async function ensureOptions(propertyName: string) {
    if (!propertyName || optionsByProp[propertyName]) return
    setLoadingOptions(propertyName)
    try {
      const opts = await window.lattice.getPropertyOptions(draft.databaseId, propertyName)
      setOptionsByProp((prev) => ({ ...prev, [propertyName]: opts }))
    } finally {
      setLoadingOptions(null)
    }
  }

  const map = draft.propertyMap
  const descriptionProperty = map.description ?? '__page_body__'

  return (
    <div className="task-detail no-drag">
      <div className="task-detail-toolbar">
        <button className="icon-btn" type="button" onClick={handleBack} aria-label="Retour">
          ‹
        </button>
        {draft.sourceLabel ? (
          <span className="task-detail-breadcrumb">{draft.sourceLabel}</span>
        ) : null}
        <span className="task-detail-toolbar-spacer" />
        {saving ? <span className="task-detail-saving">Enregistrement…</span> : null}
        {confirmDelete ? (
          <div className="task-detail-delete-confirm">
            <button
              className="task-detail-delete-btn is-danger"
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
            >
              Confirmer
            </button>
            <button
              className="task-detail-delete-btn"
              type="button"
              disabled={saving}
              onClick={() => setConfirmDelete(false)}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            className="icon-btn is-danger"
            type="button"
            disabled={saving}
            onClick={() => void handleDelete()}
            aria-label="Supprimer la tâche"
            title="Supprimer"
          >
            <IconTrash />
          </button>
        )}
        <button
          className="task-detail-focus-btn"
          type="button"
          disabled={saving || focusBusy}
          title="Démarrer une session focus Activité sur cette tâche"
          onClick={() => void handleStartFocus()}
        >
          {focusBusy ? '…' : 'Travailler dessus'}
        </button>
        {draft.url ? (
          <button
            className="icon-btn"
            type="button"
            onClick={() => {
              void window.lattice.openExternal(draft.url)
            }}
            aria-label="Ouvrir dans Notion"
            title="Ouvrir dans Notion"
          >
            <IconExternalLink />
          </button>
        ) : null}
      </div>
      {focusHint ? (
        <div className={`task-detail-focus-hint${focusHintError ? ' is-error' : ''}`}>
          {focusHint}
        </div>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="task-detail-scroll">
        <textarea
          ref={titleRef}
          className="task-detail-title-input"
          rows={1}
          value={draft.title}
          disabled={saving}
          aria-label="Titre"
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onBlur={() => {
            const next = draft.title.trim() || 'Sans titre'
            if (next !== task.title) void saveField(map.title, next)
          }}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
        />

        <div className="task-detail-props">
          <PropRow icon={<IconCalendar />} label="Date">
            <input
              className="detail-date-input"
              type="date"
              value={draft.date ?? ''}
              disabled={saving}
              onChange={(e) => {
                const next = e.target.value || null
                setDraft((d) => ({ ...d, date: next }))
                void saveField(map.date, next)
              }}
            />
          </PropRow>

          <PropRow icon={<IconRelation />} label="Projet">
            {draft.sourceLabel ? (
              <span className="detail-plain">{draft.sourceLabel}</span>
            ) : (
              <span className="detail-empty">Vide</span>
            )}
          </PropRow>

          <PropRow icon={<IconSelect />} label="État">
            <SelectField
              value={draft.tag}
              color={draft.tagColor}
              options={optionsByProp[map.tag] ?? []}
              loading={loadingOptions === map.tag}
              disabled={saving}
              onOpen={() => void ensureOptions(map.tag)}
              onChange={(next) => {
                setDraft((d) => ({ ...d, tag: next }))
                void saveField(map.tag, next)
              }}
            />
          </PropRow>

          {map.urgency ? (
            <PropRow icon={<IconSelect />} label="Urgence">
              <SelectField
                value={draft.urgency}
                color={draft.urgencyColor}
                options={optionsByProp[map.urgency] ?? []}
                loading={loadingOptions === map.urgency}
                disabled={saving}
                onOpen={() => void ensureOptions(map.urgency!)}
                onChange={(next) => {
                  setDraft((d) => ({ ...d, urgency: next }))
                  void saveField(map.urgency!, next)
                }}
              />
            </PropRow>
          ) : null}

          <PropRow icon={<IconStatus />} label="Importance">
            <SelectField
              value={draft.importance}
              color={draft.importanceColor}
              options={optionsByProp[map.status] ?? []}
              loading={loadingOptions === map.status}
              disabled={saving}
              onOpen={() => void ensureOptions(map.status)}
              onChange={(next) => {
                setDraft((d) => ({
                  ...d,
                  importance: next,
                  ...(map.workflowStatus ? {} : { status: next }),
                }))
                void saveField(map.status, next)
              }}
            />
          </PropRow>

          {map.workflowStatus ? (
            <PropRow icon={<IconStatus />} label="Statut">
              <SelectField
                value={draft.status}
                color={
                  optionsByProp[map.workflowStatus]?.find((o) => o.name === draft.status)
                    ?.color ?? null
                }
                options={optionsByProp[map.workflowStatus] ?? []}
                loading={loadingOptions === map.workflowStatus}
                disabled={saving}
                onOpen={() => void ensureOptions(map.workflowStatus!)}
                onChange={(next) => {
                  setDraft((d) => ({ ...d, status: next }))
                  void saveField(map.workflowStatus!, next)
                }}
              />
            </PropRow>
          ) : null}

          {map.doneCheckbox || !map.workflowStatus ? (
            <PropRow icon={<IconCheckbox checked={draft.done} />} label="Terminé">
              <label className="detail-done-check">
                <input
                  type="checkbox"
                  checked={draft.done}
                  disabled={saving}
                  onChange={(e) => {
                    const next = e.target.checked
                    setDraft((d) => ({ ...d, done: next }))
                    // `__done__` : le main process résout checkbox auto ou statut workflow.
                    void saveField('__done__', next)
                  }}
                />
                <span className={`detail-done-box${draft.done ? ' is-checked' : ''}`}>
                  {draft.done ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M3.5 8.2L6.4 11L12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
              </label>
            </PropRow>
          ) : null}
        </div>

        <div className="task-detail-content">
          {loadingDesc ? (
            <div className="task-detail-content-skeleton" aria-hidden>
              <SkeletonLines widths={['wide', 'wide', 'medium']} />
            </div>
          ) : (
            <textarea
              className="task-detail-content-input"
              value={description}
              placeholder="Aucun contenu"
              disabled={saving}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                const next = description.trim()
                const prev = (draft.description ?? '').trim()
                if (next !== prev) void saveField(descriptionProperty, next || null)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

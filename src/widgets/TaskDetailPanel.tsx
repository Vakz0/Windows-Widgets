import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import type { NotionPropertyOption, NotionTask } from '../vite-env'
import { SkeletonLines } from './Skeleton'
import {
  IconCalendar,
  IconCheckbox,
  IconRelation,
  IconSelect,
  IconStatus,
} from './taskDetail/icons'
import { PropRow, SelectField } from './taskDetail/PropertyFields'
import { TaskDetailToolbar } from './taskDetail/TaskDetailToolbar'

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
      if (result.task.description !== null && result.task.description !== undefined) setDescription(result.task.description)
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
      <TaskDetailToolbar
        sourceLabel={draft.sourceLabel}
        saving={saving}
        confirmDelete={confirmDelete}
        focusBusy={focusBusy}
        hasUrl={Boolean(draft.url)}
        onBack={handleBack}
        onDelete={() => void handleDelete()}
        onCancelDelete={() => setConfirmDelete(false)}
        onStartFocus={() => void handleStartFocus()}
        onOpenExternal={() => {
          void window.lattice.openExternal(draft.url)
        }}
      />
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

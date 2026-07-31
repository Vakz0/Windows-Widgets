import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { addDays, startOfWeek, toIsoDate, useTasks } from '../hooks'
import type { NotionTask } from '../vite-env'
import { TaskCard } from './TaskCard'
import { TaskDetailPanel } from './TaskDetailPanel'

type CalendarView = 'week' | 'month'

type TaskContextMenu = {
  task: NotionTask
  x: number
  y: number
  confirm: boolean
}

const DAY_NAMES = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
/** Semaines de contexte passé affichées avant la semaine courante. */
const WEEKS_BEFORE = 1
/** Nombre de semaines chargées au départ, puis ajoutées à chaque palier de scroll. */
const WEEKS_INITIAL = 8
const WEEKS_STEP = 6
/** Plafond absolu, même si une tâche est datée très loin dans le futur. */
const WEEKS_AHEAD_MAX = 52
/** Une rangée est considérée visible (pour le titre) dès qu'elle dépasse ce seuil sous le haut du scroll. */
const TITLE_VISIBILITY_PX = 40
/** Distance du bas du scroll à partir de laquelle on précharge plus de semaines. */
const PREFETCH_THRESHOLD_PX = 240
const DND_MIME = 'application/x-lattice-task'

function monthShort(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'short' })
}

function monthLong(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'long' })
}

function monthTitleOf(date: Date): string {
  return `${monthLong(date)} ${date.getFullYear()}`
}

/** Numéro du jour, avec le mois affiché pour le 1er (« 1 août »). */
function dayLabel(date: Date): string {
  if (date.getDate() === 1) return `1 ${monthShort(date)}`
  return String(date.getDate())
}

function DayComposer({
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

/** Nombre de cartes fantômes par jour, pour une grille de chargement à l’allure naturelle. */
const SKELETON_COUNTS = [1, 2, 0, 1, 2, 1, 0]

function DayCell({
  day,
  tasks,
  todayIso,
  onOpen,
  onTaskContextMenu,
  loading,
  dropTarget,
  draggingId,
  composing,
  creating,
  onOpenCompose,
  onCancelCompose,
  onCreate,
  onDragOverDay,
  onDragLeaveDay,
  onDropDay,
  onDragStart,
  onDragEnd,
}: {
  day: Date
  tasks: NotionTask[]
  todayIso: string
  onOpen: (task: NotionTask) => void
  onTaskContextMenu: (task: NotionTask, e: ReactMouseEvent) => void
  loading?: boolean
  dropTarget: boolean
  draggingId: string | null
  composing: boolean
  creating: boolean
  onOpenCompose: () => void
  onCancelCompose: () => void
  onCreate: (title: string) => void
  onDragOverDay: (e: DragEvent, dayIso: string) => void
  onDragLeaveDay: (e: DragEvent, dayIso: string) => void
  onDropDay: (e: DragEvent, dayIso: string) => void
  onDragStart: (task: NotionTask, e: DragEvent) => void
  onDragEnd: () => void
}) {
  const iso = toIsoDate(day)
  const isToday = iso === todayIso
  const skeletonCount = SKELETON_COUNTS[day.getDay()]

  return (
    <div
      className={`cal-cell${iso < todayIso ? ' is-past' : ''}${dropTarget ? ' is-drop-target' : ''}`}
      onDragOver={(e) => onDragOverDay(e, iso)}
      onDragLeave={(e) => onDragLeaveDay(e, iso)}
      onDrop={(e) => onDropDay(e, iso)}
    >
      <div className="cal-cell-head">
        <button
          className="cal-add-btn no-drag"
          type="button"
          onClick={onOpenCompose}
          aria-label={`Ajouter une tâche le ${iso}`}
          title="Ajouter une tâche"
        >
          +
        </button>
        <span className={`cal-day-num${isToday ? ' is-today' : ''}`}>
          {isToday ? day.getDate() : dayLabel(day)}
        </span>
      </div>
      <div className="cal-cell-cards">
        {loading
          ? Array.from({ length: skeletonCount }, (_, i) => (
              <span className="skeleton cal-card-skeleton" key={`skeleton-${i}`} aria-hidden />
            ))
          : tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={onOpen}
                onContextMenu={onTaskContextMenu}
                dragging={draggingId === task.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
        {composing ? (
          <DayComposer busy={creating} onSubmit={onCreate} onCancel={onCancelCompose} />
        ) : null}
      </div>
    </div>
  )
}

export function CalendarWidget() {
  const { tasks, error, loading, config, refresh } = useTasks()
  const [view, setView] = useState<CalendarView>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [weeksAhead, setWeeksAhead] = useState(WEEKS_INITIAL)
  const [monthTitle, setMonthTitle] = useState(() => monthTitleOf(new Date()))
  const [selected, setSelected] = useState<NotionTask | null>(null)
  const [dateOverrides, setDateOverrides] = useState<Record<string, string>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropDay, setDropDay] = useState<string | null>(null)
  const [composeDay, setComposeDay] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<TaskContextMenu | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({})
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)

  const todayIso = toIsoDate(new Date())
  const currentWeekStart = useMemo(() => startOfWeek(new Date()), [])

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        addDays(currentWeekStart, weekOffset * 7 + i),
      ),
    [currentWeekStart, weekOffset],
  )

  const weekTitle = useMemo(() => {
    const first = weekDays[0]
    const last = weekDays[6]
    return first.getMonth() === last.getMonth()
      ? `${first.getDate()} – ${last.getDate()} ${monthLong(last)} ${last.getFullYear()}`
      : `${first.getDate()} ${monthShort(first)} – ${last.getDate()} ${monthShort(last)} ${last.getFullYear()}`
  }, [weekDays])

  /** Ne pas laisser scroller dans le vide : plafond quelques semaines après la dernière tâche. */
  const maxWeeksAhead = useMemo(() => {
    let last = ''
    for (const t of tasks) {
      const date = dateOverrides[t.id] ?? t.date
      if (date && date > last) last = date
    }
    if (!last) return WEEKS_INITIAL
    const lastDate = new Date(last + 'T12:00:00')
    const diffWeeks = Math.ceil(
      (lastDate.getTime() - currentWeekStart.getTime()) / (7 * 86_400_000),
    )
    return Math.min(WEEKS_AHEAD_MAX, Math.max(WEEKS_INITIAL, diffWeeks + 4))
  }, [tasks, currentWeekStart, dateOverrides])

  /** Semaines à afficher en vue mois, avec le libellé de mois précalculé (évite de reformater à chaque scroll). */
  const weeks = useMemo(() => {
    const start = addDays(currentWeekStart, -7 * WEEKS_BEFORE)
    const count = WEEKS_BEFORE + Math.min(weeksAhead, maxWeeksAhead)
    return Array.from({ length: count }, (_, w) => {
      const days = Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d))
      return { days, label: monthTitleOf(days[3]) }
    })
  }, [currentWeekStart, weeksAhead, maxWeeksAhead])

  // Nettoyer overrides / masques une fois que le cache a rattrapé l’état optimiste.
  useEffect(() => {
    setDateOverrides((prev) => {
      const keys = Object.keys(prev)
      if (!keys.length) return prev
      let changed = false
      const next = { ...prev }
      for (const id of keys) {
        const task = tasks.find((t) => t.id === id)
        if (!task || task.date === prev[id]) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
    setHiddenIds((prev) => {
      const keys = Object.keys(prev)
      if (!keys.length) return prev
      let changed = false
      const next = { ...prev }
      for (const id of keys) {
        if (!tasks.some((t) => t.id === id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tasks])

  const byDay = useMemo(() => {
    const map = new Map<string, NotionTask[]>()
    for (const task of tasks) {
      if (hiddenIds[task.id]) continue
      const date = dateOverrides[task.id] ?? task.date
      if (!date) continue
      const viewTask = date === task.date ? task : { ...task, date }
      const bucket = map.get(date)
      if (bucket) bucket.push(viewTask)
      else map.set(date, [viewTask])
    }
    return map
  }, [tasks, dateOverrides, hiddenIds])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
    }
  }, [contextMenu])

  const scrollToToday = (smooth: boolean) => {
    const el = scrollRef.current
    const row = el?.querySelector<HTMLElement>('[data-today-row="true"]')
    if (el && row) {
      el.scrollTo({ top: row.offsetTop, behavior: smooth ? 'smooth' : 'auto' })
    }
  }

  useEffect(() => {
    if (view === 'month') scrollToToday(false)
  }, [view])

  function updateMonthTitleFromScroll(el: HTMLDivElement) {
    for (const child of Array.from(el.children) as HTMLElement[]) {
      if (child.offsetTop + child.offsetHeight - el.scrollTop > TITLE_VISIBILITY_PX) {
        const label = child.dataset.label
        if (label) setMonthTitle(label)
        break
      }
    }
  }

  function maybeLoadMoreWeeks(el: HTMLDivElement) {
    if (el.scrollTop + el.clientHeight < el.scrollHeight - PREFETCH_THRESHOLD_PX) return
    setWeeksAhead((w) => (w < maxWeeksAhead ? Math.min(w + WEEKS_STEP, maxWeeksAhead) : w))
  }

  // Les lectures de layout (offsetTop/offsetHeight) sont coalescées par requestAnimationFrame
  // pour éviter de forcer un reflow à chaque évènement de scroll.
  const scrollFrameRef = useRef<number | null>(null)

  const handleScroll = () => {
    if (scrollFrameRef.current != null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      const el = scrollRef.current
      if (!el) return
      updateMonthTitleFromScroll(el)
      maybeLoadMoreWeeks(el)
    })
  }

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current != null) cancelAnimationFrame(scrollFrameRef.current)
    }
  }, [])

  const goToday = () => {
    if (view === 'week') setWeekOffset(0)
    else scrollToToday(true)
  }

  useEffect(() => {
    if (!selected) return
    const next = tasks.find((t) => t.id === selected.id)
    if (!next) setSelected(null)
    else if (next !== selected) setSelected(next)
  }, [tasks, selected])

  function handleDragStart(task: NotionTask, e: DragEvent) {
    setDraggingId(task.id)
    setActionError(null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(DND_MIME, task.id)
    e.dataTransfer.setData('text/plain', task.id)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDropDay(null)
  }

  function handleDragOverDay(e: DragEvent, dayIso: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropDay !== dayIso) setDropDay(dayIso)
  }

  function handleDragLeaveDay(e: DragEvent, dayIso: string) {
    const related = e.relatedTarget
    if (related instanceof Node && e.currentTarget.contains(related)) return
    setDropDay((current) => (current === dayIso ? null : current))
  }

  async function handleDropDay(e: DragEvent, dayIso: string) {
    e.preventDefault()
    setDropDay(null)
    const taskId =
      e.dataTransfer.getData(DND_MIME) ||
      e.dataTransfer.getData('text/plain') ||
      draggingId
    setDraggingId(null)
    const task = taskId ? tasks.find((t) => t.id === taskId) : undefined
    if (!task) return

    const currentDate = dateOverrides[task.id] ?? task.date
    if (currentDate === dayIso) return

    const previousDate = currentDate
    setDateOverrides((prev) => ({ ...prev, [task.id]: dayIso }))
    setActionError(null)

    const result = await window.lattice.updateTaskField({
      pageId: task.id,
      databaseId: task.databaseId,
      propertyName: task.propertyMap.date,
      value: dayIso,
    })

    if (!result.ok || !result.task) {
      setDateOverrides((prev) => {
        const next = { ...prev }
        if (previousDate) next[task.id] = previousDate
        else delete next[task.id]
        return next
      })
      setActionError(result.message ?? 'Impossible de déplacer la tâche.')
    }
  }

  async function handleCreate(dayIso: string, title: string) {
    setCreating(true)
    setActionError(null)
    try {
      const result = await window.lattice.createTask({ title, date: dayIso })
      if (!result.ok || !result.task) {
        setActionError(result.message ?? 'Impossible de créer la tâche.')
        return
      }
      setComposeDay(null)
    } catch (err) {
      setActionError(String(err))
    } finally {
      setCreating(false)
    }
  }

  function openTaskContextMenu(task: NotionTask, e: ReactMouseEvent) {
    const shell = shellRef.current
    if (!shell) return
    const rect = shell.getBoundingClientRect()
    const menuW = 168
    const menuH = 84
    const x = Math.min(Math.max(8, e.clientX - rect.left), rect.width - menuW - 8)
    const y = Math.min(Math.max(8, e.clientY - rect.top), rect.height - menuH - 8)
    setContextMenu({ task, x, y, confirm: false })
    setActionError(null)
  }

  function unhideTask(id: string) {
    setHiddenIds((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function handleDeleteTask(task: NotionTask) {
    setContextMenu(null)
    setHiddenIds((prev) => ({ ...prev, [task.id]: true }))
    setActionError(null)
    try {
      const result = await window.lattice.deleteTask({ pageId: task.id })
      if (!result.ok) {
        unhideTask(task.id)
        setActionError(result.message ?? 'Impossible de supprimer la tâche.')
      }
    } catch (err) {
      unhideTask(task.id)
      setActionError(String(err))
    }
  }

  async function handleStartFocus(task: NotionTask) {
    setContextMenu(null)
    setActionError(null)
    try {
      const result = await window.lattice.startFocusSession({
        notionTaskId: task.id,
        notionTaskTitle: task.title,
        databaseId: task.databaseId,
      })
      if (!result.ok) {
        setActionError(result.message ?? 'Impossible de démarrer la session focus.')
      }
    } catch (err) {
      setActionError(String(err))
    }
  }

  if (selected) {
    return (
      <div className="widget-shell">
        <TaskDetailPanel
          task={selected}
          onBack={() => setSelected(null)}
          onTaskUpdated={setSelected}
        />
      </div>
    )
  }

  const showLoading = loading && !tasks.length
  const bannerError = actionError ?? error

  function renderDay(day: Date) {
    const iso = toIsoDate(day)
    return (
      <DayCell
        key={iso}
        day={day}
        tasks={byDay.get(iso) ?? []}
        todayIso={todayIso}
        onOpen={setSelected}
        onTaskContextMenu={openTaskContextMenu}
        loading={showLoading}
        dropTarget={dropDay === iso}
        draggingId={draggingId}
        composing={composeDay === iso}
        creating={creating}
        onOpenCompose={() => {
          setComposeDay(iso)
          setActionError(null)
        }}
        onCancelCompose={() => setComposeDay(null)}
        onCreate={(title) => void handleCreate(iso, title)}
        onDragOverDay={handleDragOverDay}
        onDragLeaveDay={handleDragLeaveDay}
        onDropDay={handleDropDay}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
    )
  }

  return (
    <div className="widget-shell cal-shell" ref={shellRef}>
      <div className="widget-header cal-header drag-region">
        <h1 className="cal-title">{view === 'week' ? weekTitle : monthTitle}</h1>
        <div className="header-actions no-drag">
          {config?.demoMode ? <span className="badge-demo">Démo</span> : null}
          <div className="cal-view-toggle" role="tablist">
            <button
              type="button"
              className={`cal-view-btn${view === 'week' ? ' is-active' : ''}`}
              onClick={() => setView('week')}
            >
              Semaine
            </button>
            <button
              type="button"
              className={`cal-view-btn${view === 'month' ? ' is-active' : ''}`}
              onClick={() => setView('month')}
            >
              Mois
            </button>
          </div>
          {view === 'week' ? (
            <button
              className="icon-btn"
              type="button"
              onClick={() => setWeekOffset((v) => v - 1)}
              aria-label="Semaine précédente"
            >
              ‹
            </button>
          ) : null}
          <button className="cal-today-btn" type="button" onClick={goToday}>
            Aujourd’hui
          </button>
          {view === 'week' ? (
            <button
              className="icon-btn"
              type="button"
              onClick={() => setWeekOffset((v) => v + 1)}
              aria-label="Semaine suivante"
            >
              ›
            </button>
          ) : null}
          <button
            className="icon-btn"
            type="button"
            onClick={() => void refresh()}
            aria-label="Rafraîchir"
          >
            ↻
          </button>
        </div>
      </div>

      {bannerError ? <div className="error-banner">{bannerError}</div> : null}

      <div className="cal-daynames">
        {DAY_NAMES.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>

      {showLoading ? (
        <div className="cal-loading">
          <span className="cal-loading-dot" />
          Synchronisation des tâches Notion…
        </div>
      ) : null}

      {view === 'week' ? (
        <div className="cal-grid cal-grid-week">{weekDays.map(renderDay)}</div>
      ) : (
        <div className="cal-scroll" ref={scrollRef} onScroll={handleScroll}>
          {weeks.map(({ days, label }) => {
            const isTodayRow = days.some((d) => toIsoDate(d) === todayIso)
            return (
              <div
                className="cal-week-row"
                key={toIsoDate(days[0])}
                data-label={label}
                data-today-row={isTodayRow ? 'true' : undefined}
              >
                {days.map(renderDay)}
              </div>
            )
          })}
        </div>
      )}

      {contextMenu ? (
        <div
          className="cal-context-menu no-drag"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="cal-context-item"
            role="menuitem"
            onClick={() => {
              setSelected(contextMenu.task)
              setContextMenu(null)
            }}
          >
            Ouvrir
          </button>
          <button
            type="button"
            className="cal-context-item"
            role="menuitem"
            onClick={() => void handleStartFocus(contextMenu.task)}
          >
            Travailler dessus
          </button>
          {contextMenu.confirm ? (
            <button
              type="button"
              className="cal-context-item is-danger"
              role="menuitem"
              onClick={() => void handleDeleteTask(contextMenu.task)}
            >
              Confirmer la suppression
            </button>
          ) : (
            <button
              type="button"
              className="cal-context-item is-danger"
              role="menuitem"
              onClick={() => setContextMenu((m) => (m ? { ...m, confirm: true } : m))}
            >
              Supprimer
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

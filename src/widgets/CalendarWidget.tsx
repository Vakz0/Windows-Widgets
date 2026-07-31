import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react'
import { addDays, startOfWeek, toIsoDate, useTasks } from '../hooks'
import type { NotionTask } from '../vite-env'
import { DayCell } from './calendar/DayCell'
import { monthLong, monthShort, monthTitleOf } from './calendar/dateLabels'
import { useTaskContextMenu } from './TaskContextMenu'
import { TaskDetailPanel } from './TaskDetailPanel'

type CalendarView = 'week' | 'month'

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
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const {
    hiddenIds,
    actionError,
    setActionError,
    openTaskContextMenu,
    menu,
  } = useTaskContextMenu({
    shellRef,
    tasks,
    menuSize: { width: 168, height: 84 },
    onOpen: setSelected,
  })

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

  // Nettoyer overrides une fois que le cache a rattrapé l’état optimiste.
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
    if (scrollFrameRef.current !== null && scrollFrameRef.current !== undefined) return
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
      if (scrollFrameRef.current !== null && scrollFrameRef.current !== undefined) cancelAnimationFrame(scrollFrameRef.current)
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

      {menu}
    </div>
  )
}

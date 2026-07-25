import { useEffect, useState } from 'react'
import type { NotionTask, PublicConfig } from './vite-env'

export function useTasks() {
  const [tasks, setTasks] = useState<NotionTask[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<PublicConfig | null>(null)

  useEffect(() => {
    let alive = true
    const api = window.widgets

    void (async () => {
      try {
        const [initial, cfg] = await Promise.all([api.getTasks(), api.getConfig()])
        if (!alive) return
        setTasks(initial)
        setConfig(cfg)
      } catch (err) {
        if (alive) setError(String(err))
      } finally {
        if (alive) setLoading(false)
      }
    })()

    const offTasks = api.onTasksUpdated((next) => {
      setTasks(next)
      setError(null)
    })
    const offErr = api.onTasksError((message) => setError(message))

    return () => {
      alive = false
      offTasks()
      offErr()
    }
  }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      const next = await window.widgets.refreshTasks()
      setTasks(next)
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return { tasks, error, loading, config, refresh }
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatFrDay(date: Date): string {
  return date
    .toLocaleDateString('fr-FR', { weekday: 'short' })
    .replace('.', '')
    .toLowerCase() + '.'
}

export function formatFrShortDate(iso: string | null): string {
  if (!iso) return 'Sans date'
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

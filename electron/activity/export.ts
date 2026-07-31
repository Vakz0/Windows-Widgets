import fs from 'node:fs'
import path from 'node:path'
import { app, dialog } from 'electron'
import type { ActivityExportFormat, ActivitySegment } from '../../shared/types'
import { readFocusJournalInRange } from '../focusSession'
import { readWatchMap } from '../activityMediaBridge'
import { buildSummary, buildTransitions, type SummaryDeps } from './aggregator'
import { listDayFilesInRange, isDayKey, todayKey } from './paths'
import { liveOpenSegment } from './poll'
import { segmentMs } from './segmentUtils'
import {
  readDaySegments,
  readFeedbackEntries,
} from './storage'

type ExportHooks = {
  summaryDeps: () => SummaryDeps
}

let hooks: ExportHooks | null = null

export function setExportHooks(next: ExportHooks): void {
  hooks = next
}

export async function exportActivity(opts: {
  format: ActivityExportFormat
  from?: string
  to?: string
}): Promise<{ ok: boolean; path?: string; message?: string }> {
  if (!hooks) {
    return { ok: false, message: 'Export non initialisé.' }
  }
  const from = opts.from && isDayKey(opts.from) ? opts.from : todayKey()
  const to = opts.to && isDayKey(opts.to) ? opts.to : from
  const dates = listDayFilesInRange(from, to)
  const byDate = new Map<string, ActivitySegment[]>()
  const segments: ActivitySegment[] = []
  for (const d of dates) {
    const daySegs = readDaySegments(d)
    byDate.set(d, daySegs)
    segments.push(...daySegs)
  }
  const live = liveOpenSegment()
  if (live) {
    const liveDay = todayKey(new Date(live.start))
    if (liveDay >= from && liveDay <= to) segments.push(live)
  }

  const feedback = readFeedbackEntries().filter((e) => {
    const day = e.at.slice(0, 10)
    return day >= from && day <= to
  })
  const focusJournal = readFocusJournalInRange(from, to)

  const defaultName =
    opts.format === 'csv'
      ? `lattice-activity-${from}_${to}.csv`
      : `lattice-activity-${from}_${to}.json`

  const result = await dialog.showSaveDialog({
    title: 'Exporter l’activité',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters:
      opts.format === 'csv'
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : [{ name: 'JSON', extensions: ['json'] }],
  })
  if (result.canceled || !result.filePath) {
    return { ok: false, message: 'Export annulé.' }
  }

  try {
    if (opts.format === 'json') {
      const deps = hooks.summaryDeps()
      const payload = {
        from,
        to,
        exportedAt: new Date().toISOString(),
        segments,
        feedback,
        focusJournal,
        transitions: buildTransitions(segments),
        summaries: dates.map((d) => buildSummary(d, byDate.get(d) ?? [], null, deps)),
        watchByDay: Object.fromEntries(dates.map((d) => [d, readWatchMap(d)])),
      }
      fs.writeFileSync(result.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    } else {
      const header = [
        'start',
        'end',
        'app',
        'title',
        'category',
        'durationMs',
        'categorySource',
        'matchedPattern',
        'confidence',
        'idleSec',
        'prevApp',
        'sessionId',
        'exeDir',
        'titleHash',
        'domain',
        'urlPath',
        'contextKind',
        'fileName',
        'projectName',
        'ignored',
        'focusSessionId',
        'notionTaskId',
        'notionTaskTitle',
      ].join(',')
      const rows = segments.map((s) => {
        const title = (s.title ?? '').replace(/"/g, '""')
        const taskTitle = (s.notionTaskTitle ?? '').replace(/"/g, '""')
        return [
          s.start,
          s.end,
          s.app,
          `"${title}"`,
          s.category,
          String(segmentMs(s)),
          s.categorySource ?? '',
          s.matchedPattern ?? '',
          s.confidence ?? '',
          s.idleSec != null ? String(s.idleSec) : '',
          s.prevApp ?? '',
          s.sessionId ?? '',
          s.exeDir ?? '',
          s.titleHash ?? '',
          s.domain ?? '',
          s.urlPath ?? '',
          s.contextKind ?? '',
          s.fileName ?? '',
          s.projectName ?? '',
          s.ignored ? '1' : '0',
          s.focusSessionId ?? '',
          s.notionTaskId ?? '',
          `"${taskTitle}"`,
        ].join(',')
      })
      const watchHeader = 'date,domain,watchMs,kind'
      const watchRows: string[] = []
      for (const d of dates) {
        for (const [domain, ms] of Object.entries(readWatchMap(d))) {
          watchRows.push([d, domain, String(ms), 'watch'].join(','))
        }
      }
      fs.writeFileSync(
        result.filePath,
        `${[header, ...rows].join('\n')}\n\n${[watchHeader, ...watchRows].join('\n')}\n`,
        'utf8',
      )
    }
    return { ok: true, path: result.filePath }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Échec de l’export.',
    }
  }
}

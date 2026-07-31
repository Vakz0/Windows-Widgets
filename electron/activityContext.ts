/**
 * Structured context from window titles + browser URL helper (UI Automation).
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'
import type {
  ActivityBrowserDetail,
  ActivityCategory,
  ActivityContextKind,
} from '../shared/types'

const execFileAsync = promisify(execFile)

export const BROWSER_APPS = new Set([
  'chrome',
  'msedge',
  'msedgewebview2',
  'brave',
  'firefox',
  'opera',
  'vivaldi',
  'chromium',
  'arc',
])

export type ParsedContext = {
  contextKind: ActivityContextKind | null
  fileName: string | null
  projectName: string | null
  domain: string | null
  urlPath: string | null
}

const EMPTY: ParsedContext = {
  contextKind: null,
  fileName: null,
  projectName: null,
  domain: null,
  urlPath: null,
}

/** domain (without www.) → category */
const DOMAIN_CATEGORY: Record<string, ActivityCategory> = {
  'youtube.com': 'entertainment',
  'youtu.be': 'entertainment',
  'netflix.com': 'entertainment',
  'twitch.tv': 'entertainment',
  'disneyplus.com': 'entertainment',
  'primevideo.com': 'entertainment',
  'spotify.com': 'entertainment',
  'reddit.com': 'entertainment',
  'tiktok.com': 'entertainment',
  'instagram.com': 'entertainment',
  'facebook.com': 'entertainment',
  'twitter.com': 'entertainment',
  'x.com': 'entertainment',
  'github.com': 'work',
  'gitlab.com': 'work',
  'stackoverflow.com': 'work',
  'stackexchange.com': 'work',
  'notion.so': 'work',
  'notion.site': 'work',
  'docs.google.com': 'work',
  'drive.google.com': 'work',
  'sheets.google.com': 'work',
  'localhost': 'work',
  '127.0.0.1': 'work',
  'linear.app': 'work',
  'atlassian.net': 'work',
  'jira.com': 'work',
  'figma.com': 'work',
  'vercel.app': 'work',
  'mail.google.com': 'communication',
  'outlook.live.com': 'communication',
  'outlook.office.com': 'communication',
  'outlook.office365.com': 'communication',
  'teams.microsoft.com': 'communication',
  'web.whatsapp.com': 'communication',
  'slack.com': 'communication',
  'discord.com': 'communication',
  'app.slack.com': 'communication',
}

let urlCache: { at: number; app: string; url: string | null } | null = null
const URL_CACHE_MS = 2_800

function resolveActiveUrlExe(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'active-url', 'active-url.exe'),
    path.join(app.getAppPath(), 'tools', 'active-url', 'publish', 'active-url.exe'),
    path.join(process.cwd(), 'tools', 'active-url', 'publish', 'active-url.exe'),
    path.join(__dirname, '..', 'tools', 'active-url', 'publish', 'active-url.exe'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

export function normalizeDomain(host: string): string {
  const h = host.trim().toLowerCase().replace(/\.$/, '')
  return h.startsWith('www.') ? h.slice(4) : h
}

<<<<<<< HEAD
function parseUrlParts(
=======
export function parseUrlParts(
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  rawUrl: string | null | undefined,
  detail: ActivityBrowserDetail,
): { domain: string | null; urlPath: string | null } {
  if (!rawUrl || detail === 'off') return { domain: null, urlPath: null }
  try {
    let input = rawUrl.trim()
    if (!/^https?:\/\//i.test(input) && !/^file:/i.test(input)) {
      input = `https://${input}`
    }
    const u = new URL(input)
    const domain = normalizeDomain(u.hostname)
    if (detail === 'domain') return { domain, urlPath: null }
    const urlPath = `${u.pathname || '/'}${u.search || ''}${u.hash || ''}`
    return { domain, urlPath: urlPath === '/' ? null : urlPath }
  } catch {
    // bare domain
    const m = rawUrl.match(/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i)
    return m ? { domain: normalizeDomain(m[1]), urlPath: null } : { domain: null, urlPath: null }
  }
}

export function isActiveUrlHelperAvailable(): boolean {
  return resolveActiveUrlExe() !== null
}

export function categoryFromDomain(
  domain: string | null,
  overrides?: Record<string, ActivityCategory> | null,
): {
  category: ActivityCategory
  matched: string
} | null {
  if (!domain) return null
  const d = normalizeDomain(domain)
  if (overrides?.[d]) return { category: overrides[d], matched: d }
  for (const [key, cat] of Object.entries(overrides ?? {})) {
    const k = normalizeDomain(key)
    if (d === k || d.endsWith(`.${k}`)) {
      return { category: cat, matched: k }
    }
  }
  if (DOMAIN_CATEGORY[d]) return { category: DOMAIN_CATEGORY[d], matched: d }
  // suffix match (foo.atlassian.net)
  for (const [key, cat] of Object.entries(DOMAIN_CATEGORY)) {
    if (d === key || d.endsWith(`.${key}`)) {
      return { category: cat, matched: key }
    }
  }
  return null
}

<<<<<<< HEAD
type TitleParser = (title: string) => ParsedContext

function parseCursorOrCodeTitle(t: string): ParsedContext {
  // Cursor / VS Code: "file — project — Cursor" (hyphen or dash variants)
  const ide = t.match(
    /^[\s●]*(.+?) (?:—|–|-) (.+?) (?:—|–|-) (Cursor|Visual Studio Code|Code - Insiders)$/i,
  )
  if (ide) {
    return {
      contextKind: 'ide',
      fileName: ide[1].trim() || null,
      projectName: ide[2].trim() || null,
      domain: null,
      urlPath: null,
    }
  }
  return { ...EMPTY }
}

function parseDevenvTitle(t: string): ParsedContext {
  const vs = t.match(/^(.+?) (?:—|–|-) (.+?)(?: (?:—|–|-) Microsoft Visual Studio)?$/i)
  if (vs) {
    return {
      contextKind: 'ide',
      fileName: vs[1].trim() || null,
      projectName: vs[2].trim() || null,
      domain: null,
      urlPath: null,
    }
  }
  return { ...EMPTY }
}

function parseSlackTitle(t: string): ParsedContext {
  // "channel (workspace) - Slack" or "channel | workspace - Slack"
  const slack = t.match(/^(.+?) (?:\||\()(.+?)\)? (?:—|–|-) Slack$/i)
  if (slack) {
    return {
      contextKind: 'chat',
      fileName: slack[1].trim() || null,
      projectName: slack[2].trim() || null,
      domain: null,
      urlPath: null,
    }
  }
  return {
    contextKind: 'chat',
    fileName: null,
    projectName: null,
    domain: null,
    urlPath: null,
  }
}

function parseChatAppTitle(_t: string): ParsedContext {
  return {
    contextKind: 'chat',
    fileName: null,
    projectName: null,
    domain: null,
    urlPath: null,
  }
}

const IDE_CHAT_TITLE_PARSERS: Record<string, TitleParser> = {
  cursor: parseCursorOrCodeTitle,
  code: parseCursorOrCodeTitle,
  'code - insiders': parseCursorOrCodeTitle,
  devenv: parseDevenvTitle,
  slack: parseSlackTitle,
  discord: parseChatAppTitle,
  teams: parseChatAppTitle,
  msteams: parseChatAppTitle,
}

=======
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
export function parseIdeOrChatTitle(
  app: string,
  title: string | null,
  enabled: boolean,
): ParsedContext {
  if (!enabled || !title) return { ...EMPTY }
<<<<<<< HEAD
  const parser = IDE_CHAT_TITLE_PARSERS[app]
  if (!parser) return { ...EMPTY }
  return parser(title.trim())
}

function parseBrowserTitleFallback(title: string | null): string | null {
=======

  const t = title.trim()
  // Cursor / VS Code: "file — project — Cursor" (hyphen or dash variants)
  if (app === 'cursor' || app === 'code' || app === 'code - insiders') {
    const ide = t.match(
      /^[\s●]*(.+?) (?:—|–|-) (.+?) (?:—|–|-) (Cursor|Visual Studio Code|Code - Insiders)$/i,
    )
    if (ide) {
      return {
        contextKind: 'ide',
        fileName: ide[1].trim() || null,
        projectName: ide[2].trim() || null,
        domain: null,
        urlPath: null,
      }
    }
  }

  if (app === 'devenv') {
    const vs = t.match(/^(.+?) (?:—|–|-) (.+?)(?: (?:—|–|-) Microsoft Visual Studio)?$/i)
    if (vs) {
      return {
        contextKind: 'ide',
        fileName: vs[1].trim() || null,
        projectName: vs[2].trim() || null,
        domain: null,
        urlPath: null,
      }
    }
  }

  if (app === 'slack') {
    // "channel (workspace) - Slack" or "channel | workspace - Slack"
    const slack = t.match(/^(.+?) (?:\||\()(.+?)\)? (?:—|–|-) Slack$/i)
    if (slack) {
      return {
        contextKind: 'chat',
        fileName: slack[1].trim() || null,
        projectName: slack[2].trim() || null,
        domain: null,
        urlPath: null,
      }
    }
    return {
      contextKind: 'chat',
      fileName: null,
      projectName: null,
      domain: null,
      urlPath: null,
    }
  }

  if (app === 'discord' || app === 'teams' || app === 'msteams') {
    return {
      contextKind: 'chat',
      fileName: null,
      projectName: null,
      domain: null,
      urlPath: null,
    }
  }

  return { ...EMPTY }
}

export function parseBrowserTitleFallback(title: string | null): string | null {
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
  if (!title) return null
  // "Page title - Google Chrome" / "Page title - Microsoft Edge"
  const m = title.match(
    /^(.+?) (?:—|–|-) (?:Google Chrome|Microsoft Edge|Brave|Mozilla Firefox|Opera|Vivaldi|Arc)$/i,
  )
  return m?.[1]?.trim() || null
}

/** Extract domain/path from a browser window title when UIA URL is unavailable. */
export function domainFromBrowserTitle(
  title: string | null,
  detail: ActivityBrowserDetail,
): { domain: string | null; urlPath: string | null } {
  if (detail === 'off' || !title) return { domain: null, urlPath: null }
  const pageTitle = parseBrowserTitleFallback(title)
  if (pageTitle) {
    const fromPage = parseUrlParts(pageTitle, detail)
    if (fromPage.domain) return fromPage
  }
  const host = title.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i)
  if (host) return parseUrlParts(host[0], detail)
  return { domain: null, urlPath: null }
}

<<<<<<< HEAD
/** Parse active-url.exe stdout (last JSON line) into a raw URL string. */
function parseActiveUrlHelperOutput(stdout: string): string | null {
  const line = stdout.trim().split(/\r?\n/).pop() ?? '{}'
  const parsed = JSON.parse(line) as { url?: string | null }
  return typeof parsed.url === 'string' && parsed.url ? parsed.url : null
}

=======
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
export async function fetchBrowserUrl(
  app: string,
  detail: ActivityBrowserDetail,
): Promise<{ domain: string | null; urlPath: string | null; rawUrl: string | null }> {
  if (detail === 'off' || !BROWSER_APPS.has(app)) {
    return { domain: null, urlPath: null, rawUrl: null }
  }

  const now = Date.now()
  if (urlCache && urlCache.app === app && now - urlCache.at < URL_CACHE_MS) {
    const parts = parseUrlParts(urlCache.url, detail)
    return { ...parts, rawUrl: urlCache.url }
  }

  const exe = resolveActiveUrlExe()
  if (!exe) {
    return { domain: null, urlPath: null, rawUrl: null }
  }

  try {
    const { stdout } = await execFileAsync(exe, [], {
      timeout: 1_600,
      windowsHide: true,
      maxBuffer: 64 * 1024,
    })
<<<<<<< HEAD
    const rawUrl = parseActiveUrlHelperOutput(stdout)
=======
    const line = stdout.trim().split(/\r?\n/).pop() ?? '{}'
    const parsed = JSON.parse(line) as { url?: string | null }
    const rawUrl = typeof parsed.url === 'string' && parsed.url ? parsed.url : null
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    urlCache = { at: now, app, url: rawUrl }
    const parts = parseUrlParts(rawUrl, detail)
    return { ...parts, rawUrl }
  } catch {
    urlCache = { at: now, app, url: null }
    return { domain: null, urlPath: null, rawUrl: null }
  }
}

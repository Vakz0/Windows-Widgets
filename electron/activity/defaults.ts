import type { ActivityCategory, ActivityRules, ActivitySettings } from '../../shared/types'

export const POLL_MS = 2_000
export const FLUSH_EVERY_POLLS = 15
/**
 * Segment dwell: focus must stay stable this long before we commit an app switch.
 * Not the same as focusOffProjectDwellSec (interrupt delay during a focus session).
 */
export const FOCUS_DWELL_MS = 3_000
/** Allowed range for focusOffProjectDwellSec (focus-session off-allowlist → interrupt). */
export const FOCUS_OFF_PROJECT_DWELL_MIN_SEC = 3
export const FOCUS_OFF_PROJECT_DWELL_MAX_SEC = 120

export const CATEGORIES: ActivityCategory[] = [
  'work',
  'entertainment',
  'communication',
  'system',
  'other',
  'afk',
]

export const DEFAULT_SETTINGS: ActivitySettings = {
  paused: false,
  storeTitles: true,
  idleThresholdSec: 180,
  browserDetail: 'domain',
  parseIdeTitles: true,
  focusOffProjectDwellSec: 8,
}

export const DEFAULT_RULES: ActivityRules = {
  appDefaults: {
    code: 'work',
    cursor: 'work',
    devenv: 'work',
    idea64: 'work',
    'windows terminal': 'work',
    windowsterminal: 'work',
    powershell: 'work',
    pwsh: 'work',
    cmd: 'work',
    notion: 'work',
    figma: 'work',
    blender: 'work',
    excel: 'work',
    winword: 'work',
    powerpnt: 'work',
    spotify: 'entertainment',
    steam: 'entertainment',
    epicgameslauncher: 'entertainment',
    discord: 'communication',
    slack: 'communication',
    teams: 'communication',
    msteams: 'communication',
    outlook: 'communication',
    hxoutlook: 'communication',
    explorer: 'system',
    searchhost: 'system',
    startmenuexperiencehost: 'system',
    shellhost: 'system',
    applicationframehost: 'system',
    systemsettings: 'system',
    taskmgr: 'system',
  },
  titlePatterns: [
    { pattern: 'youtube', category: 'entertainment' },
    { pattern: 'netflix', category: 'entertainment' },
    { pattern: 'twitch', category: 'entertainment' },
    { pattern: 'disney+', category: 'entertainment' },
    { pattern: 'prime video', category: 'entertainment' },
    { pattern: 'spotify', category: 'entertainment' },
    { pattern: 'facebook', category: 'entertainment' },
    { pattern: 'instagram', category: 'entertainment' },
    { pattern: 'tiktok', category: 'entertainment' },
    { pattern: 'reddit', category: 'entertainment' },
    { pattern: 'twitter', category: 'entertainment' },
    { pattern: 'x.com', category: 'entertainment' },
    { pattern: 'github', category: 'work' },
    { pattern: 'gitlab', category: 'work' },
    { pattern: 'stackoverflow', category: 'work' },
    { pattern: 'notion', category: 'work' },
    { pattern: 'localhost', category: 'work' },
    { pattern: 'docs.google', category: 'work' },
    { pattern: 'jira', category: 'work' },
    { pattern: 'linear.app', category: 'work' },
    { pattern: 'figma', category: 'work' },
    { pattern: 'outlook', category: 'communication' },
    { pattern: 'gmail', category: 'communication' },
    { pattern: 'mail.google', category: 'communication' },
    { pattern: 'teams', category: 'communication' },
    { pattern: 'slack', category: 'communication' },
    { pattern: 'discord', category: 'communication' },
  ],
  userAppOverrides: {},
  ignoredApps: ['lattice', 'lattice-desk'],
}

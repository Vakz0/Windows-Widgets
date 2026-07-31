import type { ActivityCategory, ActivityRules, ActivitySettings } from '../../shared/types'

export const POLL_MS = 2_000
export const FLUSH_EVERY_POLLS = 15
/** Focus must stay stable this long before we commit an app switch. */
export const FOCUS_DWELL_MS = 3_000

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
    { pattern: 'youtube|netflix|twitch|disney\\+|prime video|spotify', category: 'entertainment' },
    { pattern: 'facebook|instagram|tiktok|reddit|twitter|x\\.com', category: 'entertainment' },
    {
      pattern: 'github|gitlab|stackoverflow|notion|localhost|docs\\.google|jira|linear\\.app|figma',
      category: 'work',
    },
    { pattern: 'outlook|gmail|mail\\.google|teams|slack|discord', category: 'communication' },
  ],
  userAppOverrides: {},
  ignoredApps: ['lattice', 'lattice-desk'],
}

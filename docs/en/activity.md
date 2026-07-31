# Activity tracker

[English](activity.md) · [Français](../fr/activity.md)

Local time-tracking for Lattice with **structured software context** (browser domain, IDE file/project).

## What it does

- **Foreground-only** poll (~2 s): only the focused window is timed (a background app is not counted)
- Process + title + structured context
- **Browser**: domain (or full URL) via UI Automation (`active-url.exe`)
- **IDE**: parse Cursor / VS Code → file + project
- Classification: domain → title rules → app → Other
- Manual corrections → `feedback.jsonl` + rules (apps, titles, **domains**)
- Widget: summary, top apps / **sites** / **projects**, now, **day-by-day history**
- Options: pause, Web, titles, IDE parse, AFK threshold
- **Optional browser extension**: media playback → no AFK + **watch time** per site (`extensions/lattice-media`)
- Enriched CSV / JSON export
- **Effacer…** button: deletes history (`days/`) and feedback; keeps `rules.json` / settings

## What is not counted

- **Background apps** — collector uses `GetForegroundWindow` only
- **Lattice widgets** — focus on Lattice → `ignored` segment (out of active time and tops); UI hint “Widgets Lattice — non comptés”
- **Focus under 3 s** — an app switch is committed only after **3 s** of stable focus (ignores Alt-Tab / tray flashes); AFK still switches immediately
- Extensible `ignoredApps` in `rules.json` (default: `lattice`, `lattice-desk`)

## Privacy

- **100 % local** under `%APPDATA%\lattice-desk\activity\`
- `browserDetail`: `domain` (default) | `url` | `off` — **Web:** button in the widget
- `parseIdeTitles`: parse IDE titles (default on)
- **Titles off**: no title text; `titleHash` kept
- No cloud sync, keylogging, or screenshots

## Limits

- Focus only (not background apps)
- UIA URL may fail in fullscreen / if the address bar UI changes
- IDE title formats vary
- No URL without the `active-url` helper (.NET build)

## Files

| Path | Role |
| --- | --- |
| `activity/settings.json` | Pause, titles, AFK, `browserDetail`, `parseIdeTitles` |
| `activity/rules.json` | Apps, title patterns, app/domain overrides, `ignoredApps` |
| `activity/feedback.jsonl` | Corrections |
| `activity/days/YYYY-MM-DD.jsonl` | Segments |
| `activity/days/YYYY-MM-DD.watch.json` | Extension watch time per domain |
| `activity/media-bridge.json` | Token + endpoint for the media extension (created on start) |

### Media extension (AFK + Watch)

To avoid AFK while a browser video/audio is playing **and** track watch time per site (YouTube, Netflix…):

1. Enable the Activity widget (bridge on `127.0.0.1:17384`)
2. Load `extensions/lattice-media` as an unpacked extension (Chrome / Edge / Brave)
3. Paste the `token` from `media-bridge.json` into the extension options

The widget shows a **Visionnage** (Watch) section from the extension (real playback), separate from **Top sites** (window focus).

Details: [`extensions/lattice-media/README.md`](../../extensions/lattice-media/README.md).

While `playing` is reported (heartbeat &lt; 45 s), keyboard/mouse idle **does not** trigger AFK. **Média** badge in the widget.

### Useful segment fields

Base: `start`, `end`, `app`, `title`, `category`, source/confidence, idle, session, `ignored?`…

Context:

| Field | Example |
| --- | --- |
| `domain` | `github.com` |
| `urlPath` | `/org/repo` (when `browserDetail=url`) |
| `contextKind` | `browser` / `ide` / `chat` |
| `fileName` | `activity.ts` |
| `projectName` | `windows-widgets` |

### Classification

1. idle → AFK  
2. `userAppOverrides`  
3. **domain** (`userDomainOverrides` then built-in table: `youtube.com` → entertainment, `github.com` → work, …)  
4. title patterns  
5. app defaults  
6. `other`

`ignored` segments and AFK are excluded from active totals and tops.

If `active-url.exe` is missing, the domain is inferred from the window title (fallback).

## Enable

Systray → **Catalog** → **Activity**. Rebuild helpers: `npm run build:helpers`.

## Technical notes

- Service `activity-tracker`
- Win32 focus via `koffi`; URL via `tools/active-url` (WPF UI Automation)
- Lattice detection: `BrowserWindow` HWND + exe path / `ignoredApps`
- Focus dwell: `FOCUS_DWELL_MS = 3000`
- Idle via `powerMonitor.getSystemIdleTime()`

# Development

[English](development.md) · [Français](../fr/development.md)

## Setup

Windows 10/11, Node.js 20+, .NET SDK (for `tools/cpu-temp` and `tools/active-url`).

```bash
npm install
npm run dev      # Vite + Electron hot reload
npm run build && npm run app
npm run dist     # NSIS installer → release/
```

Dev config: copy `config.example.json` → `config.json` at the repo root.

Agent / contributor invariants: [`.cursor/rules/CURSOR.mdc`](../../.cursor/rules/CURSOR.mdc) · decisions: [`docs/en/decisions.md`](decisions.md).

### Quality gates

```bash
npm run verify   # vitest + tsc (also runs in CI on PR/push and before release)
npm run build    # helpers + tsc + vite
```

Optional local pre-commit: `git config core.hooksPath .githooks` (runs `npm run verify`).

## Layout

```
electron/           # Main process
  activity/         # Activity tracker domain
  focus/            # Focus sessions + interrupt window
  notion/           # Notion API domain
  bootstrap/        # App wiring helpers (tray, refresh, public config)
  ipc/              # IPC handlers by domain (*Ipc.ts)
  preload/          # contextBridge API slices (*Api.ts)
  windows/ widgets/
src/                # React widgets (by feature under widgets/)
shared/             # Shared types (types/) + pure helpers
extensions/         # Browser extension (media bridge)
tools/cpu-temp/ tools/active-url/
docs/               # Guides (EN/FR) + decisions log
.cursor/            # Cursor rules + versioned project memory
.githooks/          # Optional pre-commit (verify)
```

Prefer domain folders over growing root files. Thin root façades (`electron/activity.ts`, `electron/notion.ts`, `electron/preload.ts`) only re-export domains — do **not** recreate deleted `@deprecated` shims (D21).

## Glossary

| Term | Meaning |
| --- | --- |
| **Catalog shell** | Fresh install opens no desktop widgets; enable them from Catalog (D01). |
| **enabled** | Widget is on in config / may start its services. Not the same as the window being visible. |
| **Tray show/hide** | Hides or shows an already-enabled desktop window; does not flip `enabled`. |
| **Builtin widget** | Shipped in-app: `calendar`, `tasks`, `activity`. |
| **Internal window** | Not in the user Catalog: `catalog` (shell UI), `focus-interrupt` (guard modal). |
| **Dual registry** | React map in `src/widgets/registry.tsx` + main defs in `electron/widgets/registry.ts`. Internals are React-only or window helpers, not both. |
| **Service** | Runtime dep declared on a widget (`notion`, `activity-tracker`, `system-stats`, `temp-daemon`). Started only while some **enabled** widget needs it (D06). |
| **`system-stats` / `temp-daemon`** | No builtin after Monitor removal (D07). Kept for **external** widgets and tray helpers; without a consumer, temp elevate stays gated off. |
| **`window.lattice`** | Only renderer↔main bridge (preload `contextBridge`). Renderer never imports `electron/`. |
| **Activity poll** | Foreground-only ~2 s loop in `electron/activity/poll.ts` (D08). |
| **Segment dwell** | `FOCUS_DWELL_MS` (3 s): stable focus before committing an app-switch segment. |
| **Focus off-project dwell** | `focusOffProjectDwellSec` (default 8 s): how long off-allowlist before the interrupt window. Different clock from segment dwell. |
| **Media bridge** | Localhost HTTP + optional browser extension for playback / AFK / watch time (D10). |
| **Demo mode** | Notion token missing/placeholder → local demo store (D13). |
| **Power mode** | active / idle / sleep → Notion & stats refresh intervals (D20). |
| **External widget** | Zip + `manifest.json` under userData; optional remote catalog (D11). |
| **PublicConfig** | Config sent to renderer with secrets stripped (`bootstrap/publicConfig.ts`). |
| **Path confinement** | Activity/focus files via `resolveWithin` / `assertWithin` (D15). |
| **`startFocusForTask`** | Single UI entry to start a Notion focus session — do not duplicate the IPC payload (D22). |

## Publish a release

1. Bump `version` in `package.json`
2. Commit + annotated tag: `git tag v1.2.0 && git push origin v1.2.0`
3. The [`.github/workflows/release.yml`](../../.github/workflows/release.yml) workflow:
   - builds .NET helpers + the NSIS installer
   - publishes to GitHub Releases (`latest.yml` for `electron-updater`)
   - uploads `widgets-catalog.json`

End users download from [Releases](https://github.com/Vakz0/Lattice/releases/latest). Code signing is not set up yet (SmartScreen may warn).

## External widgets

Runtime path: `%APPDATA%/lattice-desk/widgets/<id>/`.

### `manifest.json`

```json
{
  "id": "example",
  "version": "1.0.0",
  "label": "Example",
  "description": "Remote widget",
  "placement": "desktop",
  "services": [],
  "entry": "index.html",
  "defaultBounds": { "width": 360, "height": 480 }
}
```

Package = zip with `manifest.json` + `index.html` (and assets). The zip root may be flat or a single subfolder.

### Remote catalog

File [`widgets-catalog.json`](../../widgets-catalog.json):

```json
{
  "widgets": [
    {
      "id": "example",
      "label": "Example",
      "version": "1.0.0",
      "downloadUrl": "https://github.com/Vakz0/Lattice/releases/download/v1.2.0/widget-example-1.0.0.zip",
      "sha256": "…",
      "minAppVersion": "1.2.0"
    }
  ]
}
```

URLs checked by the app (in order):

1. `https://github.com/Vakz0/Lattice/releases/latest/download/widgets-catalog.json`
2. `https://raw.githubusercontent.com/Vakz0/Lattice/main/widgets-catalog.json`

## Add a builtin widget

1. React component in `src/widgets/` (feature subfolder optional)
2. Register in `src/widgets/registry.tsx`
3. Add definition in `electron/widgets/registry.ts`
4. New IPC → `electron/ipc/<domain>Ipc.ts` + `electron/preload/<domain>Api.ts` + `src/vite-env.d.ts` (wire through `electron/ipc/index.ts` and `electron/preload.ts`)

### Services

| Service id | Used by builtins today | Notes |
| --- | --- | --- |
| `notion` | `calendar`, `tasks` | Notion fetch/edit |
| `activity-tracker` | `activity` | Local activity + focus sessions |
| `system-stats` | — (no builtin) | External widgets + optional tray CPU/RAM refresh when declared |
| `temp-daemon` | — (no builtin) | External widgets; tray “elevate temp” only if some enabled widget declares it |

The former `monitor` builtin was removed (D07). Keeping these service ids is intentional — not a half-removal.

Native helpers: `npm run build:helpers` (cpu-temp + active-url).

## Scripts

| Script | Role |
| --- | --- |
| `dev` | Dev mode |
| `build` | Production build (+ helpers) |
| `test` | Vitest |
| `app` | Run last build |
| `dist` | Package installer |
| `shortcuts` | Recreate Desktop / Start Menu shortcuts |

Contributor path: `Preparer-lancement.bat` then the **Lattice** shortcut. End-user path: NSIS installer.

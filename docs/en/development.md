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

Agent / contributor invariants: [`CLAUDE.md`](../../CLAUDE.md) · decisions: [`docs/en/decisions.md`](decisions.md).

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

Prefer domain folders over growing root files. Root `electron/*.ts` files marked `@deprecated` are migration shims — import from the domain module instead.

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
| `system-stats` | — (no builtin) | Reserved for external / tray stats consumers |
| `temp-daemon` | — (no builtin) | Reserved for temperature helper consumers |

The former `monitor` builtin was removed; do not assume a desktop monitor widget exists.

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

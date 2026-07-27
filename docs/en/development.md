# Development

[English](../en/development.md) · [Français](../fr/development.md)

> Set up a local environment, run Lattice in dev or production, and package an installer.

## Prerequisites

| Tool | Version / notes |
| --- | --- |
| Windows | 10 or 11 |
| [Node.js](https://nodejs.org/) | 20+ recommended |
| npm | Comes with Node |
| [.NET SDK](https://dotnet.microsoft.com/download) | Required to build `tools/cpu-temp` (`npm run build:temp`) |

## Install and run

```bash
npm install
npm run dev
```

`npm run dev` builds the temperature helper, then starts Vite with the Electron plugin (hot reload for renderer and main).

**Dev config:** copy `config.example.json` to `config.json` at the repo root (gitignored). That file is read first; include `projectSources` to test secondary Notion sources. See [configuration.md](configuration.md).

For a production-style run:

```bash
npm run build
npm run app
```

Or use the end-user path: double-click `Preparer-lancement.bat`, then the **Lattice** Desktop shortcut (runs [`scripts/lancer.ps1`](../../scripts/lancer.ps1) via [`Lancer-Lattice.vbs`](../../Lancer-Lattice.vbs), with auto-rebuild when sources are newer than `dist-electron`).

## npm scripts

| Script | What it does |
| --- | --- |
| `build:temp` | `dotnet publish` → `tools/cpu-temp/publish` |
| `dev` | `build:temp` + Vite + Electron |
| `build` | `build:temp` + `tsc --noEmit` + Vite production build |
| `app` | `electron .` (expects a prior `build`) |
| `start` | `build` then `electron .` |
| `shortcuts` | Recreate Desktop / Start Menu shortcuts |
| `pack` | electron-builder dir output |
| `dist` | NSIS installer under `release/` |

Regenerate brand PNG / ICO from SVG sources: `node scripts/export-brand-assets.mjs` (requires local `sharp` and `to-ico` — see [brand identity](brand.md)).

## Folder layout

```
windows-widgets/          # repo root (npm name: lattice-desk)
├── electron/             # Main process, preload, Notion, system, tray, config
│   └── widgets/          # Builtin registry + external plugin stub
├── src/                  # React renderer
│   └── widgets/          # Catalog, Calendar, Tasks, Monitor, registry, TaskDetailPanel
├── shared/               # Shared types + widget contract (widget.ts)
├── tools/cpu-temp/       # C# temperature helper
├── scripts/              # lancer.ps1, creer-raccourcis.ps1, export-brand-assets.mjs
├── assets/               # icon.png, icon.ico, tray icons
│   └── brand/            # logo SVG, banner.png, social.png
├── docs/                 # This documentation (incl. brand.md)
├── Preparer-lancement.bat
├── Lancer-Lattice.vbs
├── config.example.json
└── package.json
```

<details>
<summary>Build outputs (gitignored)</summary>

| Path | Content |
| --- | --- |
| `dist/` | Renderer (Vite) |
| `dist-electron/` | Main + preload JS |
| `tools/cpu-temp/publish/` | `cpu-temp.exe` |
| `release/` | electron-builder artifacts |

</details>

## Adding a builtin widget

1. Create the React component under `src/widgets/MyWidget.tsx`.
2. Register it in [`src/widgets/registry.tsx`](../../src/widgets/registry.tsx) (`widgetComponents`).
3. Add a `WidgetDefinition` in [`electron/widgets/registry.ts`](../../electron/widgets/registry.ts) (id, label, description, placement, services, defaultBounds).
4. If the widget needs new IPC APIs, expose them in `electron/main.ts` + `electron/preload.ts` + `src/vite-env.d.ts`.
5. Document in the READMEs and [architecture.md](architecture.md) (EN + FR).

External plugins (`%APPDATA%/lattice-desk/widgets/`) are reserved via [`discoverExternal.ts`](../../electron/widgets/discoverExternal.ts) but are not loaded in this version.

## Packaging

```bash
npm run dist
```

Uses electron-builder (`appId`: `com.vakz.lattice-desk`, product name **Lattice**). Extra resources include `assets/` and the published `cpu-temp` binary. Output: `release/` (NSIS on Windows).

## Windows helper scripts

| File | Role |
| --- | --- |
| `Preparer-lancement.bat` | One-shot: `npm run build` + create shortcuts |
| `scripts/creer-raccourcis.ps1` | Desktop + Start Menu `.lnk` → `Lancer-Lattice.vbs` |
| `Lancer-Lattice.vbs` | Silent launch wrapper |
| `scripts/lancer.ps1` | Rebuild if needed, then start Electron |

## Next steps

- Wire Notion: [notion.md](notion.md)
- Understand config: [configuration.md](configuration.md)
- Architecture overview: [architecture.md](architecture.md)

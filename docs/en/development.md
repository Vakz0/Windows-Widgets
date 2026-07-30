# Development

[English](development.md) · [Français](../fr/development.md)

## Setup

Windows 10/11, Node.js 20+, .NET SDK (for `tools/cpu-temp`).

```bash
npm install
npm run dev      # Vite + Electron hot reload
npm run build && npm run app
npm run dist     # NSIS installer → release/
```

Dev config: copy `config.example.json` → `config.json` at the repo root.

## Layout

```
electron/     # Main process (Notion, tray, config, widget registry)
src/          # React widgets
shared/       # Shared types
tools/cpu-temp/
assets/
```

## Add a builtin widget

1. React component in `src/widgets/`
2. Register in `src/widgets/registry.tsx`
3. Add definition in `electron/widgets/registry.ts`
4. New IPC → `main.ts` + `preload.ts` + `src/vite-env.d.ts`

## Scripts

| Script | Role |
| --- | --- |
| `dev` | Dev mode |
| `build` | Production build (+ cpu-temp) |
| `app` | Run last build |
| `dist` | Package installer |
| `shortcuts` | Recreate Desktop / Start Menu shortcuts |

End-user path: `Preparer-lancement.bat` then the **Lattice** shortcut.

# Lattice — notes agent

Instructions projet partagées (versionnées). Préférences personnelles : `CLAUDE.local.md` (gitignored).
Règles path-scopées : `.claude/rules/`. Mémoire projet : `.claude/memory/`.
Décisions : `@docs/en/decisions.md`.

## Verify after changes

```bash
npm test                          # Vitest — must stay green
npx tsc -p tsconfig.json --noEmit # shared + src types
npm run build                     # full gate before shipping (helpers + tsc + vite)
```

Prefer `npm test` for focused loops. No ESLint/Prettier — TypeScript `strict` is the gate.

## Architecture (do not regress)

- Prefer **domain folders** (`electron/activity/`, `electron/focus/`, `electron/notion/`, …) over growing root god files.
- Do **not** dump new shared contracts into a single mega-`types` file; add/keep domain modules under `shared/types/` and re-export from barrels.
- Business logic must not depend on UI. Notion helpers must not import app config persistence — use `shared/notionIds.ts`.
- Keep `electron/main.ts` as composition/bootstrap only; extract feature wiring into modules (`bootstrap/`, `ipc/`, domains).
- Renderer talks to main only via `window.lattice` (preload), never by importing `electron/`.
- New IPC: `electron/ipc/<domain>Ipc.ts` + `electron/preload/<domain>Api.ts` + `src/vite-env.d.ts` — not inline in `main.ts`.
- Root files marked `@deprecated` are thin re-exports during migration; import from the domain module, do not grow the deprecated file.

## Layout

- `electron/` — main process (`activity/`, `focus/`, `notion/`, `bootstrap/`, `ipc/`, `preload/`, `widgets/`, `windows/`)
- `src/` — React widgets (`widgets/<feature>/`)
- `shared/` — types (`shared/types/`) and pure helpers shared by both processes
- `extensions/` — browser extension (media bridge)
- `docs/` — product + contributor guides (EN/FR) + decisions log

## Product invariants

- Fresh install is an empty **shell**; widgets are enabled from the Catalog (enabled ≠ tray visible).
- Activity is **foreground-only**, local under `%APPDATA%\lattice-desk\activity\`.
- Focus session time is attributed **locally** (Notion page id on segments) — no write-back of “time spent” to Notion in V1.
- Builtin widgets today: `calendar`, `tasks`, `activity` (+ internal `catalog`, `focus-interrupt`). The old `monitor` widget is gone; `system-stats` / `temp-daemon` remain as service ids for external widgets / tray stats only.

## Docs map

| Topic | EN | FR |
| --- | --- | --- |
| Decisions | `docs/en/decisions.md` | `docs/fr/decisions.md` |
| Development | `docs/en/development.md` | `docs/fr/development.md` |
| Activity | `docs/en/activity.md` | `docs/fr/activity.md` |
| Notion | `docs/en/notion.md` | `docs/fr/notion.md` |

When you correct a recurring mistake or discover a durable insight, append a dated note to `.claude/memory/LEARNINGS.md`. Active blockers → `.claude/memory/BLOCKERS.md`.

# Architectural decisions

[English](decisions.md) · [Français](../fr/decisions.md)

Short log of lasting choices. Add a row when you change an invariant; do not rewrite history — supersede with a new entry.

| ID | Date | Decision | Why | Status |
| --- | --- | --- | --- | --- |
| D01 | 2025 | **Catalog shell** — fresh install opens no desktop widgets; enable/disable from Catalog. `enabled` ≠ tray show/hide (`visible`). | Composable product; empty default reduces surprise and resource use. | Active |
| D02 | 2025 | **Domain folders** under `electron/` (`activity/`, `focus/`, `notion/`, `bootstrap/`, …) instead of growing root god files. `main.ts` = composition only. | Keeps features navigable as the app grows. | Active |
| D03 | 2025–2026 | **Shared types by domain** (`shared/types/*.ts` + barrel). No mega-`shared/types.ts`. | Avoids merge conflicts and unclear ownership of contracts. | Active |
| D04 | 2025 | **Renderer ↔ main only via `window.lattice`** (preload `contextBridge`). Renderer never imports `electron/`. | Security boundary + clear API surface. | Active |
| D05 | 2025–2026 | **IPC modular** — register in `electron/ipc/<domain>Ipc.ts`, expose in `electron/preload/<domain>Api.ts`, types in `src/vite-env.d.ts`. | `main.ts` / root `preload.ts` stay thin. | Active |
| D06 | 2025 | **Widget `services`** declare runtime deps (`notion`, `activity-tracker`, `system-stats`, `temp-daemon`). Services start only while an enabled widget needs them. | Avoids always-on Notion/stats work. | Active |
| D07 | 2026 | **Remove builtin Monitor widget**. Keep `system-stats` / `temp-daemon` service ids for external widgets and tray helpers. | Product focus on Notion + Activity; monitor was low value vs cost. | Active |
| D08 | 2026 | **Activity = foreground-only** poll (~2 s), 3 s focus dwell, local JSONL under userData. No cloud sync / keylogging / screenshots. | Privacy + honest “what I looked at” metrics. | Active — details in `activity.md` |
| D09 | 2026 | **Focus sessions** attribute time locally to a Notion task id; off-allowlist → interrupt window. **No** Notion “time spent” property write-back in V1. | Useful without schema coupling; write-back deferred. | Active |
| D10 | 2026 | **Media bridge** on localhost + optional browser extension for playback/AFK/watch time. | OS focus alone cannot see in-tab media state. | Active |
| D11 | 2025 | **External widgets** = zip + `manifest.json`, discovered under userData; remote catalog `widgets-catalog.json`. | Ship features without app release when possible. | Active |
| D12 | 2025 | **Config resolution**: cwd `config.json` → next to app → `%APPDATA%\lattice-desk\config.json`. Valid Notion creds persist to userData. | Dev-friendly override without breaking installed app. | Active |
| D13 | 2025 | **Demo mode** when Notion token missing/placeholder. | App usable without credentials. | Active |
| D14 | 2026 | **Notion ID parsing** in `shared/notionIds.ts`; Notion domain must not import config persistence. | Testable pure helpers; no UI/config coupling. | Active |
| D15 | 2026 | **Path confinement** for activity/focus files via `resolveWithin` / `assertWithin`. | Mitigate path traversal on user-controlled segments. | Active |
| D16 | 2026 | **No ESLint/Prettier** in-repo; gate = `tsc --strict` + Vitest via `npm run verify` (+ CI on PR/release). | Keep tooling light on a solo/small project; still block regressions in CI. | Active |
| D17 | 2025 | **Docs slim-down** — drop long architecture/brand/configuration pages; keep README + Notion/Activity/Development. Decision log restored here (2026). | Long docs drifted; short guides + this log preferred. | Active |
| D18 | 2026 | **Deprecated root re-exports** during domain extraction. | Safe migration mid-refactor. | **Superseded by D21** — shims deleted 2026-08-04 |
| D19 | 2025 | **Bilingual docs** EN + FR for product/contributor guides. | Author + French users; keep both in sync when editing. | Active |
| D20 | 2025 | **`app.disableHardwareAcceleration()`** + power-mode aware refresh intervals. | Mostly-static desktop widgets; reduce Chromium cost on Windows. | Active |
| D21 | 2026-08-04 | **Remove unused `@deprecated` electron root shims**; import domains directly. | Shims had zero remaining imports. | Active |
| D22 | 2026-08-04 | **Shared pure helpers** `shared/dates.ts` + `shared/errors.ts`; UI focus start via `startFocusForTask`. | Kill date/error/start-focus duplication. | Active |
| D23 | 2026-08-04 | **Design tokens** renamed `--monitor-*` → `--surface` / `--glow-*` / `soft-pulse` (Monitor widget gone). | Naming matched a deleted feature. | Active |
| D25 | 2026-08-04 | **Single agent constitution** — `.cursor/rules/CURSOR.mdc` only; delete root `CLAUDE.md`. | End dual source of truth after Cursor migration. | Active |

## How to add an entry

1. Next free `Dxx` id, today’s date, one-line decision, one-line why, `Active` / `Superseded by Dyy` / `Temporary`.
2. If a rule becomes day-to-day guidance for agents, mirror it in `.cursor/rules/` (especially `CURSOR.mdc` for always-on invariants).

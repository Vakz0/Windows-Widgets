# Blockers

Open items that block correct work or docs/code sync. Remove or mark resolved with a date when done.

## Open

- **Migration shims** — several `@deprecated` root re-exports under `electron/` still exist (`focusSession.ts`, `focusInterruptWindow.ts`, `activityContext.ts`, `activityMediaBridge.ts`, …). Call sites should move to domain imports; delete shims when unused.
- **Orphan services UX** — `system-stats` / `temp-daemon` have no builtin widget after Monitor removal; tray/stats paths still reference them. Confirm intended behavior for installs with no external monitor widget.
- **Authenticode** — release builds unsigned; SmartScreen may warn (known, see development docs).

## Resolved

_(none yet)_

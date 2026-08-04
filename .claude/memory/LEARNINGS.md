# Learnings

Append dated notes. Promote durable rules to `CLAUDE.md` / `.claude/rules/` / `docs/*/decisions.md`.

## 2026-08-04

- Documentation debt audit: architecture pages were deleted in `76e0317` (“slim down docs”); restored as a short decisions log + agent constitution instead of a long architecture doc.
- `CLAUDE.md` must stay **tracked in git** — an untracked constitution does not exist for clones or other machines.
- Mid-refactor: prefer importing `electron/focus`, `electron/activity/context`, `electron/activity/mediaBridge` over deprecated root re-exports.
- Builtin Monitor widget is gone; do not reintroduce it without a new decision entry. `system-stats` / `temp-daemon` remain valid **service ids** for external widgets.

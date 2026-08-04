---
paths:
  - "shared/**/*.ts"
---

# Shared contracts

- New types go in a domain module under `shared/types/` (e.g. `activity.ts`, `focus.ts`) and are re-exported from `shared/types/index.ts`.
- Do **not** recreate a mega `shared/types.ts`.
- Keep helpers pure (no Electron, no React, no reading `config.json`). Notion IDs → `shared/notionIds.ts`.
- Widget contract (`WidgetDefinition`, services) lives in `shared/widget.ts`.
- Service ids in use: `notion`, `activity-tracker`, `system-stats`, `temp-daemon`. Builtins currently declare `notion` and/or `activity-tracker` only.

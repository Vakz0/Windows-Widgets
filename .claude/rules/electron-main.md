---
paths:
  - "electron/**/*.{ts,tsx}"
---

# Electron main process

- Put feature logic in domain folders (`activity/`, `focus/`, `notion/`, `bootstrap/`, …), not in `main.ts`.
- Register IPC in `electron/ipc/<domain>Ipc.ts` and wire via `registerAllIpc` — do not add `ipcMain.handle` in `main.ts`.
- Expose renderer APIs in `electron/preload/<domain>Api.ts`; root `preload.ts` only assembles the bridge.
- Prefer domain imports over `@deprecated` root re-exports (`focusSession.ts`, `activityContext.ts`, …). Do not add logic to deprecated shims.
- Notion code must use `shared/notionIds.ts` for ID/URL parsing; do not pull config persistence into `electron/notion/`.
- Activity/focus file I/O must stay inside userData via `resolveWithin` / `assertWithin`.
- Keep business logic free of React/UI imports.

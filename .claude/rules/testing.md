---
paths:
  - "**/*.{test,spec}.{ts,tsx}"
  - "vitest.config.ts"
  - "electron/**/test/**"
---

# Testing

- Runner: Vitest (`npm test` / `npm run test:watch`).
- Prefer unit tests next to pure logic (`electron/activity/*.test.ts`, `electron/focus/*.test.ts`, `electron/notion/*.test.ts`).
- Do not add exploit payloads or attack scripts; defensive tests only.
- Electron is mocked where needed (`electron/activity/test/setup.ts` / vitest aliases) — follow existing patterns.
- Keep `npm test` green before finishing a change; use `npx tsc -p tsconfig.json --noEmit` for shared + src types.

---
paths:
  - "src/**/*.{ts,tsx,css}"
---

# Renderer (React widgets)

- Talk to the main process only through `window.lattice` (see `src/vite-env.d.ts`). Never import from `electron/`.
- Builtin widgets: register in `src/widgets/registry.tsx` **and** `electron/widgets/registry.ts`. Internal windows (`catalog`, `focus-interrupt`) may stay out of the user catalog.
- Prefer feature folders under `src/widgets/<feature>/` for hooks and subviews.
- Match existing widget CSS patterns under `src/styles/`; do not invent a parallel design system.
- After adding IPC methods, update `src/vite-env.d.ts` in the same change.

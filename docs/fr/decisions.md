# Décisions architecturales

[English](../en/decisions.md) · [Français](decisions.md)

Journal court des choix durables. Ajouter une ligne quand un invariant change ; ne pas réécrire l’historique — remplacer par une nouvelle entrée.

| ID | Date | Décision | Pourquoi | Statut |
| --- | --- | --- | --- | --- |
| D01 | 2025 | **Shell catalogue** — install fraîche sans widgets bureau ; activation via Catalogue. `enabled` ≠ affichage systray (`visible`). | Produit composable ; défaut vide = moins de surprise et de charge. | Actif |
| D02 | 2025 | **Dossiers domaine** sous `electron/` (`activity/`, `focus/`, `notion/`, `bootstrap/`, …) plutôt que des fichiers racine monstrueux. `main.ts` = composition seule. | Navigation viable quand l’app grossit. | Actif |
| D03 | 2025–2026 | **Types partagés par domaine** (`shared/types/*.ts` + barrel). Pas de mega-`shared/types.ts`. | Moins de conflits ; propriété claire des contrats. | Actif |
| D04 | 2025 | **Renderer ↔ main uniquement via `window.lattice`** (preload `contextBridge`). Le renderer n’importe jamais `electron/`. | Frontière de sécurité + surface d’API claire. | Actif |
| D05 | 2025–2026 | **IPC modulaire** — `electron/ipc/<domaine>Ipc.ts`, `electron/preload/<domaine>Api.ts`, types dans `src/vite-env.d.ts`. | `main.ts` / `preload.ts` restent fins. | Actif |
| D06 | 2025 | **`services` des widgets** déclarent les deps runtime (`notion`, `activity-tracker`, `system-stats`, `temp-daemon`). Un service ne tourne que si un widget activé en a besoin. | Évite Notion/stats toujours allumés. | Actif |
| D07 | 2026 | **Retrait du widget Monitor builtin**. Garder les ids de service `system-stats` / `temp-daemon` pour widgets externes / aides systray. | Focus produit Notion + Activité ; monitor peu rentable. | Actif |
| D08 | 2026 | **Activité = premier plan seul** (~2 s), dwell focus 3 s, JSONL local sous userData. Pas de sync cloud / keylogging / captures. | Vie privée + métriques honnêtes. | Actif — détails dans `activity.md` |
| D09 | 2026 | **Sessions focus** : attribution locale à un id de tâche Notion ; hors allowlist → fenêtre d’interruption. **Pas** d’écriture d’une propriété « temps passé » dans Notion en V1. | Utile sans couplage de schéma ; write-back reporté. | Actif |
| D10 | 2026 | **Media bridge** localhost + extension navigateur optionnelle (lecture / AFK / visionnage). | Le focus OS ne voit pas l’état média dans l’onglet. | Actif |
| D11 | 2025 | **Widgets externes** = zip + `manifest.json` sous userData ; catalogue distant `widgets-catalog.json`. | Livrer des features sans release app si possible. | Actif |
| D12 | 2025 | **Résolution config** : cwd `config.json` → à côté de l’app → `%APPDATA%\lattice-desk\config.json`. Creds Notion valides → persistance userData. | Override dev sans casser l’install. | Actif |
| D13 | 2025 | **Mode démo** si token Notion absent / placeholder. | App utilisable sans credentials. | Actif |
| D14 | 2026 | **Parsing des IDs Notion** dans `shared/notionIds.ts` ; le domaine Notion n’importe pas la persistence config. | Helpers purs testables ; pas de couplage UI/config. | Actif |
| D15 | 2026 | **Confinement des chemins** activity/focus via `resolveWithin` / `assertWithin`. | Limite le path traversal sur segments contrôlés. | Actif |
| D16 | 2026 | **Pas d’ESLint/Prettier** dans le repo ; gate = `tsc --strict` + Vitest via `npm run verify` (+ CI PR/release). | Outillage léger ; les régressions sont quand même bloquées en CI. | Actif |
| D17 | 2025 | **Docs allégées** — suppression des longues pages architecture/marque/config ; README + Notion/Activité/Développement. Journal de décisions rétabli ici (2026). | Les longues docs dérivaient ; guides courts + ce journal. | Actif |
| D18 | 2026 | **Re-exports dépréciés** à la racine `electron/` pendant l’extraction de domaines. | Migration sans casser les imports. | **Remplacé par D21** — shims supprimés 2026-08-04 |
| D19 | 2025 | **Docs bilingues** EN + FR pour guides produit / contributeur. | Auteur + utilisateurs FR ; synchroniser les deux. | Actif |
| D20 | 2025 | **`app.disableHardwareAcceleration()`** + intervalles de refresh selon power mode. | Widgets surtout statiques ; coût Chromium réduit sous Windows. | Actif |
| D21 | 2026-08-04 | **Suppression des shims `@deprecated` racine electron** inutilisés ; imports domaine directs. | Plus aucun import restant. | Actif |
| D22 | 2026-08-04 | **Helpers purs partagés** `shared/dates.ts` + `shared/errors.ts` ; start focus UI via `startFocusForTask`. | Fin de la duplication dates/erreurs/start-focus. | Actif |
| D23 | 2026-08-04 | **Tokens design** `--monitor-*` → `--surface` / `--glow-*` / `soft-pulse` (widget Monitor retiré). | Naming lié à une feature morte. | Actif |
| D25 | 2026-08-04 | **Constitution agent unique** — `.cursor/rules/CURSOR.mdc` seul ; suppression de `CLAUDE.md` racine. | Fin du double source of truth après migration Cursor. | Actif |

## Ajouter une entrée

1. Prochain id `Dxx`, date du jour, décision en une ligne, pourquoi en une ligne, `Actif` / `Remplacé par Dyy` / `Temporaire`.
2. Si la règle devient un guide quotidien pour les agents, la refléter dans `.cursor/rules/` (surtout `CURSOR.mdc` pour les invariants always-on).

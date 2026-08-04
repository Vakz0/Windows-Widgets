# Développement

[English](../en/development.md) · [Français](development.md)

## Setup

Windows 10/11, Node.js 20+, .NET SDK (pour `tools/cpu-temp` et `tools/active-url`).

```bash
npm install
npm run dev      # Vite + Electron hot reload
npm run build && npm run app
npm run dist     # Installateur NSIS → release/
```

Config dev : copier `config.example.json` → `config.json` à la racine.

Invariants agent / contributeur : [`.cursor/rules/CURSOR.mdc`](../../.cursor/rules/CURSOR.mdc) · décisions : [`docs/fr/decisions.md`](decisions.md).

### Gates qualité

```bash
npm run verify   # vitest + tsc (aussi en CI sur PR/push et avant release)
npm run build    # helpers + tsc + vite
```

Pre-commit local optionnel : `git config core.hooksPath .githooks` (lance `npm run verify`).

## Arborescence

```
electron/           # Process principal
  activity/         # Domaine suivi d’activité
  focus/            # Sessions focus + fenêtre d’interruption
  notion/           # Domaine API Notion
  bootstrap/        # Câblage app (tray, refresh, config publique)
  ipc/              # Handlers IPC par domaine (*Ipc.ts)
  preload/          # Tranches contextBridge (*Api.ts)
  windows/ widgets/
src/                # Widgets React (par feature sous widgets/)
shared/             # Types partagés (types/) + helpers purs
extensions/         # Extension navigateur (media bridge)
tools/cpu-temp/ tools/active-url/
docs/               # Guides (EN/FR) + journal de décisions
.cursor/            # Règles Cursor + mémoire projet versionnée
.githooks/          # Pre-commit optionnel (verify)
```

Préférer les dossiers métier aux fichiers racine trop gros. Les façades racine minces (`electron/activity.ts`, `electron/notion.ts`, `electron/preload.ts`) ne font que réexporter les domaines — **ne pas** recréer les shims `@deprecated` supprimés (D21).

## Glossaire

| Terme | Sens |
| --- | --- |
| **Catalog shell** | Install fraîche sans widgets desktop ; on les active depuis le Catalogue (D01). |
| **enabled** | Widget activé en config / peut démarrer ses services. ≠ fenêtre visible. |
| **Show/hide tray** | Cache ou montre une fenêtre desktop déjà enabled ; ne bascule pas `enabled`. |
| **Widget builtin** | Livré dans l’app : `calendar`, `tasks`, `activity`. |
| **Fenêtre interne** | Hors catalogue utilisateur : `catalog` (shell UI), `focus-interrupt` (modale garde). |
| **Dual registry** | Map React `src/widgets/registry.tsx` + defs main `electron/widgets/registry.ts`. Les internes ne sont pas forcément dans les deux. |
| **Service** | Dépendance runtime déclarée (`notion`, `activity-tracker`, `system-stats`, `temp-daemon`). Démarrée seulement si un widget **enabled** en a besoin (D06). |
| **`system-stats` / `temp-daemon`** | Plus de builtin après retrait Monitor (D07). Conservés pour widgets **externes** et aides systray ; sans consommateur, l’élévation temp reste gated. |
| **`window.lattice`** | Seul pont renderer↔main (preload). Le renderer n’importe jamais `electron/`. |
| **Poll activité** | Boucle ~2 s foreground-only dans `electron/activity/poll.ts` (D08). |
| **Dwell segment** | `FOCUS_DWELL_MS` (3 s) : focus stable avant de committer un changement d’app. |
| **Dwell hors-projet** | `focusOffProjectDwellSec` (défaut 8 s) : hors allowlist avant la fenêtre d’interruption. Horloge distincte du dwell segment. |
| **Media bridge** | HTTP localhost + extension navigateur optionnelle (playback / AFK / visionnage) (D10). |
| **Demo mode** | Token Notion absent/placeholder → store démo local (D13). |
| **Power mode** | active / idle / sleep → intervalles refresh Notion & stats (D20). |
| **Widget externe** | Zip + `manifest.json` sous userData ; catalogue distant optionnel (D11). |
| **PublicConfig** | Config envoyée au renderer sans secrets (`bootstrap/publicConfig.ts`). |
| **Confinement chemins** | Fichiers activity/focus via `resolveWithin` / `assertWithin` (D15). |
| **`startFocusForTask`** | Entrée UI unique pour démarrer une session focus Notion — ne pas dupliquer le payload IPC (D22). |

## Publier une release

1. Bumper `version` dans `package.json`
2. Commit + tag annoté : `git tag v1.2.0 && git push origin v1.2.0`
3. Le workflow [`.github/workflows/release.yml`](../../.github/workflows/release.yml) :
   - build les helpers .NET + l’installateur NSIS
   - publie sur GitHub Releases (`latest.yml` pour `electron-updater`)
   - uploade `widgets-catalog.json`

Les utilisateurs finaux téléchargent depuis [Releases](https://github.com/Vakz0/Lattice/releases/latest). La signature Authenticode n’est pas encore en place (SmartScreen peut avertir).

## Widgets externes

Emplacement runtime : `%APPDATA%/lattice-desk/widgets/<id>/`.

### `manifest.json`

```json
{
  "id": "example",
  "version": "1.0.0",
  "label": "Exemple",
  "description": "Widget distant",
  "placement": "desktop",
  "services": [],
  "entry": "index.html",
  "defaultBounds": { "width": 360, "height": 480 }
}
```

Package = zip contenant `manifest.json` + `index.html` (et assets). Le dossier racine du zip peut être plat ou un seul sous-dossier.

### Catalogue distant

Fichier [`widgets-catalog.json`](../../widgets-catalog.json) :

```json
{
  "widgets": [
    {
      "id": "example",
      "label": "Exemple",
      "version": "1.0.0",
      "downloadUrl": "https://github.com/Vakz0/Lattice/releases/download/v1.2.0/widget-example-1.0.0.zip",
      "sha256": "…",
      "minAppVersion": "1.2.0"
    }
  ]
}
```

URLs consultées par l’app (dans l’ordre) :

1. `https://github.com/Vakz0/Lattice/releases/latest/download/widgets-catalog.json`
2. `https://raw.githubusercontent.com/Vakz0/Lattice/main/widgets-catalog.json`

## Ajouter un widget builtin

1. Composant React dans `src/widgets/` (sous-dossier feature optionnel)
2. Enregistrer dans `src/widgets/registry.tsx`
3. Définition dans `electron/widgets/registry.ts`
4. Nouvel IPC → `electron/ipc/<domaine>Ipc.ts` + `electron/preload/<domaine>Api.ts` + `src/vite-env.d.ts` (câbler via `electron/ipc/index.ts` et `electron/preload.ts`)

### Services

| Id de service | Utilisé par les builtins | Notes |
| --- | --- | --- |
| `notion` | `calendar`, `tasks` | Fetch / édition Notion |
| `activity-tracker` | `activity` | Activité locale + sessions focus |
| `system-stats` | — (aucun builtin) | Widgets externes + refresh CPU/RAM systray si déclaré |
| `temp-daemon` | — (aucun builtin) | Widgets externes ; élévation temp systray seulement si un widget enabled le déclare |

L’ancien builtin `monitor` a été retiré (D07). Garder ces ids de service est **volontaire** — pas un retrait à moitié.

Helpers natifs : `npm run build:helpers` (cpu-temp + active-url).

## Scripts

| Script | Rôle |
| --- | --- |
| `dev` | Mode développement |
| `build` | Build production (+ helpers) |
| `test` | Vitest |
| `app` | Lancer le dernier build |
| `dist` | Packager l’installateur |
| `shortcuts` | Recréer les raccourcis Bureau / menu Démarrer |

Parcours contributeur : `Preparer-lancement.bat` puis le raccourci **Lattice**. Parcours utilisateur : installateur NSIS.

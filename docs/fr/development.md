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

Invariants agent / contributeur : [`CLAUDE.md`](../../CLAUDE.md) · décisions : [`docs/fr/decisions.md`](decisions.md).

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

Préférer les dossiers métier aux fichiers racine trop gros. Les `electron/*.ts` racine marqués `@deprecated` sont des shims de migration — importer depuis le module domaine.

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
| `system-stats` | — (aucun builtin) | Réservé widgets externes / conso systray |
| `temp-daemon` | — (aucun builtin) | Réservé conso helper température |

L’ancien builtin `monitor` a été retiré ; ne pas supposer qu’un widget monitoring existe.

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

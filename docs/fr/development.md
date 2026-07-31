# Développement

[English](../en/development.md) · [Français](development.md)

## Setup

Windows 10/11, Node.js 20+, .NET SDK (pour `tools/cpu-temp`).

```bash
npm install
npm run dev      # Vite + Electron hot reload
npm run build && npm run app
npm run dist     # Installateur NSIS → release/
```

Config dev : copier `config.example.json` → `config.json` à la racine.

## Arborescence

```
electron/     # Process principal (Notion, tray, config, registre widgets, updates)
src/          # Widgets React
shared/       # Types partagés
tools/cpu-temp/
assets/
widgets-catalog.json   # Catalogue distant des widgets externes
.github/workflows/     # Release CI
```

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

1. Composant React dans `src/widgets/`
2. Enregistrer dans `src/widgets/registry.tsx`
3. Définition dans `electron/widgets/registry.ts`
4. Nouvel IPC → `main.ts` + `preload.ts` + `src/vite-env.d.ts`

Services existants : `notion`, `system-stats`, `temp-daemon`, `activity-tracker` (voir `docs/fr/activity.md`).

Helpers natifs : `npm run build:helpers` (cpu-temp + active-url).

## Scripts

| Script | Rôle |
| --- | --- |
| `dev` | Mode développement |
| `build` | Build production (+ cpu-temp) |
| `app` | Lancer le dernier build |
| `dist` | Packager l’installateur |
| `shortcuts` | Recréer les raccourcis Bureau / menu Démarrer |

Parcours contributeur : `Preparer-lancement.bat` puis le raccourci **Lattice**. Parcours utilisateur : installateur NSIS.

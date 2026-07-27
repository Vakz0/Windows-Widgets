# Développement

[English](../en/development.md) · [Français](../fr/development.md)

> Préparer un environnement local, lancer Lattice en dev ou en production, et packager un installateur.

## Prérequis

| Outil | Version / notes |
| --- | --- |
| Windows | 10 ou 11 |
| [Node.js](https://nodejs.org/) | 20+ recommandé |
| npm | Fourni avec Node |
| [.NET SDK](https://dotnet.microsoft.com/download) | Requis pour compiler `tools/cpu-temp` (`npm run build:temp`) |

## Installation et lancement

```bash
npm install
npm run dev
```

`npm run dev` compile le helper température, puis démarre Vite avec le plugin Electron (hot reload renderer et main).

**Config en dev :** copier `config.example.json` vers `config.json` à la racine (gitignoré). Ce fichier est lu en priorité ; inclure `projectSources` pour tester les sources Notion secondaires. Voir [configuration.md](configuration.md).

Pour un lancement type production :

```bash
npm run build
npm run app
```

Ou le parcours utilisateur : double-cliquer `Preparer-lancement.bat`, puis le raccourci Bureau **Lattice** (exécute [`scripts/lancer.ps1`](../../scripts/lancer.ps1) via [`Lancer-Lattice.vbs`](../../Lancer-Lattice.vbs), avec rebuild auto si les sources sont plus récentes que `dist-electron`).

## Scripts npm

| Script | Rôle |
| --- | --- |
| `build:temp` | `dotnet publish` → `tools/cpu-temp/publish` |
| `dev` | `build:temp` + Vite + Electron |
| `build` | `build:temp` + `tsc --noEmit` + build Vite production |
| `app` | `electron .` (attend un `build` préalable) |
| `start` | `build` puis `electron .` |
| `shortcuts` | Recréer les raccourcis Bureau / menu Démarrer |
| `pack` | Sortie electron-builder en dossier |
| `dist` | Installateur NSIS sous `release/` |

Régénérer les PNG / ICO de marque depuis les SVG : `node scripts/export-brand-assets.mjs` (nécessite `sharp` et `to-ico` en local — voir [identité visuelle](brand.md)).

## Arborescence

```
windows-widgets/          # racine du dépôt (nom npm : lattice-desk)
├── electron/             # Process principal, preload, Notion, system, tray, config
│   └── widgets/          # Registre builtin + stub plugins externes
├── src/                  # Renderer React
│   └── widgets/          # Catalogue, Calendar, Tasks, Monitor, registry, TaskDetailPanel
├── shared/               # Types partagés + contrat widget (widget.ts)
├── tools/cpu-temp/       # Helper température C#
├── scripts/              # lancer.ps1, creer-raccourcis.ps1, export-brand-assets.mjs
├── assets/               # icon.png, icon.ico, icônes tray
│   └── brand/            # logo SVG, banner.png, social.png
├── docs/                 # Cette documentation (dont brand.md)
├── Preparer-lancement.bat
├── Lancer-Lattice.vbs
├── config.example.json
└── package.json
```

<details>
<summary>Sorties de build (ignorées par git)</summary>

| Chemin | Contenu |
| --- | --- |
| `dist/` | Renderer (Vite) |
| `dist-electron/` | Main + preload JS |
| `tools/cpu-temp/publish/` | `cpu-temp.exe` |
| `release/` | Artifacts electron-builder |

</details>

## Ajouter un widget builtin

1. Créer le composant React sous `src/widgets/MonWidget.tsx`.
2. L’enregistrer dans [`src/widgets/registry.tsx`](../../src/widgets/registry.tsx) (`widgetComponents`).
3. Ajouter une `WidgetDefinition` dans [`electron/widgets/registry.ts`](../../electron/widgets/registry.ts) (id, label, description, placement, services, defaultBounds).
4. Si le widget a besoin de nouvelles API IPC, les exposer dans `electron/main.ts` + `electron/preload.ts` + `src/vite-env.d.ts`.
5. Documenter dans les README et [architecture.md](architecture.md) (FR + EN).

Les plugins externes (`%APPDATA%/lattice-desk/widgets/`) sont prévus via [`discoverExternal.ts`](../../electron/widgets/discoverExternal.ts) mais ne sont pas chargés dans cette version.

## Packaging

```bash
npm run dist
```

Utilise electron-builder (`appId` : `com.vakz.lattice-desk`, nom produit **Lattice**). Les ressources extra incluent `assets/` et le binaire `cpu-temp` publié. Sortie : `release/` (NSIS sous Windows).

## Scripts Windows

| Fichier | Rôle |
| --- | --- |
| `Preparer-lancement.bat` | Une fois : `npm run build` + création des raccourcis |
| `scripts/creer-raccourcis.ps1` | `.lnk` Bureau + menu Démarrer → `Lancer-Lattice.vbs` |
| `Lancer-Lattice.vbs` | Wrapper de lancement silencieux |
| `scripts/lancer.ps1` | Rebuild si besoin, puis démarrage d’Electron |

## Suite

- Brancher Notion : [notion.md](notion.md)
- Comprendre la config : [configuration.md](configuration.md)
- Vue d’ensemble architecture : [architecture.md](architecture.md)

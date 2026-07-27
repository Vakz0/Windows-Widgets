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

## Arborescence

```
windows-widgets/          # racine du dépôt (nom npm : lattice-desk)
├── electron/             # Process principal, preload, Notion, system, tray, config
├── src/                  # Renderer React
│   └── widgets/          # Calendar, Tasks, Monitor, TaskDetailPanel
├── shared/               # Types partagés main / renderer
├── tools/cpu-temp/       # Helper température C#
├── scripts/              # lancer.ps1, creer-raccourcis.ps1
├── assets/               # icon.png, icônes tray
├── docs/                 # Cette documentation
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

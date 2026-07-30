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
electron/     # Process principal (Notion, tray, config, registre widgets)
src/          # Widgets React
shared/       # Types partagés
tools/cpu-temp/
assets/
```

## Ajouter un widget builtin

1. Composant React dans `src/widgets/`
2. Enregistrer dans `src/widgets/registry.tsx`
3. Définition dans `electron/widgets/registry.ts`
4. Nouvel IPC → `main.ts` + `preload.ts` + `src/vite-env.d.ts`

## Scripts

| Script | Rôle |
| --- | --- |
| `dev` | Mode développement |
| `build` | Build production (+ cpu-temp) |
| `app` | Lancer le dernier build |
| `dist` | Packager l’installateur |
| `shortcuts` | Recréer les raccourcis Bureau / menu Démarrer |

Parcours utilisateur : `Preparer-lancement.bat` puis le raccourci **Lattice**.

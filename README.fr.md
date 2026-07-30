[English](README.md) · [Français](README.fr.md)

# Lattice

<p align="center">
  <img src="assets/brand/banner.png" alt="Lattice — Widgets bureau composables pour Windows" width="800" />
</p>

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=typescript,react,electron" alt="TypeScript, React, Electron" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Notion_API-000000?style=flat-square&logo=notion&logoColor=white" alt="Notion API" />
  <img src="https://img.shields.io/badge/Windows_11-0078D4?style=flat-square&logo=windows11&logoColor=white" alt="Windows 11" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License MIT" />
</p>

> Widgets bureau composables pour Windows — activez uniquement ce dont vous avez besoin (calendrier & tâches Notion, monitoring, …).

## Fonctionnalités

- **Catalogue** — shell vide au premier lancement ; activez Calendrier, Tâches, Monitoring depuis le systray
- **Notion** — calendrier semaine + tâches ouvertes sur le bureau (mode démo sans token)
- **Monitoring** — CPU, RAM, température optionnelle depuis le tray

## Démarrage rapide

**Prérequis :** Windows 10/11, [Node.js 20+](https://nodejs.org/), et (pour la température) un [.NET SDK](https://dotnet.microsoft.com/download) une fois au build.

1. Double-cliquer `Preparer-lancement.bat` (une fois, ou après une mise à jour)
2. Lancer le raccourci **Lattice**
3. Systray → **Catalogue des widgets…** → activer les widgets
4. Systray → **Paramètres…** → brancher Notion — [guide](docs/fr/notion.md)
5. Optionnel : **Lancer au démarrage**

Config : `%APPDATA%\lattice-desk\config.json` (ou `config.json` à la racine en dev). Voir `config.example.json`.

## Développement

```bash
npm install
npm run dev      # Vite + Electron
npm run build    # Build production
npm run app      # Lance le dernier build
npm run dist     # Installateur NSIS → release/
```

Plus de détail : [docs/fr/development.md](docs/fr/development.md).

## Docs

| | English | Français |
| --- | --- | --- |
| Notion | [notion.md](docs/en/notion.md) | [notion.md](docs/fr/notion.md) |
| Développement | [development.md](docs/en/development.md) | [development.md](docs/fr/development.md) |

## Auteur

**[Vakz](https://github.com/vakz0)** — étudiant ingénieur (France).

## Licence

[MIT](LICENSE) — composants tiers : [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

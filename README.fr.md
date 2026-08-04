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

> Widgets bureau composables pour Windows — activez uniquement ce dont vous avez besoin (calendrier & tâches Notion, suivi d’activité, …).

## Fonctionnalités

- **Catalogue** — shell vide au premier lancement ; activez Calendrier, Tâches, Activité depuis le systray
- **Notion** — calendrier semaine + tâches ouvertes sur le bureau (mode démo sans token)
- **Activité** — temps focus local par app/catégorie (travail, divertissement…) avec export CSV/JSON ; [extension média](extensions/lattice-media/README.md) optionnelle pour éviter l’AFK pendant une vidéo — [guide](docs/fr/activity.md)
- **Mises à jour** — installateur NSIS via GitHub Releases ; vérification au démarrage + boutons dans Paramètres (app et widgets externes)

## Démarrage rapide

1. Télécharger l’installateur depuis [Releases](https://github.com/Vakz0/Lattice/releases/latest) (`Lattice Setup x.y.z.exe`)
2. Installer puis lancer **Lattice**
3. Systray → **Catalogue des widgets…** → activer les widgets
4. Systray → **Paramètres…** → brancher Notion — [guide](docs/fr/notion.md)
5. Optionnel : **Lancer au démarrage**

### Mises à jour

- Au démarrage, Lattice vérifie silencieusement les mises à jour (app + widgets externes).
- Systray → **Paramètres…** → section **Mises à jour** :
  - **Vérifier la mise à jour de l’app** / **Installer et redémarrer**
  - **Vérifier les mises à jour des widgets** / **Mettre à jour les widgets**
  - Option **Téléchargement automatique** : télécharge en arrière-plan et envoie une notification Windows quand c’est prêt (l’installation reste confirmée)

Config : `%APPDATA%\lattice-desk\config.json`. Voir `config.example.json`.

### Depuis les sources (développement)

**Prérequis :** Windows 10/11, [Node.js 20+](https://nodejs.org/), et (pour la température) un [.NET SDK](https://dotnet.microsoft.com/download) une fois au build.

1. Double-cliquer `Preparer-lancement.bat` (une fois, ou après un `git pull`)
2. Lancer le raccourci **Lattice**

Les mises à jour automatiques ne s’appliquent qu’à l’app installée via l’installateur NSIS.

## Développement

```bash
npm install
npm run dev      # Vite + Electron
npm run build    # Build production
npm run app      # Lance le dernier build
npm run dist     # Installateur NSIS → release/
```

Publier une version : tag `vX.Y.Z` → workflow GitHub Actions (voir [docs/fr/development.md](docs/fr/development.md)).

## Docs

| | English | Français |
| --- | --- | --- |
| Notion | [notion.md](docs/en/notion.md) | [notion.md](docs/fr/notion.md) |
| Activité | [activity.md](docs/en/activity.md) | [activity.md](docs/fr/activity.md) |
| Développement | [development.md](docs/en/development.md) | [development.md](docs/fr/development.md) |
| Décisions | [decisions.md](docs/en/decisions.md) | [decisions.md](docs/fr/decisions.md) |

Constitution agent : [`CLAUDE.md`](CLAUDE.md) · règles & mémoire : [`.claude/`](.claude/).

## Auteur

**[Vakz](https://github.com/vakz0)** — étudiant ingénieur (France).

## Licence

[MIT](LICENSE) — composants tiers : [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

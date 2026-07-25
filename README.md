# Windows Widgets

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=typescript,react,electron" alt="TypeScript, React, Electron" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Notion_API-000000?style=flat-square&logo=notion&logoColor=white" alt="Notion API" />
  <img src="https://img.shields.io/badge/Windows_11-0078D4?style=flat-square&logo=windows11&logoColor=white" alt="Windows 11" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License MIT" />
</p>

> Widgets Windows 11 — Tracker Notion (calendrier + tâches) et monitoring système depuis la systray.

## Auteur

**[Vakz](https://github.com/vakz0)** — Étudiant ingénieur (France).  
Projet perso : synchroniser le Tracker Notion sur le bureau et surveiller CPU, RAM et température sans quitter le flux de travail.

## Fonctionnalités

- **Calendrier** — semaine lun. → dim. avec les tâches datées Notion  
- **Tâches** — liste des tâches ouvertes, panneau détail, lien vers Notion  
- **Monitoring** — CPU / RAM / température via l’icône systray

## Démarrage

1. Double-cliquer `Preparer-lancement.bat` (une fois)
2. Lancer le raccourci **Windows Widgets**
3. Brancher Notion → [docs/NOTION.md](docs/NOTION.md)
4. Optionnel : systray → **Lancer au démarrage de Windows**

Le raccourci recompile automatiquement si le code a changé.

## Commandes


| Commande        | Description        |
| --------------- | ------------------ |
| `npm install`   | Dépendances        |
| `npm run build` | Build production   |
| `npm run app`   | Lance l’app        |
| `npm run dev`   | Mode développement |


## Licence

Distribué sous licence [MIT](LICENSE).  
Composants tiers : voir [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) (notamment LibreHardwareMonitorLib, MPL-2.0).
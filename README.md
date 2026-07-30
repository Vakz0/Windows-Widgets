[English](README.md) · [Français](README.fr.md)

# Lattice

<p align="center">
  <img src="assets/brand/banner.png" alt="Lattice — Composable desktop widgets for Windows" width="800" />
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

> Composable desktop widgets for Windows — enable only what you need (Notion calendar & tasks, system monitoring, …).

## Features

- **Catalog** — empty shell on first launch; enable Calendar, Tasks, Monitoring from the systray
- **Notion** — week calendar + open tasks on the desktop (demo mode without a token)
- **Monitoring** — CPU, RAM, optional temperature from the tray

## Quick start

**Requirements:** Windows 10/11, [Node.js 20+](https://nodejs.org/), and (for temperature) a [.NET SDK](https://dotnet.microsoft.com/download) once at build time.

1. Double-click `Preparer-lancement.bat` (once, or after an update)
2. Launch the **Lattice** shortcut
3. Systray → **Catalogue des widgets…** → enable widgets
4. Systray → **Paramètres…** → connect Notion — [setup guide](docs/en/notion.md)
5. Optional: **Lancer au démarrage**

Config: `%APPDATA%\lattice-desk\config.json` (or `config.json` at the repo root in dev). See `config.example.json`.

## Development

```bash
npm install
npm run dev      # Vite + Electron
npm run build    # Production build
npm run app      # Run last build
npm run dist     # NSIS installer → release/
```

More detail: [docs/en/development.md](docs/en/development.md).

## Docs

| | English | Français |
| --- | --- | --- |
| Notion | [notion.md](docs/en/notion.md) | [notion.md](docs/fr/notion.md) |
| Development | [development.md](docs/en/development.md) | [development.md](docs/fr/development.md) |

## Author

**[Vakz](https://github.com/vakz0)** — engineering student (France).

## License

[MIT](LICENSE) — third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

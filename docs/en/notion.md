# Notion setup

[English](notion.md) · [Français](../fr/notion.md)

## Connect

1. Create an [internal integration](https://www.notion.so/my-integrations) and copy the secret
2. On your tasks database: `…` → **Connections** → add the integration
3. Systray → **Paramètres…** → paste the secret + database URL → **Enregistrer Notion**

Config file: `%APPDATA%\lattice-desk\config.json` (or repo-root `config.json` in dev). Example: `config.example.json`.

Without a token, Lattice runs in **demo mode** once Notion widgets are enabled.

## Property mapping

Defaults (`Name`, `Date`, `Tags`, `Priority`, `Urgency`, `Done`) can be renamed in **Paramètres** or under `properties` in `config.json`. Use **Tester la connexion** to auto-suggest from your schema.

## Secondary sources (optional)

Edit `projectSources` in `config.json` to merge another database filtered by a project relation:

```json
"projectSources": [
  {
    "databaseId": "https://www.notion.so/YOUR_TASKS_DATABASE_ID",
    "projectPageId": "https://www.notion.so/YOUR_PROJECT_PAGE_ID",
    "relationProperty": "Project",
    "label": "My project"
  }
]
```

Share each database with the integration. See `config.example.json` for full field names.

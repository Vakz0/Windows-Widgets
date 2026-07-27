# Notion setup

[English](../en/notion.md) · [Français](../fr/notion.md)

Connect **Lattice** to any Notion tasks database via an internal integration. Optional secondary sources (`projectSources`) can merge related project databases.

## 1. Prerequisites

1. Create an [internal integration](https://www.notion.so/my-integrations) (any name, e.g. `Lattice`)
2. Copy the secret (`secret_…` or `ntn_…`)
3. On your tasks database: `…` → **Connections** → add the integration
4. Optional secondary sources: share each related database with the same integration

Without step 3, the API denies access even with a valid token.

## 2. Connect in the app (recommended)

1. Systray → **Paramètres…** (or catalog → **Paramètres**)
2. Under **Notion**, paste the integration secret and the database URL (or UUID)
3. Adjust property names to match your schema (or use **Tester la connexion** to auto-suggest from the database schema)
4. Click **Enregistrer Notion**

Lattice stores credentials in `%APPDATA%\lattice-desk\config.json`. The token is never sent back to the UI after save.

You can still edit the file manually (**Ouvrir config.json**) or start from the example:

```powershell
Copy-Item .\config.example.json .\config.json
```

Full schema: [configuration.md](configuration.md).

## 3. Property mapping

Lattice maps Notion properties by **name**. Defaults in a fresh config:

| App role | Default property name |
| --- | --- |
| Title | `Name` |
| Date (calendar) | `Date` |
| Pill / tag | `Tags` |
| Importance / priority | `Priority` |
| Urgency (optional) | `Urgency` |
| Done checkbox (optional) | `Done` |

Rename the mapping in **Paramètres** (or `properties` in `config.json`) to match your database. The detail panel **description** comes from the Notion **page body** by default (unless a secondary source sets `properties.description`).

## 4. Optional secondary sources (`projectSources`)

Merge tasks from another database filtered by a **relation** to a project page (common with Notion project-tracker templates).

Edit `projectSources` in `config.json` (not yet exposed in the settings UI):

```json
"projectSources": [
  {
    "databaseId": "https://www.notion.so/YOUR_TASKS_DATABASE_ID",
    "projectPageId": "https://www.notion.so/YOUR_PROJECT_PAGE_ID",
    "relationProperty": "Project",
    "label": "My project",
    "properties": {
      "title": "Name",
      "date": "Due",
      "tag": "Type",
      "status": "Priority",
      "workflowStatus": "Status",
      "description": "Description"
    },
    "filters": {
      "hideCompleted": true,
      "completedStatusValues": ["Done"]
    }
  }
]
```

### Notes

- One `projectSources` entry = one filtered project; multiple projects = multiple entries
- If a secondary source fails, the primary database still loads
- Share each database with the integration (**Connections**)
- In dev, put `projectSources` in the repo-root `config.json` (higher priority than userData)

### Source files

- [`electron/notion.ts`](../../electron/notion.ts)
- [`shared/types.ts`](../../shared/types.ts)

### Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Demo data only | Missing/placeholder token or database id | Save credentials in **Paramètres** |
| Connection test fails / 404 | Database not shared with the integration | **Connections** on the database |
| Empty property pills | Property names don’t match | Align mapping or re-run **Tester la connexion** |
| Secondary source missing | `projectSources` absent from the active config | Add the block to the config file in use |

## 5. Related

- [Configuration](configuration.md) — full `config.json` schema and public settings IPC
- [Architecture](architecture.md) — multi-source Notion flow

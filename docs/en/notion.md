# Notion setup

[English](../en/notion.md) · [Français](../fr/notion.md)

Connect **Lattice** to the **My Task List** database (Tracker page).

## 1. Prerequisites

1. Create an [internal integration](https://www.notion.so/my-integrations) (e.g. `Lattice`)
2. Copy the secret (`secret_…` or `ntn_…`)
3. On **Tracker** or **My Task List**: `…` → **Connections** → add the integration

Without step 3, the API denies access even with a valid token.

## 2. Configuration

```powershell
Copy-Item .\config.example.json .\config.json
```

1. Paste the token into `notionToken`
2. Check the database URL / ID in `databaseId`
3. Restart the app (Desktop shortcut or `npm run app`)

The active file may also live at `%APPDATA%\lattice-desk\config.json`  
(systray menu → **Notion** → **Open config file**).

Full schema: [configuration.md](configuration.md).

## 3. Tracker schema

| App role | Notion property |
| --- | --- |
| Title | `Tâche` |
| Date (calendar) | `Date` |
| Pill (Facile, Flow…) | `État` |
| Importance | `Importance` |
| Urgency | `Urgence` |
| Done | checkbox (unnamed) |

`État` values: `Flow`, `Moyen`, `Rapide`, `Facile`, `Personnelle`.

The detail panel **description** comes from the Notion **page body** (not a property).

## 4. Links

- Page: [Tracker](https://app.notion.com/p/3a7c67f218728064ab1dc5616882cb41)
- Database: [My Task List](https://www.notion.so/3a7c67f21872804889cace3d58d51606)

# Configuration

[English](../en/configuration.md) · [Français](../fr/configuration.md)

> Schema and locations for Lattice `config.json`.

## File locations

Lattice looks for config in this order ([`electron/config.ts`](../../electron/config.ts)):

1. `config.json` in the current working directory
2. `config.json` next to the app path
3. `%APPDATA%\lattice-desk\config.json` (userData)

When valid Notion credentials are found, the working config is **saved to userData**. The tray item **Notion → Open config file** always opens that userData path.

Start from the example:

```powershell
Copy-Item .\config.example.json .\config.json
```

## Schema

Types: [`shared/types.ts`](../../shared/types.ts). Example: [`config.example.json`](../../config.example.json).

| Field | Type | Description |
| --- | --- | --- |
| `notionToken` | string | Internal integration secret (`secret_…` / `ntn_…`) |
| `databaseId` | string | Database URL or UUID (ID is extracted automatically) |
| `properties.title` | string | Notion title property name (default `Tâche`) |
| `properties.date` | string | Date property for the calendar (default `Date`) |
| `properties.tag` | string | Tag / pill property (default `État`) |
| `properties.status` | string | Importance property (default `Importance`) |
| `properties.urgency` | string? | Urgency property (default `Urgence`) |
| `properties.doneCheckbox` | string? | Completed checkbox name (empty = unnamed checkbox in Tracker) |
| `filters.hideCompleted` | boolean | Hide completed tasks in the UI |
| `filters.completedStatusValues` | string[] | Extra status values treated as done |
| `refreshIntervalSeconds` | number | Base Notion poll interval (minimum 60 s applied at runtime) |
| `launchAtStartup` | boolean | Register / unregister Windows login item |
| `demoMode` | boolean | Force demo data; auto-enabled if token is missing/placeholder |
| `windows` | object? | Saved bounds per widget (`calendar` / `tasks` / `monitor`) |

### Window bounds

```json
"windows": {
  "calendar": { "x": 40, "y": 80, "width": 720, "height": 420 },
  "tasks": { "x": 40, "y": 520, "width": 360, "height": 480 },
  "monitor": { "x": 100, "y": 100, "width": 320, "height": 200 }
}
```

Bounds are updated when you move/resize widgets (debounced). Monitor size is fixed by the app; position may still be stored.

## Public config (renderer)

The UI only receives a subset via `getConfig`:

- `refreshIntervalSeconds`
- `demoMode`
- `configPath`
- `launchAtStartup`

Secrets (`notionToken`) never cross into the renderer.

## Notion property mapping

See [Notion setup](notion.md) for integration steps and the Tracker schema table.

## Related

- [Architecture](architecture.md) — load order and migration from legacy AppData folders
- [Development](development.md) — local setup

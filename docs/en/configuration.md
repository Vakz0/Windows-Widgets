# Configuration

[English](../en/configuration.md) · [Français](../fr/configuration.md)

> Schema and locations for Lattice `config.json`.

## File locations

Lattice looks for config in this order ([`electron/config.ts`](../../electron/config.ts)):

1. `config.json` in the current working directory
2. `config.json` next to the app path
3. `%APPDATA%\lattice-desk\config.json` (userData)

When valid Notion credentials are found, the working config is **saved to userData**. Open that path from **Paramètres** → **Ouvrir config.json**, or the tray item **Notion → Open config file** when a Notion widget is enabled.

**During development** (`npm run dev` from the repo root), the cwd `config.json` is read first. It must include `projectSources` if you test project tasks — otherwise they will not load, even when present in userData (see merge below).

Start from the example:

```powershell
Copy-Item .\config.example.json .\config.json
```

## Schema

Types: [`shared/types.ts`](../../shared/types.ts). Example: [`config.example.json`](../../config.example.json).

| Field | Type | Description |
| --- | --- | --- |
| `notionToken` | string | Internal integration secret (`secret_…` / `ntn_…`) — set via **Paramètres** or file |
| `databaseId` | string | Database URL or UUID (UUID is extracted automatically) |
| `properties.title` | string | Notion title property name (default `Name`) |
| `properties.date` | string | Date property for the calendar (default `Date`) |
| `properties.tag` | string | Tag / pill property (default `Tags`) |
| `properties.status` | string | Importance / priority property (default `Priority`) |
| `properties.urgency` | string? | Urgency property (default `Urgency`) |
| `properties.doneCheckbox` | string? | Completed checkbox name (default `Done`) |
| `filters.hideCompleted` | boolean | Hide completed tasks in the UI |
| `filters.completedStatusValues` | string[] | Extra status values treated as done |
| `refreshIntervalSeconds` | number | Base Notion poll interval (minimum 60 s applied at runtime) |
| `launchAtStartup` | boolean | Register / unregister Windows login item |
| `demoMode` | boolean | Force demo data; auto-enabled if token is missing/placeholder |
| `projectSources` | array? | Secondary sources (relation-filtered databases) — see below |
| `widgets` | object? | Per-widget enablement (`{ "calendar": { "enabled": true } }`). `{}` = empty install |
| `windows` | object? | Saved bounds per widget id (`calendar` / `tasks` / `monitor` / …) |

### Widget enablement (`widgets`)

Controls which widgets are **enabled** on the platform (distinct from tray show/hide).

```json
"widgets": {
  "calendar": { "enabled": true },
  "tasks": { "enabled": true },
  "monitor": { "enabled": false }
}
```

| Case | Behavior |
| --- | --- |
| `"widgets": {}` or all `enabled: false` | Empty shell (tray + catalog only) |
| `widgets` key **missing** from the file | Legacy migration: calendar + tasks enabled, monitor disabled |
| Enable via UI | Catalog window (tray → **Catalogue des widgets…**) or IPC `setWidgetEnabled` |

Notion services start only when at least one enabled widget declares the `notion` service. The monitor pop-up and temperature menu require the `monitor` widget to be enabled.

### Project sources (`projectSources`)

Optional array. Each entry merges tasks from a Notion database filtered by relation to a project page. Edit in `config.json` (settings UI covers the primary database only).

| Field | Type | Description |
| --- | --- | --- |
| `databaseId` | string | Secondary tasks database URL or UUID (UUID extracted automatically) |
| `projectPageId` | string | Project page URL or UUID (UUID extracted automatically) |
| `relationProperty` | string | Relation property to the project (e.g. `Project`) |
| `label` | string | Label shown in the UI (e.g. `Work`) |
| `properties` | object | Notion property mapping (see [notion.md](notion.md)) |
| `properties.workflowStatus` | string? | Notion workflow status (e.g. `Status`; `Done` = completed) |
| `properties.description` | string? | Text property for the description |
| `filters` | object | Same shape as root `filters` (`hideCompleted`, `completedStatusValues`) |

If a secondary source fails (404, database not shared), primary database tasks are still shown.

### Load-time merge

When config is read from cwd or the app path (higher priority than userData), Lattice **keeps from userData**:

- `windows` (widget positions)
- `widgets` (enablement)
- `projectSources`, if missing from the higher-priority file

The merged config is then written back to `%APPDATA%\lattice-desk\config.json`. To avoid losing `projectSources` in dev, include it in the repo-root `config.json` (gitignored).

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

The UI receives a non-secret subset via `getConfig` / `getNotionSettings`:

- `refreshIntervalSeconds`, `demoMode`, `configPath`, `launchAtStartup`
- `notionConfigured`, `notionTokenStored` (boolean only — never the raw secret)
- `databaseId`, `properties`, `filters`, `projectSourcesCount`

Secrets (`notionToken`) never cross into the renderer after save. The settings screen may **send** a new token once for `saveNotionSettings` / `testNotionConnection`.

### Settings screen

Open from the systray (**Paramètres…**) or the **Paramètres** tab in the catalog window.

- **Application** — edits public keys via `updatePublicSettings`
- **Notion** — token (write-only), database URL, property mapping, filters; **Tester la connexion** (`testNotionConnection`) and **Enregistrer Notion** (`saveNotionSettings`). A successful test can suggest property names from `databases.retrieve`
- Opens the file (`openConfigFile`); version from `package.json` (`getAppVersion`)

## Notion property mapping

See [Notion setup](notion.md) for integration steps and the generic mapping table.

## Related

- [Architecture](architecture.md) — load order and migration from legacy AppData folders
- [Development](development.md) — local setup

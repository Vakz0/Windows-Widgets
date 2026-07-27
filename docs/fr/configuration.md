# Configuration

[English](../en/configuration.md) · [Français](../fr/configuration.md)

> Schéma et emplacements du `config.json` de Lattice.

## Emplacements du fichier

Lattice cherche la config dans cet ordre ([`electron/config.ts`](../../electron/config.ts)) :

1. `config.json` dans le répertoire de travail courant
2. `config.json` à côté du chemin de l’app
3. `%APPDATA%\lattice-desk\config.json` (userData)

Quand des identifiants Notion valides sont trouvés, la config active est **enregistrée dans userData**. L’entrée systray **Notion → Ouvrir le fichier config** ouvre toujours ce chemin userData.

Partir de l’exemple :

```powershell
Copy-Item .\config.example.json .\config.json
```

## Schéma

Types : [`shared/types.ts`](../../shared/types.ts). Exemple : [`config.example.json`](../../config.example.json).

| Champ | Type | Description |
| --- | --- | --- |
| `notionToken` | string | Secret d’intégration interne (`secret_…` / `ntn_…`) |
| `databaseId` | string | URL ou UUID de la base (l’ID est extrait automatiquement) |
| `properties.title` | string | Nom de la propriété titre (défaut `Tâche`) |
| `properties.date` | string | Propriété date pour le calendrier (défaut `Date`) |
| `properties.tag` | string | Propriété pastille (défaut `État`) |
| `properties.status` | string | Propriété importance (défaut `Importance`) |
| `properties.urgency` | string? | Propriété urgence (défaut `Urgence`) |
| `properties.doneCheckbox` | string? | Nom de la case « terminé » (vide = case sans nom dans Tracker) |
| `filters.hideCompleted` | boolean | Masquer les tâches terminées dans l’UI |
| `filters.completedStatusValues` | string[] | Valeurs de statut supplémentaires considérées comme terminées |
| `refreshIntervalSeconds` | number | Intervalle de base du poll Notion (minimum 60 s appliqué à l’exécution) |
| `launchAtStartup` | boolean | Enregistrer / retirer l’élément au démarrage Windows |
| `demoMode` | boolean | Forcer les données démo ; activé auto si le token manque / est un placeholder |
| `windows` | object? | Bounds sauvegardés par widget (`calendar` / `tasks` / `monitor`) |

### Bounds des fenêtres

```json
"windows": {
  "calendar": { "x": 40, "y": 80, "width": 720, "height": 420 },
  "tasks": { "x": 40, "y": 520, "width": 360, "height": 480 },
  "monitor": { "x": 100, "y": 100, "width": 320, "height": 200 }
}
```

Les bounds sont mis à jour lors du déplacement / redimensionnement (avec debounce). La taille du monitoring est fixée par l’app ; la position peut quand même être stockée.

## Config publique (renderer)

L’UI ne reçoit qu’un sous-ensemble via `getConfig` :

- `refreshIntervalSeconds`
- `demoMode`
- `configPath`
- `launchAtStartup`

Les secrets (`notionToken`) ne passent jamais dans le renderer.

## Mapping des propriétés Notion

Voir [Connexion Notion](notion.md) pour les étapes d’intégration et le tableau du schéma Tracker.

## Voir aussi

- [Architecture](architecture.md) — ordre de chargement et migration des dossiers AppData legacy
- [Développement](development.md) — setup local

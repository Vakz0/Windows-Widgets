# Configuration

[English](../en/configuration.md) · [Français](../fr/configuration.md)

> Schéma et emplacements du `config.json` de Lattice.

## Emplacements du fichier

Lattice cherche la config dans cet ordre ([`electron/config.ts`](../../electron/config.ts)) :

1. `config.json` dans le répertoire de travail courant
2. `config.json` à côté du chemin de l’app
3. `%APPDATA%\lattice-desk\config.json` (userData)

Quand des identifiants Notion valides sont trouvés, la config active est **enregistrée dans userData**. Ouvrir ce chemin depuis **Paramètres** → **Ouvrir config.json**, ou l’entrée systray **Notion → Ouvrir le fichier config** si un widget Notion est activé.

**En développement** (`npm run dev` depuis la racine du dépôt), le `config.json` du répertoire courant est lu en premier. Il doit contenir `projectSources` si vous testez les tâches projet — sinon elles ne seront pas chargées, même si elles sont présentes dans userData (voir fusion ci-dessous).

Partir de l’exemple :

```powershell
Copy-Item .\config.example.json .\config.json
```

## Schéma

Types : [`shared/types.ts`](../../shared/types.ts). Exemple : [`config.example.json`](../../config.example.json).

| Champ | Type | Description |
| --- | --- | --- |
| `notionToken` | string | Secret d’intégration interne (`secret_…` / `ntn_…`) — via **Paramètres** ou fichier |
| `databaseId` | string | URL ou UUID de la base (l’UUID est extrait automatiquement) |
| `properties.title` | string | Nom de la propriété titre (défaut `Name`) |
| `properties.date` | string | Propriété date pour le calendrier (défaut `Date`) |
| `properties.tag` | string | Propriété pastille / tag (défaut `Tags`) |
| `properties.status` | string | Propriété importance / priorité (défaut `Priority`) |
| `properties.urgency` | string? | Propriété urgence (défaut `Urgency`) |
| `properties.doneCheckbox` | string? | Nom de la case « terminé » (défaut `Done`) |
| `filters.hideCompleted` | boolean | Masquer les tâches terminées dans l’UI |
| `filters.completedStatusValues` | string[] | Valeurs de statut supplémentaires considérées comme terminées |
| `refreshIntervalSeconds` | number | Intervalle de base du poll Notion (minimum 60 s appliqué à l’exécution) |
| `launchAtStartup` | boolean | Enregistrer / retirer l’élément au démarrage Windows |
| `demoMode` | boolean | Forcer les données démo ; activé auto si le token manque / est un placeholder |
| `projectSources` | array? | Sources secondaires (bases filtrées par relation) — voir ci-dessous |
| `widgets` | object? | Activation par id de widget (`{ "calendar": { "enabled": true } }`). `{}` = install vide |
| `windows` | object? | Bounds sauvegardés par id de widget (`calendar` / `tasks` / `monitor` / …) |

### Activation des widgets (`widgets`)

Contrôle quels widgets sont **activés** sur la plateforme (distinct du show/hide tray).

```json
"widgets": {
  "calendar": { "enabled": true },
  "tasks": { "enabled": true },
  "monitor": { "enabled": false }
}
```

| Cas | Comportement |
| --- | --- |
| `"widgets": {}` ou tous `enabled: false` | Shell vide (tray + catalogue seulement) |
| Clé `widgets` **absente** du fichier | Migration legacy : calendrier + tâches activés, monitor désactivé |
| Activation via UI | Fenêtre Catalogue (tray → **Catalogue des widgets…**) ou IPC `setWidgetEnabled` |

Les services Notion ne démarrent que si au moins un widget activé déclare le service `notion`. Le monitoring pop-up et le menu température exigent le widget `monitor` activé.

### Sources projet (`projectSources`)

Tableau optionnel. Chaque entrée fusionne les tâches d’une base Notion filtrées par relation vers une page projet. Édition dans `config.json` (l’UI Paramètres couvre la base principale uniquement).

| Champ | Type | Description |
| --- | --- | --- |
| `databaseId` | string | URL ou UUID de la base de tâches secondaire (UUID extrait automatiquement) |
| `projectPageId` | string | URL ou UUID de la page projet (UUID extrait automatiquement) |
| `relationProperty` | string | Propriété relation vers le projet (ex. `Project`) |
| `label` | string | Libellé affiché dans l’UI (ex. `Travail`) |
| `properties` | object | Mapping des propriétés Notion (voir [notion.md](notion.md)) |
| `properties.workflowStatus` | string? | Statut workflow Notion (ex. `Status` ; `Done` = terminé) |
| `properties.description` | string? | Propriété texte pour la description |
| `filters` | object | Même forme que `filters` principal (`hideCompleted`, `completedStatusValues`) |

Si une source secondaire échoue (404, base non partagée), les tâches de la base principale restent affichées.

### Fusion au chargement

Quand la config est lue depuis le cwd ou le chemin de l’app (priorité sur userData), Lattice **conserve depuis userData** :

- `windows` (positions des widgets)
- `widgets` (activation)
- `projectSources`, si absent du fichier lu en priorité

La config résultante est ensuite réécrite dans `%APPDATA%\lattice-desk\config.json`. Pour éviter de perdre `projectSources` en dev, incluez-le dans le `config.json` à la racine du dépôt (fichier gitignoré).

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

L’UI reçoit un sous-ensemble non secret via `getConfig` / `getNotionSettings` :

- `refreshIntervalSeconds`, `demoMode`, `configPath`, `launchAtStartup`
- `notionConfigured`, `notionTokenStored` (booléens uniquement — jamais le secret brut)
- `databaseId`, `properties`, `filters`, `projectSourcesCount`

Les secrets (`notionToken`) ne repassent jamais dans le renderer après sauvegarde. L’écran Paramètres peut **envoyer** un nouveau token une fois pour `saveNotionSettings` / `testNotionConnection`.

### Écran Paramètres

Accessible depuis le systray (**Paramètres…**) ou l’onglet **Paramètres** de la fenêtre catalogue.

- **Application** — édite les clés publiques via `updatePublicSettings`
- **Notion** — token (écriture seule), URL de base, mapping des propriétés, filtres ; **Tester la connexion** (`testNotionConnection`) et **Enregistrer Notion** (`saveNotionSettings`). Un test réussi peut proposer les noms de propriétés via `databases.retrieve`
- Ouvre le fichier (`openConfigFile`) ; version depuis `package.json` (`getAppVersion`)

## Mapping des propriétés Notion

Voir [Connexion Notion](notion.md) pour les étapes d’intégration et le tableau de mapping générique.

## Voir aussi

- [Architecture](architecture.md) — ordre de chargement et migration des dossiers AppData legacy
- [Développement](development.md) — setup local

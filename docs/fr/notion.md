# Connexion Notion

[English](../en/notion.md) · [Français](../fr/notion.md)

Brancher **Lattice** à n’importe quelle base de tâches Notion via une intégration interne. Des sources secondaires optionnelles (`projectSources`) peuvent fusionner des bases liées à un projet.

## 1. Prérequis

1. Créer une [intégration interne](https://www.notion.so/my-integrations) (n’importe quel nom, ex. `Lattice`)
2. Copier le secret (`secret_…` ou `ntn_…`)
3. Sur votre base de tâches : `…` → **Connexions** → ajouter l’intégration
4. Sources secondaires optionnelles : partager chaque base concernée avec la même intégration

Sans l’étape 3, l’API refuse l’accès même avec un token valide.

## 2. Connexion dans l’app (recommandé)

1. Systray → **Paramètres…** (ou catalogue → **Paramètres**)
2. Sous **Notion**, coller le secret d’intégration et l’URL (ou UUID) de la base
3. Ajuster les noms de propriétés selon votre schéma (ou utiliser **Tester la connexion** pour proposer un mapping depuis le schéma)
4. Cliquer sur **Enregistrer Notion**

Lattice enregistre les identifiants dans `%APPDATA%\lattice-desk\config.json`. Le token n’est jamais renvoyé à l’UI après sauvegarde.

Vous pouvez aussi éditer le fichier manuellement (**Ouvrir config.json**) ou partir de l’exemple :

```powershell
Copy-Item .\config.example.json .\config.json
```

Détail du schéma : [configuration.md](configuration.md).

## 3. Mapping des propriétés

Lattice mappe les propriétés Notion par **nom**. Défauts d’une config neuve :

| Rôle app | Nom de propriété par défaut |
| --- | --- |
| Titre | `Name` |
| Date (calendrier) | `Date` |
| Pastille / tag | `Tags` |
| Importance / priorité | `Priority` |
| Urgence (optionnel) | `Urgency` |
| Case terminé (optionnel) | `Done` |

Renommez le mapping dans **Paramètres** (ou `properties` dans `config.json`) pour coller à votre base. La **description** du panneau détail vient du **corps de la page** Notion par défaut (sauf si une source secondaire définit `properties.description`).

## 4. Sources secondaires optionnelles (`projectSources`)

Fusionner les tâches d’une autre base filtrées par une **relation** vers une page projet (courant avec les templates de suivi de projet Notion).

Éditer `projectSources` dans `config.json` (pas encore exposé dans l’UI Paramètres) :

```json
"projectSources": [
  {
    "databaseId": "https://www.notion.so/YOUR_TASKS_DATABASE_ID",
    "projectPageId": "https://www.notion.so/YOUR_PROJECT_PAGE_ID",
    "relationProperty": "Project",
    "label": "Mon projet",
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

- Une entrée `projectSources` = un projet filtré ; plusieurs projets = plusieurs entrées
- En cas d’erreur sur une source secondaire, la base principale reste chargée
- Partager chaque base avec l’intégration (**Connexions**)
- En dev, placer `projectSources` dans le `config.json` à la racine du dépôt (prioritaire sur userData)

### Fichiers source

- [`electron/notion.ts`](../../electron/notion.ts)
- [`shared/types.ts`](../../shared/types.ts)

### Dépannage

| Symptôme | Cause probable | Action |
| --- | --- | --- |
| Données démo uniquement | Token / ID de base manquant ou placeholder | Enregistrer les identifiants dans **Paramètres** |
| Test de connexion échoue / 404 | Base non partagée avec l’intégration | **Connexions** sur la base |
| Pastilles vides | Noms de propriétés incorrects | Aligner le mapping ou relancer **Tester la connexion** |
| Source secondaire absente | `projectSources` absent du config actif | Ajouter le bloc dans le fichier config utilisé |

## 5. Liens

- [Configuration](configuration.md) — schéma `config.json` complet et IPC des paramètres
- [Architecture](architecture.md) — flux Notion multi-sources

# Connexion Notion

[English](../en/notion.md) · [Français](notion.md)

## Brancher

1. Créer une [intégration interne](https://www.notion.so/my-integrations) et copier le secret
2. Sur la base de tâches : `…` → **Connexions** → ajouter l’intégration
3. Systray → **Paramètres…** → coller le secret + URL de la base → **Enregistrer Notion**

Fichier config : `%APPDATA%\lattice-desk\config.json` (ou `config.json` à la racine en dev). Exemple : `config.example.json`.

Sans token, Lattice tourne en **mode démo** une fois les widgets Notion activés.

## Mapping des propriétés

Les défauts (`Name`, `Date`, `Tags`, `Priority`, `Urgency`, `Done`) se renomment dans **Paramètres** ou sous `properties` dans `config.json`. Utiliser **Tester la connexion** pour proposer un mapping.

## Sources secondaires (optionnel)

Éditer `projectSources` dans `config.json` pour fusionner une autre base filtrée par relation projet :

```json
"projectSources": [
  {
    "databaseId": "https://www.notion.so/YOUR_TASKS_DATABASE_ID",
    "projectPageId": "https://www.notion.so/YOUR_PROJECT_PAGE_ID",
    "relationProperty": "Project",
    "label": "Mon projet"
  }
]
```

Partager chaque base avec l’intégration. Voir `config.example.json` pour tous les champs.

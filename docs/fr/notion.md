# Connexion Notion

[English](../en/notion.md) · [Français](../fr/notion.md)

Brancher **Lattice** à la base **My Task List** (page Tracker).

## 1. Prérequis

1. Créer une [intégration interne](https://www.notion.so/my-integrations) (ex. `Lattice`)
2. Copier le secret (`secret_…` ou `ntn_…`)
3. Sur **Tracker** ou **My Task List** : `…` → **Connexions** → ajouter l’intégration

Sans l’étape 3, l’API refuse l’accès même avec un token valide.

## 2. Configuration

```powershell
Copy-Item .\config.example.json .\config.json
```

1. Coller le token dans `notionToken`
2. Vérifier l’URL / l’ID de la base dans `databaseId`
3. Relancer l’app (raccourci Bureau ou `npm run app`)

Fichier actif possible aussi dans `%APPDATA%\lattice-desk\config.json`  
(menu systray → **Notion** → **Ouvrir le fichier config**).

Détail du schéma : [configuration.md](configuration.md).

## 3. Schéma Tracker

| Rôle app | Propriété Notion |
| --- | --- |
| Titre | `Tâche` |
| Date (calendrier) | `Date` |
| Pastille (Facile, Flow…) | `État` |
| Importance | `Importance` |
| Urgence | `Urgence` |
| Terminé | case à cocher (sans nom) |

Valeurs de `État` : `Flow`, `Moyen`, `Rapide`, `Facile`, `Personnelle`.

La **description** du panneau détail vient du **corps de la page** Notion (pas d’une propriété).

## 4. Liens

- Page : [Tracker](https://app.notion.com/p/3a7c67f218728064ab1dc5616882cb41)
- Base : [My Task List](https://www.notion.so/3a7c67f21872804889cace3d58d51606)

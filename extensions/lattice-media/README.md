# Lattice Media Bridge (extension)

Extension Chrome / Edge / Brave (Manifest V3) qui :

1. Signale la lecture audio/vidéo à Lattice pour **éviter l’AFK** pendant une vidéo
2. Envoie le **temps de visionnage** par site (YouTube, Netflix…) affiché dans le widget **Visionnage**

## Prérequis

1. Widget **Activité** activé dans Lattice (démarre le pont local `127.0.0.1:17384`).
2. Fichier généré au démarrage :
   `%APPDATA%\lattice-desk\activity\media-bridge.json`  
   (contient `token` + `endpoint`).

## Installation (dev / unpacked)

1. Chrome, Edge ou Brave → `chrome://extensions` / `edge://extensions` / `brave://extensions`
2. Activer **Mode développeur**
3. **Charger l’extension non empaquetée** → dossier  
   `extensions/lattice-media`
4. Ouvrir **Options** de l’extension → coller le `token` depuis `media-bridge.json` → Enregistrer
5. Recharger l’onglet média (F5) si déjà ouvert

## Fonctionnement

- Content script : écoute `play` / `pause` / Media Session / player YouTube (+ heartbeat)
- Service worker : agrège les frames, calcule des **deltas** par domaine (~10 s), `POST /v1/media`
- Payload : `{ playing, origin, watch: [{ domain, deltaMs }] }`
- Lattice :
  - `playing` → **pas d’AFK** (TTL 45 s)
  - deltas → `activity/days/YYYY-MM-DD.watch.json` → section **Visionnage** du widget
- Plusieurs onglets du même site en lecture = **1×** le temps horloge pour ce domaine

## Focus vs Visionnage

| | Focus (Top sites) | Visionnage |
| --- | --- | --- |
| Source | Fenêtre au premier plan | Extension (média qui joue) |
| Compte si… | Onglet/app focus | Lecture réelle (play) |
| Exemple | Brave ouvert sur YouTube | YouTube en train de lire |

## Dépannage

- Popup **Connecté · pas de lecture** alors qu’une vidéo joue :
  1. Rechargez l’extension → **Recharger**
  2. **F5** sur l’onglet YouTube / Netflix
  3. Vérifiez le badge **Média** et la section **Visionnage** dans le widget
- YouTube a beaucoup d’iframes : l’état est agrégé **par frame**

## Limites

- Navigateur uniquement (pas VLC / apps natives)
- Le token reste local ; le serveur n’écoute que sur `127.0.0.1`

# Suivi d’activité

[English](../en/activity.md) · [Français](activity.md)

Widget Lattice de suivi du temps passé sur le PC, avec **contexte logiciel** (domaine navigateur, fichier/projet IDE).

## Fonctionnalités

- Poll **focus uniquement** (~2 s) : seule la fenêtre au premier plan compte (une app ouverte en fond n’est pas chronométrée)
- Processus + titre + contexte structuré
- **Navigateur** : domaine (ou URL) via UI Automation (`active-url.exe`)
- **IDE** : parse Cursor / VS Code → fichier + projet
- Classification : domaine → règles titre → app → Autre
- Correction manuelle → `feedback.jsonl` + règles (apps, titres, **domaines**)
- Widget : résumé, top apps / **sites** / **projets** / **tâches Notion**, maintenant, **historique jour par jour**
- Options : pause, Web, titres, parse IDE, seuil AFK, délai interruption focus
- **Sessions focus Notion** : imputer le temps à une tâche + garde-fou allowlist (voir ci-dessous)
- **Extension navigateur** (optionnelle) : lecture média → pas d’AFK + **temps de visionnage** par site (`extensions/lattice-media`)
- Export CSV / JSON enrichi (segments + journal focus)
- Bouton **Effacer…** : supprime l’historique (`days/`), le feedback et le journal focus ; conserve `rules.json` / settings

## Ce qui n’est pas compté

- **Apps en arrière-plan** — le collecteur lit `GetForegroundWindow` uniquement
- **Widgets Lattice** — focus sur Lattice → segment `ignored` (hors temps actif, hors tops) ; hint « Widgets Lattice — non comptés »
- **Focus < 3 s** — un changement d’app n’est validé qu’après **3 s** de focus stable (ignore Alt-Tab / flash systray) ; l’AFK reste immédiat
- Liste extensible `ignoredApps` dans `rules.json` (défaut : `lattice`, `lattice-desk`)

## Vie privée

- **100 % local** dans `%APPDATA%\lattice-desk\activity\`
- `browserDetail` : `domain` (défaut) | `url` | `off` — bouton **Web:** dans le widget
- `parseIdeTitles` : parser les titres IDE (défaut on)
- **Titres off** : pas de texte de titre ; `titleHash` conservé
- Pas de sync cloud, pas de frappe, pas de captures

## Sessions focus (Notion)

But : travailler **uniquement** sur une tâche Notion, chronométrer ce temps, et s’interrompre si l’activité sort de l’allowlist.

1. Widget **Activité** activé (service `activity-tracker`)
2. Depuis **Tâches** / **Calendrier** : menu contextuel ou détail → **Travailler dessus**
3. Le bandeau **Session focus** dans Activité montre la tâche, l’état (active / pause / interrompue) et l’allowlist (apps, domaines, projets IDE)
4. Hors allowlist pendant le délai configuré (défaut **8 s**, option `Focus: Ns`) → fenêtre d’interruption : expliquer ce que vous faites, puis reprendre / autoriser cette fois / pause / terminer
5. Les notes vont dans `focus-journal.jsonl` ; le temps imputé apparaît dans **Temps par tâche** et l’export

Allowlist initiale : apps travail courantes (`cursor`, `code`, `notion`…) + contexte focus courant (projet IDE / domaine). Les widgets Lattice et l’AFK ne déclenchent pas d’interruption.

L’imputation est **locale** (id de page Notion sur les segments) — pas d’écriture d’une propriété « temps passé » dans Notion en V1.

## Limites

- Focus uniquement (pas les apps en fond)
- URL UIA : peut échouer en plein écran / si la barre d’adresse change
- Formats de titre IDE variables
- Pas d’URL sans le helper `active-url` (build .NET)

## Fichiers

| Chemin | Rôle |
| --- | --- |
| `activity/settings.json` | Pause, titres, AFK, `browserDetail`, `parseIdeTitles`, `focusOffProjectDwellSec` |
| `activity/rules.json` | Apps, motifs titre, overrides app/domaine, `ignoredApps` |
| `activity/feedback.jsonl` | Corrections |
| `activity/focus-session.json` | Session focus en cours (reprise au redémarrage) |
| `activity/focus-journal.jsonl` | Notes d’interruption (explications hors projet) |
| `activity/days/YYYY-MM-DD.jsonl` | Segments |
| `activity/days/YYYY-MM-DD.watch.json` | Temps de visionnage (extension) par domaine |
| `activity/media-bridge.json` | Token + endpoint pour l’extension média (généré au démarrage) |

### Extension média (AFK + Visionnage)

Pour ne pas basculer en AFK pendant une vidéo **et** compter le temps de lecture par site (YouTube, Netflix…) :

1. Activer le widget Activité (pont `127.0.0.1:17384`)
2. Charger `extensions/lattice-media` en extension non empaquetée (Chrome / Edge / Brave)
3. Coller le `token` de `media-bridge.json` dans les options de l’extension

Le widget affiche une section **Visionnage** (source extension, lecture réelle), distincte des **Top sites** (focus fenêtre).

Détails : [`extensions/lattice-media/README.md`](../../extensions/lattice-media/README.md).

Si `playing` est signalé (heartbeat &lt; 45 s), l’idle clavier/souris **ne déclenche pas** l’AFK. Badge **Média** dans le widget.

### Segment (champs utiles)

Base : `start`, `end`, `app`, `title`, `category`, source/confiance, idle, session, `ignored?`…

Contexte :

| Champ | Exemple |
| --- | --- |
| `domain` | `github.com` |
| `urlPath` | `/org/repo` (si `browserDetail=url`) |
| `contextKind` | `browser` / `ide` / `chat` |
| `fileName` | `activity.ts` |
| `projectName` | `windows-widgets` |
| `focusSessionId` | UUID de session focus |
| `notionTaskId` | Id de page Notion |
| `notionTaskTitle` | Titre snapshot de la tâche |

### Classification

1. idle → AFK  
2. `userAppOverrides`  
3. **domaine** (`userDomainOverrides` puis table intégrée : `youtube.com` → divertissement, `github.com` → travail, …)  
4. motifs titre  
5. défauts d’app  
6. `other`

Les segments `ignored` et AFK sont exclus des totaux actifs et des tops.

Si `active-url.exe` est absent, le domaine est déduit du titre de fenêtre (fallback).

## Activation

Systray → **Catalogue** → **Activité**. Rebuild helpers : `npm run build:helpers`.

## Notes techniques

- Service `activity-tracker`
- Win32 focus via `koffi` ; URL via `tools/active-url` (WPF UI Automation)
- Détection Lattice : HWND des `BrowserWindow` + chemin exe / `ignoredApps`
- Dwell focus : `FOCUS_DWELL_MS = 3000`
- Idle via `powerMonitor.getSystemIdleTime()`

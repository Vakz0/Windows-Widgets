---
name: corriger-problemes-herald
description: Corrige les 381 problème(s) détecté(s) par Herald dans Vakz0/Lattice (score 73/100, grade C). À utiliser pour résoudre, règle par règle, les relevés de sécurité, qualité, performance et fiabilité.
---

# Corriger les problèmes relevés par Herald

**Cible :** `Vakz0/Lattice`  
**État :** score 73/100 (grade C), 381 problème(s) : 5 critique(s), 332 à revoir, 44 info(s).

## Objectif

Corriger les problèmes ci-dessous pour remonter le score, en traitant **une règle à la fois** et en commençant par les plus graves.

## Méthode

1. Prends les règles dans l'ordre (les critiques d'abord).
2. Pour chaque règle, ouvre **chaque fichier listé** et applique la correction indiquée.
3. Reste minimal : ne change que le nécessaire, en gardant le style du code environnant.
4. Après chaque lot, relance build / lint / tests pour vérifier la non-régression.
5. N'introduis ni secret, ni code mort, ni dépendance obsolète.

## Problèmes à corriger

### 1. [CRITIQUE] `vulnerable-dependency`, 4 occurrence(s)

systeminformation (^5.23.5): systeminformation has a Command Injection vulnerability in fsSize() function on Windows [GHSA-wphj-fx3q-84ch] (+5 autres) · maj: 5.33.1 · doc: https://github.com/advisories/GHSA-wphj-fx3q-84ch

**Fichiers à corriger :**

- `package.json`
- `package.json`
- `package.json`
- `package.json`

### 2. [CRITIQUE] `weak_crypto`, 1 occurrence(s)

Weak/obsolete crypto (MD5, SHA-1, DES, RC4) — prefer SHA-256+/AES

**Fichiers à corriger :**

- `electron/activity/poll.ts:71`

### 3. [À REVOIR] `blocking-sync-io`, 62 occurrence(s)

I/O synchrone bloquant — utilise la version asynchrone (fs.promises / await)

**Fichiers à corriger :**

- `electron/activity/export.ts:87`
- `electron/activity/export.ts:87`
- `electron/activity/export.ts:87`
- `electron/activity/export.ts:150`
- `electron/activity/export.ts:150`
- `electron/activity/export.ts:150`
- `electron/activity/storage.ts:32`
- `electron/activity/storage.ts:32`
- `electron/activity/storage.ts:154`
- `electron/activity/storage.ts:154`
- `electron/activity/storage.ts:173`
- `electron/activity/storage.ts:173`
- `electron/activity/storage.ts:41`
- `electron/activity/storage.ts:41`
- `electron/activity/storage.ts:41`
- `electron/activityMediaBridge.ts:59`
- `electron/activityMediaBridge.ts:59`
- `electron/activityMediaBridge.ts:154`
- `electron/activityMediaBridge.ts:154`
- `electron/activityMediaBridge.ts:74`
- `electron/activityMediaBridge.ts:74`
- `electron/activityMediaBridge.ts:74`
- `electron/activityMediaBridge.ts:199`
- `electron/activityMediaBridge.ts:199`
- `electron/activityMediaBridge.ts:199`
- `electron/activityMediaBridge.ts:385`
- `electron/activityMediaBridge.ts:385`
- `electron/activityMediaBridge.ts:385`
- `electron/config.ts:114`
- `electron/config.ts:114`
- `electron/config.ts:128`
- `electron/config.ts:128`
- `electron/config.ts:160`
- `electron/config.ts:160`
- `electron/config.ts:164`
- `electron/config.ts:164`
- `electron/config.ts:164`
- `electron/config.ts:175`
- `electron/config.ts:175`
- `electron/config.ts:175`
- `electron/focusSession.ts:118`
- `electron/focusSession.ts:118`
- `electron/focusSession.ts:254`
- `electron/focusSession.ts:254`
- `electron/focusSession.ts:270`
- `electron/focusSession.ts:270`
- `electron/focusSession.ts:110`
- `electron/focusSession.ts:110`
- `electron/focusSession.ts:110`
- `electron/system.ts:66`
- `electron/system.ts:66`
- `electron/system.ts:151`
- `electron/system.ts:151`
- `electron/system.ts:186`
- `electron/system.ts:186`
- `electron/widgetUpdates.ts:191`
- `electron/widgetUpdates.ts:191`
- `electron/widgets/discoverExternal.ts:132`
- `electron/widgets/discoverExternal.ts:132`
- `scripts/export-brand-assets.mjs:33`
- `scripts/export-brand-assets.mjs:40`
- `scripts/export-brand-assets.mjs:40`

### 4. [À REVOIR] `solid`, 41 occurrence(s)

Entorse à un principe SOLID (responsabilité unique, ouvert/fermé, substitution de Liskov, ségrégation d'interface, inversion de dépendance) — revois la conception de ce composant

**Fichiers à corriger :**

- `electron/activity/classifier.ts:39`
- `electron/activity/poll.ts:41`
- `electron/activity/poll.ts:107`
- `electron/activity/storage.ts:63`
- `electron/activityContext.ts:160`
- `electron/config.ts:194`
- `electron/focusSession.ts:322`
- `electron/main.ts:284`
- `electron/main.ts:544`
- `electron/main.ts:783`
- `electron/main.ts:809`
- `electron/main.ts:857`
- `electron/main.ts:995`
- `electron/main.ts:1141`
- `electron/notion.ts:751`
- `electron/preload.ts:52`
- `electron/preload.ts:71`
- `electron/preload.ts:189`
- `electron/preload.ts:190`
- `electron/system.ts:358`
- `electron/trayMenu.ts:17`
- `electron/trayMenu.ts:32`
- `electron/trayMenu.ts:33`
- `electron/updates.ts:109`
- `electron/updates.ts:117`
- `electron/widgetUpdates.ts:226`
- `electron/widgetUpdates.ts:363`
- `extensions/lattice-media/content.js:61`
- `src/widgets/ActivityWidget.tsx:161`
- `src/widgets/CalendarWidget.tsx:51`
- `src/widgets/CalendarWidget.tsx:107`
- `src/widgets/CatalogWidget.tsx:131`
- `src/widgets/CatalogWidget.tsx:144`
- `src/widgets/CatalogWidget.tsx:762`
- `src/widgets/CatalogWidget.tsx:801`
- `src/widgets/MonitorWidget.tsx:17`
- `src/widgets/Skeleton.tsx:24`
- `src/widgets/TaskCard.tsx:18`
- `src/widgets/TaskCard.tsx:49`
- `src/widgets/TaskDetailPanel.tsx:66`
- `src/widgets/TaskDetailPanel.tsx:128`

### 5. [À REVOIR] `high-complexity`, 37 occurrence(s)

High cyclomatic complexity: 15 (max 10) — simplify branching or extract helpers

**Fichiers à corriger :**

- `electron/activity/aggregator.ts:37`
- `electron/activity/aggregator.ts:87`
- `electron/activity/export.ts:26`
- `electron/activity/export.ts:114`
- `electron/activity/feedback.ts:44`
- `electron/activity/poll.ts:147`
- `electron/activity/segmentUtils.ts:26`
- `electron/activity/tracker.ts:188`
- `electron/activity/tracker.ts:262`
- `electron/activity/win32.ts:117`
- `electron/activityContext.ts:108`
- `electron/activityContext.ts:134`
- `electron/activityContext.ts:160`
- `electron/activityContext.ts:256`
- `electron/activityMediaBridge.ts:215`
- `electron/activityMediaBridge.ts:262`
- `electron/config.ts:107`
- `electron/focusSession.ts:113`
- `electron/focusSession.ts:364`
- `electron/main.ts:284`
- `electron/main.ts:995`
- `electron/main.ts:1051`
- `electron/notion.ts:78`
- `electron/notion.ts:154`
- `electron/notion.ts:458`
- `electron/notion.ts:510`
- `electron/notion.ts:633`
- `electron/notion.ts:673`
- `electron/notion.ts:751`
- `electron/notion.ts:809`
- `electron/notion.ts:905`
- `electron/system.ts:226`
- `electron/widgetUpdates.ts:60`
- `electron/widgetUpdates.ts:166`
- `electron/widgetUpdates.ts:363`
- `electron/widgets/discoverExternal.ts:40`
- `extensions/lattice-media/content.js:23`

### 6. [À REVOIR] `loose-equality`, 31 occurrence(s)

Égalité faible (== / !=) — effectue une coercition de type source de bugs subtils ; utilise === / !==

**Fichiers à corriger :**

- `electron/activity/export.ts:127`
- `electron/activity/win32.ts:70`
- `electron/activity/win32.ts:90`
- `electron/activity/win32.ts:94`
- `electron/focusSession.ts:353`
- `electron/main.ts:302`
- `electron/main.ts:423`
- `electron/notion.ts:132`
- `electron/notion.ts:136`
- `electron/notion.ts:644`
- `electron/notion.ts:651`
- `electron/notion.ts:655`
- `electron/notion.ts:659`
- `electron/notion.ts:893`
- `electron/system.ts:84`
- `electron/system.ts:131`
- `electron/system.ts:236`
- `electron/system.ts:296`
- `electron/system.ts:324`
- `electron/system.ts:325`
- `electron/system.ts:338`
- `electron/system.ts:374`
- `electron/widgetUpdates.ts:131`
- `src/widgets/CalendarWidget.tsx:342`
- `src/widgets/CatalogWidget.tsx:216`
- `src/widgets/MonitorWidget.tsx:11`
- `src/widgets/MonitorWidget.tsx:115`
- `src/widgets/MonitorWidget.tsx:119`
- `src/widgets/MonitorWidget.tsx:122`
- `src/widgets/MonitorWidget.tsx:157`
- `src/widgets/TaskDetailPanel.tsx:378`

### 7. [À REVOIR] `empty-catch`, 29 occurrence(s)

Empty catch block — the error is swallowed silently; log it, handle it, or rethrow

**Fichiers à corriger :**

- `electron/activity/classifier.ts:32`
- `electron/activity/storage.ts:159`
- `electron/activity/storage.ts:178`
- `electron/activity/win32.ts:83`
- `electron/activity/win32.ts:111`
- `electron/activityMediaBridge.ts:68`
- `electron/config.ts:142`
- `electron/focusSession.ts:104`
- `electron/focusSession.ts:260`
- `electron/focusSession.ts:277`
- `electron/focusSession.ts:288`
- `electron/main.ts:254`
- `electron/notify.ts:22`
- `electron/system.ts:104`
- `electron/system.ts:159`
- `electron/system.ts:176`
- `electron/system.ts:190`
- `electron/system.ts:196`
- `electron/system.ts:300`
- `electron/system.ts:316`
- `electron/system.ts:344`
- `electron/widgetUpdates.ts:213`
- `extensions/lattice-media/background.js:223`
- `extensions/lattice-media/background.js:227`
- `extensions/lattice-media/content.js:17`
- `extensions/lattice-media/content.js:26`
- `extensions/lattice-media/content.js:47`
- `extensions/lattice-media/content.js:55`
- `extensions/lattice-media/content.js:74`

### 8. [À REVOIR] `function-too-long`, 26 occurrence(s)

Function is too long: 101 logical lines (max 50) — split it into smaller units

**Fichiers à corriger :**

- `electron/activity/aggregator.ts:87`
- `electron/activity/classifier.ts:39`
- `electron/activity/export.ts:26`
- `electron/activity/feedback.ts:44`
- `electron/activity/poll.ts:147`
- `electron/activity/win32.ts:117`
- `electron/activityContext.ts:160`
- `electron/activityMediaBridge.ts:262`
- `electron/config.ts:107`
- `electron/focusSession.ts:364`
- `electron/main.ts:284`
- `electron/main.ts:907`
- `electron/main.ts:1051`
- `electron/notion.ts:258`
- `electron/notion.ts:809`
- `electron/notion.ts:905`
- `electron/trayMenu.ts:38`
- `electron/trayMenu.ts:59`
- `electron/updates.ts:36`
- `electron/widgetUpdates.ts:226`
- `electron/widgetUpdates.ts:287`
- `electron/widgetUpdates.ts:363`
- `electron/widgets/discoverExternal.ts:40`
- `extensions/lattice-media/content.js:4`
- `src/widgets/CatalogWidget.tsx:705`
- `src/widgets/TaskCard.tsx:18`

### 9. [À REVOIR] `high-cognitive-complexity`, 22 occurrence(s)

High cognitive complexity: 19 (max 15) — the flow is hard to follow; flatten the nesting with guard clauses and extract the branches

**Fichiers à corriger :**

- `electron/activity/aggregator.ts:37`
- `electron/activity/aggregator.ts:87`
- `electron/activity/export.ts:26`
- `electron/activity/feedback.ts:44`
- `electron/activity/poll.ts:147`
- `electron/activityContext.ts:160`
- `electron/activityMediaBridge.ts:262`
- `electron/config.ts:107`
- `electron/focusSession.ts:364`
- `electron/main.ts:284`
- `electron/main.ts:1051`
- `electron/notion.ts:122`
- `electron/notion.ts:458`
- `electron/notion.ts:633`
- `electron/notion.ts:673`
- `electron/notion.ts:751`
- `electron/notion.ts:809`
- `electron/widgetUpdates.ts:60`
- `electron/widgetUpdates.ts:166`
- `electron/widgetUpdates.ts:363`
- `electron/widgets/discoverExternal.ts:40`
- `extensions/lattice-media/content.js:23`

### 10. [À REVOIR] `unhandled-promise`, 17 occurrence(s)

Promesse non gérée : .then() sans .catch (ni await dans un try/catch) — une rejection non capturée remonte en unhandledRejection et peut faire tomber le process ; ajoute un .catch ou await l'appel

**Fichiers à corriger :**

- `electron/main.ts:1317`
- `electron/main.ts:1353`
- `src/widgets/ActivityWidget.tsx:176`
- `src/widgets/ActivityWidget.tsx:178`
- `src/widgets/ActivityWidget.tsx:181`
- `src/widgets/ActivityWidget.tsx:184`
- `src/widgets/ActivityWidget.tsx:223`
- `src/widgets/ActivityWidget.tsx:225`
- `src/widgets/CatalogWidget.tsx:193`
- `src/widgets/CatalogWidget.tsx:194`
- `src/widgets/CatalogWidget.tsx:195`
- `src/widgets/CatalogWidget.tsx:720`
- `src/widgets/CatalogWidget.tsx:723`
- `src/widgets/CatalogWidget.tsx:726`
- `src/widgets/FocusInterruptWidget.tsx:10`
- `src/widgets/FocusInterruptWidget.tsx:12`
- `src/widgets/MonitorWidget.tsx:187`

### 11. [À REVOIR] `redundant-boolean`, 11 occurrence(s)

Redundant boolean literal — use the condition directly (`if (x)`, `return cond`) instead of comparing to or returning true/false

**Fichiers à corriger :**

- `electron/config.ts:123`
- `electron/config.ts:211`
- `electron/config.ts:220`
- `electron/main.ts:352`
- `electron/updates.ts:48`
- `electron/updates.ts:120`
- `electron/updates.ts:132`
- `electron/widgetUpdates.ts:229`
- `electron/widgetUpdates.ts:261`
- `extensions/lattice-media/popup.js:20`
- `extensions/lattice-media/popup.js:31`

### 12. [À REVOIR] `io-in-loop`, 11 occurrence(s)

I/O dans une boucle (await / requête réseau ou DB) — sérialise les appels (N+1) ; batche-les ou parallélise (Promise.all)

**Fichiers à corriger :**

- `electron/notion.ts:389`
- `electron/notion.ts:389`
- `electron/notion.ts:490`
- `electron/notion.ts:524`
- `electron/system.ts:292`
- `electron/system.ts:337`
- `electron/widgetUpdates.ts:95`
- `electron/widgetUpdates.ts:95`
- `electron/widgetUpdates.ts:102`
- `electron/widgetUpdates.ts:397`
- `extensions/lattice-media/background.js:219`

### 13. [À REVOIR] `no_unused_vars`, 11 occurrence(s)

Unused variable 'isTodayRow' — remove it or prefix with '_'

**Fichiers à corriger :**

- `src/widgets/CalendarWidget.tsx:557`
- `src/widgets/CatalogWidget.tsx:216`
- `src/widgets/CatalogWidget.tsx:836`
- `src/widgets/CatalogWidget.tsx:942`
- `src/widgets/CatalogWidget.tsx:943`
- `src/widgets/FocusInterruptWidget.tsx:48`
- `src/widgets/MonitorWidget.tsx:115`
- `src/widgets/MonitorWidget.tsx:116`
- `src/widgets/MonitorWidget.tsx:121`
- `src/widgets/TaskCard.tsx:29`
- `src/widgets/TasksWidget.tsx:44`

### 14. [À REVOIR] `quadratic-loop`, 7 occurrence(s)

Boucle imbriquée (O(n²)) — indexe la collection interne dans un Map/Set pour une recherche en O(1)

**Fichiers à corriger :**

- `electron/activity/export.ts:146`
- `electron/migrate.ts:28`
- `electron/notion.ts:396`
- `electron/notion.ts:491`
- `electron/notion.ts:530`
- `extensions/lattice-media/background.js:50`
- `tools/cpu-temp/Program.cs:60`

### 15. [À REVOIR] `max_file_lines`, 7 occurrence(s)

File too long: 1380 lines (max 500)

**Fichiers à corriger :**

- `electron/main.ts:1`
- `electron/notion.ts:1`
- `src/styles.css:1`
- `src/widgets/ActivityWidget.tsx:1`
- `src/widgets/CalendarWidget.tsx:1`
- `src/widgets/CatalogWidget.tsx:1`
- `src/widgets/TaskDetailPanel.tsx:1`

### 16. [À REVOIR] `no_debug_print`, 6 occurrence(s)

Avoid leaving debug print statements in production code

**Fichiers à corriger :**

- `electron/activityMediaBridge.ts:364`
- `electron/migrate.ts:37`
- `scripts/export-brand-assets.mjs:21`
- `scripts/export-brand-assets.mjs:41`
- `tools/active-url/Program.cs:34`
- `tools/active-url/Program.cs:40`

### 17. [À REVOIR] `long-line`, 3 occurrence(s)

Line too long: 124 chars (max 120)

**Fichiers à corriger :**

- `electron/activity/win32.ts:53`
- `electron/main.ts:410`
- `shared/types.ts:5`

### 18. [À REVOIR] `commented-out-code`, 3 occurrence(s)

Commented-out code — delete it (version control keeps the history)

**Fichiers à corriger :**

- `electron/notion.ts:859`
- `shared/types.ts:291`
- `shared/types.ts:444`

### 19. [À REVOIR] `too-many-params`, 2 occurrence(s)

Too many parameters: 6 (max 4) — group related arguments into an object/struct

**Fichiers à corriger :**

- `electron/activity/classifier.ts:39`
- `src/widgets/ActivityWidget.tsx:387`

### 20. [À REVOIR] `insecure-temp-path`, 2 occurrence(s)

Chemin temporaire prévisible (/tmp/…) — utilise une API qui crée un fichier unique (mkstemp / NamedTemporaryFile / os.CreateTemp / Files.createTempFile)

**Fichiers à corriger :**

- `electron/activity/test/electron-mock.ts:2`
- `electron/activity/test/electron-mock.ts:3`

### 21. [À REVOIR] `regex-injection`, 1 occurrence(s)

Regex compiled from a non-literal source — untrusted input can cause ReDoS or regex injection; validate the input or use a fixed pattern (and a matching timeout / RE2)

**Fichiers à corriger :**

- `electron/activity/classifier.ts:28`

### 22. [À REVOIR] `permissive_cors`, 1 occurrence(s)

Permissive CORS: Access-Control-Allow-Origin set to '*' or origin reflected — restrict to an explicit allowlist of trusted origins

**Fichiers à corriger :**

- `electron/activityMediaBridge.ts:95`

### 23. [À REVOIR] `deep-nesting`, 1 occurrence(s)

Nesting too deep: 5 levels (max 4) — extract helpers or use early returns / guard clauses

**Fichiers à corriger :**

- `electron/config.ts:107`

### 24. [À REVOIR] `unused-import`, 1 occurrence(s)

Unused import 'formatFrShortDate' — remove it

**Fichiers à corriger :**

- `src/widgets/TasksWidget.tsx:2`

### 25. [INFO] `unused-export`, 18 occurrence(s)

Export `buildQuality` jamais importé ailleurs

**Fichiers à corriger :**

- `electron/activity/aggregator.ts:37`
- `electron/activity/aggregator.ts:71`
- `electron/activity/poll.ts:89`
- `electron/activity/storage.ts:44`
- `electron/activity/storage.ts:108`
- `electron/activityContext.ts:108`
- `electron/activityContext.ts:231`
- `electron/activityMediaBridge.ts:19`
- `electron/activityMediaBridge.ts:20`
- `electron/activityMediaBridge.ts:215`
- `electron/focusSession.ts:81`
- `electron/system.ts:49`
- `electron/system.ts:169`
- `electron/system.ts:354`
- `electron/widgetUpdates.ts:114`
- `electron/widgets/discoverExternal.ts:117`
- `src/widgets/Skeleton.tsx:4`
- `src/widgets/registry.tsx:14`

### 26. [INFO] `outdated-dependency`, 13 occurrence(s)

@types/react-dom (^18.3.5) obsolète · maj: 19.2.4 · doc: https://www.npmjs.com/package/@types/react-dom

**Fichiers à corriger :**

- `package.json`
- `package.json`
- `package.json`
- `package.json`
- `package.json`
- `package.json`
- `package.json`
- `package.json`
- `package.json`
- `package.json`
- `package.json`
- `package.json`
- `package.json`

### 27. [INFO] `nested-ternary`, 6 occurrence(s)

Ternaire imbriqué — logique conditionnelle difficile à lire ; extrais une fonction ou un if/else explicite

**Fichiers à corriger :**

- `electron/activity/feedback.ts:128`
- `electron/activity/poll.ts:236`
- `electron/main.ts:423`
- `electron/notion.ts:579`
- `electron/notion.ts:581`
- `src/widgets/ActivityWidget.tsx:356`

### 28. [INFO] `magic-number`, 5 occurrence(s)

Nombre magique dans une comparaison — extrais-le dans une constante nommée pour expliquer sa signification

**Fichiers à corriger :**

- `electron/activity/tracker.ts:209`
- `electron/activity/tracker.ts:211`
- `electron/system.ts:222`
- `electron/system.ts:241`
- `electron/system.ts:266`

### 29. [INFO] `feature-envy`, 1 occurrence(s)

Chaîne d'accès profonde a.b.c.d.e (feature envy / loi de Déméter) — ce code dépend trop de la structure interne d'autres objets ; déplace la logique près des données ou expose une méthode dédiée

**Fichiers à corriger :**

- `src/widgets/ActivityWidget.tsx:680`

### 30. [INFO] `mvc`, 1 occurrence(s)

Mélange des couches MVC — persistance ou présentation dans la logique applicative ; isole l'accès aux données (modèle) et le rendu (vue) hors du contrôleur

**Fichiers à corriger :**

- `src/widgets/ActivityWidget.tsx:797`

---

_Skill généré par Async Herald · herald.codes · sans IA, aucun code stocké._
# Identité visuelle Lattice

[English](../en/brand.md) · [Français](../fr/brand.md)

> Direction artistique officielle — logo, palette, typographie, assets. À respecter pour toute contribution UI ou marketing.

Retour au [README doc](README.md) · [README projet](../../README.fr.md).

## Nom

| Usage | Valeur |
| --- | --- |
| Marque utilisateur | **Lattice** |
| Package npm / process | `lattice-desk` |
| `appId` | `com.vakz.lattice-desk` |

Ne pas réintroduire l’ancien nom `windows-widgets` dans l’UI ou les assets de marque.

## Concept

Lattice = structure composable (widgets sur le bureau). Le symbole est une **grille 3×3 de tuiles** reliées par un maillage (horizontal, vertical, diagonales). La tuile centrale porte l’**accent rouge** (`#e03e3e`) : point focal « actif ».

## Logo

### Fichiers sources

| Fichier | Rôle |
| --- | --- |
| [`assets/brand/logo.svg`](../../assets/brand/logo.svg) | Symbole seul (fond transparent) |
| [`assets/brand/logo-full.svg`](../../assets/brand/logo-full.svg) | Symbole + wordmark « Lattice » |
| [`assets/brand/icon.svg`](../../assets/brand/icon.svg) | Icône app (fond `#191919`, coins arrondis) |
| [`assets/brand/tray.svg`](../../assets/brand/tray.svg) | Variante simplifiée systray |
| [`assets/brand/banner.svg`](../../assets/brand/banner.svg) / [`banner.png`](../../assets/brand/banner.png) | Bannière README (~1280×400) |
| [`assets/brand/social.svg`](../../assets/brand/social.svg) / [`social.png`](../../assets/brand/social.png) | Social preview (1280×640) |

Exports app : `assets/icon.png`, `assets/icon.ico`, `assets/tray.png`, `assets/tray-16.png`.  
Régénération : `node scripts/export-brand-assets.mjs` (nécessite `sharp` et `to-ico` en local).

### Règles d’usage

- **Fond préféré** : sombre (`#191919` ou plus foncé). Sur fond clair, placer le symbole dans un pavé sombre arrondi (comme `icon.svg`).
- **Taille minimale** : symbole ≥ 24 px ; tray 16 px = variante `tray.svg` uniquement.
- **Ne pas** déformer, recolorer hors palette, ajouter d’ombre / glow non documentés, ni réutiliser l’ancien calendrier + coche.
- **Wordmark** : « Lattice », casing title case, police Segoe UI Variable / Segoe UI / IBM Plex Sans, poids 600.

## Palette

Alignée sur les tokens CSS de [`src/styles.css`](../../src/styles.css).

| Token | Hex / valeur | Usage |
| --- | --- | --- |
| `--bg` | `#191919` | Fond widgets / Electron |
| `--bg-elevated` | `#252525` | Surfaces surélevées |
| `--bg-card` | `#2f2f2f` | Cartes tâches |
| `--bg-hover` | `#383838` / `#2c2c2c` | Survols cartes / lignes |
| `--border` | `#3a3a3a` | Bordures shell |
| `--text` | `#f1f1ef` | Texte principal |
| `--muted` | `#9b9a97` | Labels, métadonnées |
| `--accent` | `#e03e3e` | Aujourd’hui, focus marque |
| `--divider` | `rgba(255,255,255,0.06)` | Séparateurs |
| `--hover-bg` | `rgba(255,255,255,0.06)` | Hover contrôles |
| `--danger-bg` | `rgba(224,62,62,0.12–0.15)` | Badge démo / erreurs |
| `--danger-text` | `#ff8f8f` / `#ffb4b4` | Texte danger |
| `--status-ok` | `#7dba95` | Jauges Monitor OK |
| `--status-warn` | `#d4a35c` | Jauges warn |
| `--status-hot` | `#d96b5c` | Jauges hot |
| `--status-live` | `#6fbf8f` | Point « live » |

Couleurs de tags Notion : voir mapping dans le code (`NOTION_COLORS`) — ne pas les traiter comme couleurs de marque.

## Typographie

```css
--font: "Segoe UI Variable", "Segoe UI", "IBM Plex Sans", sans-serif;
```

- En-têtes widgets : 13 px, uppercase, letter-spacing 0.02 em, `--muted`
- Corps : 13 px, `--text`
- Titres détail / Monitor : 18–20 px, weight 600

## Géométrie

| Token | Valeur | Usage |
| --- | --- | --- |
| `--radius-shell` | `14px` | Coque widget |
| `--radius-monitor` | `18px` | Flyout Monitor |
| `--radius-card` | `10–12px` | Cartes / lignes |
| `--radius-control` | `8px` | Boutons icône |
| `--radius-pill` | `999px` | Tags, pastilles |

Bordure shell : `1px solid var(--border)`. Ombre Monitor : `0 18px 40px rgba(0,0,0,0.45)`.

## Où brancher les assets

| Contexte | Fichier |
| --- | --- |
| Icône Windows / electron-builder | `assets/icon.png` |
| Raccourcis Bureau | `assets/icon.ico` (via `scripts/creer-raccourcis.ps1`) |
| Systray | `assets/tray.png` → `tray-16.png` → `icon.png` |
| Header README | `assets/brand/banner.png` |
| Social preview GitHub | Uploader `assets/brand/social.png` dans **Settings → General → Social preview** (GitHub ne lit pas le fichier automatiquement) |

## Do / Don’t

**Do**

- Utiliser la grille lattice comme seule marque
- Rester sur la palette sombre documentée
- Centraliser les nouvelles couleurs dans `:root` de `styles.css` + cette page

**Don’t**

- Réintroduire calendrier, coche, ou pictos génériques « tâches »
- Accent violet / dégradés marketing hors DA
- Cards / glassmorphism sur les surfaces marketing hors Monitor (qui a déjà ses dégradés radiaux discrets)

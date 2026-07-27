# Lattice brand identity

[English](../en/brand.md) · [Français](../fr/brand.md)

> Official art direction — logo, palette, typography, assets. Follow this for any UI or marketing work.

Back to [docs README](README.md) · [project README](../../README.md).

## Name

| Use | Value |
| --- | --- |
| User-facing brand | **Lattice** |
| npm package / process | `lattice-desk` |
| `appId` | `com.vakz.lattice-desk` |

Do not reintroduce the legacy name `windows-widgets` in UI or brand assets.

## Concept

Lattice = composable structure (desktop widgets). The mark is a **3×3 grid of tiles** linked by a mesh (horizontal, vertical, diagonals). The center tile carries the **red accent** (`#e03e3e`): the active focal point.

## Logo

### Source files

| File | Role |
| --- | --- |
| [`assets/brand/logo.svg`](../../assets/brand/logo.svg) | Mark only (transparent background) |
| [`assets/brand/logo-full.svg`](../../assets/brand/logo-full.svg) | Mark + « Lattice » wordmark |
| [`assets/brand/icon.svg`](../../assets/brand/icon.svg) | App icon (`#191919` fill, rounded corners) |
| [`assets/brand/tray.svg`](../../assets/brand/tray.svg) | Simplified tray variant |
| [`assets/brand/banner.svg`](../../assets/brand/banner.svg) / [`banner.png`](../../assets/brand/banner.png) | README banner (~1280×400) |
| [`assets/brand/social.svg`](../../assets/brand/social.svg) / [`social.png`](../../assets/brand/social.png) | Social preview (1280×640) |

App exports: `assets/icon.png`, `assets/icon.ico`, `assets/tray.png`, `assets/tray-16.png`.  
Regenerate: `node scripts/export-brand-assets.mjs` (requires local `sharp` and `to-ico`).

### Usage rules

- **Preferred background**: dark (`#191919` or darker). On light backgrounds, place the mark on a dark rounded plate (as in `icon.svg`).
- **Minimum size**: mark ≥ 24 px; 16 px tray = `tray.svg` only.
- **Do not** distort, recolor outside the palette, add undocumented glow/shadow, or reuse the old calendar + checkmark.
- **Wordmark**: « Lattice », title case, Segoe UI Variable / Segoe UI / IBM Plex Sans, weight 600.

## Palette

Aligned with CSS tokens in [`src/styles.css`](../../src/styles.css).

| Token | Hex / value | Use |
| --- | --- | --- |
| `--bg` | `#191919` | Widget / Electron background |
| `--bg-elevated` | `#252525` | Elevated surfaces |
| `--bg-card` | `#2f2f2f` | Task cards |
| `--bg-hover` | `#383838` / `#2c2c2c` | Card / row hovers |
| `--border` | `#3a3a3a` | Shell borders |
| `--text` | `#f1f1ef` | Primary text |
| `--muted` | `#9b9a97` | Labels, metadata |
| `--accent` | `#e03e3e` | Today marker, brand focus |
| `--divider` | `rgba(255,255,255,0.06)` | Separators |
| `--hover-bg` | `rgba(255,255,255,0.06)` | Control hovers |
| `--danger-bg` | `rgba(224,62,62,0.12–0.15)` | Demo badge / errors |
| `--danger-text` | `#ff8f8f` / `#ffb4b4` | Danger text |
| `--status-ok` | `#7dba95` | Monitor gauges OK |
| `--status-warn` | `#d4a35c` | Monitor warn |
| `--status-hot` | `#d96b5c` | Monitor hot |
| `--status-live` | `#6fbf8f` | Live dot |

Notion tag colors: see `NOTION_COLORS` in code — not brand colors.

## Typography

```css
--font: "Segoe UI Variable", "Segoe UI", "IBM Plex Sans", sans-serif;
```

- Widget headers: 13 px, uppercase, letter-spacing 0.02 em, `--muted`
- Body: 13 px, `--text`
- Detail / Monitor titles: 18–20 px, weight 600

## Geometry

| Token | Value | Use |
| --- | --- | --- |
| `--radius-shell` | `14px` | Widget shell |
| `--radius-monitor` | `18px` | Monitor flyout |
| `--radius-card` | `10–12px` | Cards / rows |
| `--radius-control` | `8px` | Icon buttons |
| `--radius-pill` | `999px` | Tags, dots |

Shell border: `1px solid var(--border)`. Monitor shadow: `0 18px 40px rgba(0,0,0,0.45)`.

## Where assets plug in

| Context | File |
| --- | --- |
| Windows / electron-builder icon | `assets/icon.png` |
| Desktop shortcuts | `assets/icon.ico` (via `scripts/creer-raccourcis.ps1`) |
| System tray | `assets/tray.png` → `tray-16.png` → `icon.png` |
| README header | `assets/brand/banner.png` |
| GitHub social preview | Upload `assets/brand/social.png` under **Settings → General → Social preview** (GitHub does not auto-read the file) |

## Do / Don’t

**Do**

- Use the lattice grid as the only brand mark
- Stay on the documented dark palette
- Centralize new colors in `:root` of `styles.css` + this page

**Don’t**

- Bring back calendar, checkmark, or generic “tasks” pictograms
- Purple accents / marketing gradients outside the DA
- Cards / glassmorphism on marketing surfaces outside Monitor (which already has subtle radial gradients)

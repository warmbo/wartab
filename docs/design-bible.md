# WarTab — Design Bible

**Status:** Authoritative design specification · **Canonical page:** Dashboard
**Scope:** Every surface (dashboard, card modules, slide-panels, ux-surfaces, modals, dialogs, 404) must conform.
**Owner:** Cody / Hermes-agent · **Last updated:** 2026-08-23

This document is the single source of truth for WarTab's visual system. It is a
**specification**, not a screenshot description. When a page or component
disagrees with this document, the document wins — change the page.

The reference implementation is the **Dashboard page**: the top-bar application
shell plus the `#card-grid` body. Every other surface derives its structure from it.

---

## 1. Application Shell

The Dashboard is the canonical shell. All surfaces inherit its tokens, geometry,
and rhythm.

| Rule | Value | Token / class |
|------|-------|---------------|
| Root background | dark neutral `#090a0c` | `--surface-page` |
| App container | `margin: 0 auto` | `#app` |
| App top spacing | `var(--space-5)` = **24px** | `#app padding-top` |
| App bottom clearance | **80px** | `--footer-clearance` |
| Max content width | fluid (page-cols grid, no hard cap) | `#card-grid` |
| Top-bar | full-width glass strip, radius `var(--card-radius)` | `#top-bar` |
| Top-bar height | content-driven, scaled by `--topbar-scale` | — |
| Top-bar → grid gap | **24px** (desktop) | `#top-bar margin-bottom` |
| Footer | single muted line, fixed clearance | `#footer` |

### Top bar anatomy (left → right)

```
[ Brand ] [ page-tabs ········ ] [ Command ▾ ] [ System ▾ ] [ Undo Redo Add ⋮ ]
```

- **Brand** — icon + title, 700 weight, left-most.
- **page-tabs** — page switcher, flex-1 center-left, `.page-tab` pills.
- **Command** — `.command-trigger`, always visible (opens command palette).
- **System** — `.telemetry-disclosure`, collapses to hidden <1100px.
- **Actions** — `#top-actions`: undo/redo (icon), **Add** (primary), **⋯** overflow.

**Primary action** (Add) always lives in the upper-right action cluster.
Destructive actions never occupy this position.

### Top-bar accent
A **3px accent rule** sits flush at the top of the bar (`#top-bar::before`), the
single brand accent bar of the shell.

---

## 2. Page Anatomy

Every page follows:

```
Application shell (top-bar + footer)
└── Card grid (#card-grid)
    ├── Card → Header (icon + title · actions)
    │        └── Body (one or more sections)
    └── ...cards
```

There is **no per-page container** — pages are flat grids of modules sharing the
global column grid. There is no custom per-page header; the top-bar IS the header
for every page. Page-specific layout (custom width, custom margins, bespoke
headers) is forbidden except by documented exception.

---

## 3. Master Grid

| Rule | Value |
|------|-------|
| Grid | CSS Grid, `repeat(var(--grid-cols), 1fr)` |
| Column count (`--grid-cols`) | Desktop **4** · tablet **2** · mobile **1** |
| Gap (`--grid-gap`) | **16px** (clamped per breakpoint) |
| Row minimum | `minmax(140px, auto)` |
| Module widths | **integer spans only** (`span N`), N ∈ 1..cols |

A card spans `min(its width, cols)` columns and `min(height, 4)` rows. Widths and
heights are set **manually by the user** — the grid never auto-spans or reflows by
content. Modules snap to integer grid units; never fractional or pixel widths.

---

## 4. Spacing System

One scale drives everything. There are **no arbitrary near-miss values** (no 20/21/22/23px).

| Step | Value | Token |
|------|-------|-------|
| 1 | **4px** | `--space-1` |
| 2 | **8px** | `--space-2` |
| 3 | **12px** | `--space-3` |
| 4 | **16px** | `--space-4` |
| 5 | **24px** | `--space-5` |
| 6 | **32px** | `--space-6` |

### Rhythm map

| Gap | Value |
|-----|-------|
| Page top offset | `--space-5` (24px) |
| Top-bar → content | `--space-5` (24px) |
| Card → card | `--grid-gap` (16px) |
| Card header → body | `--space-3` (12px) padding |
| Card header padding | `--space-3` × `--card-inline`(16px) |
| Panel body top/bottom | 20px / 28px (slide), 20px / 26px (surface) |
| Field → field | `--space-4` (16px) |
| Label → input | `--space-2` (8px) |

---

## 5. Color Hierarchy

Dark-neutral surfaces, crisp borders, one accent, semantic status colors.

| Role | Value | Token |
|------|-------|-------|
| Text primary | `rgba(255,255,255,.92)` | `--text-primary` |
| Text secondary | `rgba(255,255,255,.60)` | `--text-secondary` |
| Text tertiary / muted | `rgba(255,255,255,.48)` | `--text-tertiary` / `--text-muted` |
| Accent | theme-driven, default `#888` | `--accent` (+ `--accent-glass`, `--accent-glow`) |
| Error / Warning / Success | `#cc6666 / #cccc99 / #66cc99` | `--color-*`, `--status-*` |
| Card surface | `rgba(255,255,255,.06)` | `--card-bg` |
| Border | `rgba(255,255,255,.12)` | `--surface-border` / `--glass-border` |

**Status semantics** are always the shared vocabulary: Healthy / Warning /
Degraded / Offline / Unknown / Loading / Stale — never invented synonyms.

---

## 6. Radius & Borders

| Rule | Value |
|------|-------|
| Surface radius (`--radius`) | `--radius-md` = **8px** (themed via `--card-radius`) |
| Control radius (`--control-radius`) | `--radius-sm` = **4px** |
| Small / medium / large | **4 / 8 / 16px** |
| Card / top-bar | `var(--card-radius)` |
| Slide-panel (desktop) | no rounding (flush right edge); mobile sheet rounds `--radius-lg` top |
| Modal / ux-surface | `--radius` |

Borders are `1px` `--surface-border`. Glass surfaces add an inset bevel
(`--bevel-light`) and drop shadow (`--glass-shadow`).

---

## 7. Typography

Family `Inter` (body) + `JetBrains Mono` (mono). Compact ramp:

| Step | Token | Default px |
|------|-------|-----------|
| meta / eyebrow | `--text-3xs` | 10px |
| label | `--text-2xs`/`--type-label` | 11–12px, uppercase **700** + 0.7px tracking |
| body / UI | `--text-base`/`--type-ui` | 13–14px |
| card title | `--heading-size`/`--type-card-title` | 15px |
| panel title | `--type-panel-title` | 18px |
| section heading | `--type-card-title` | 15px |

**Uppercase eyebrow labels** (700, letter-spaced) identify section/sub-section
titles app-wide — the recurring "eyebrow" motif (`.cp-label`, `.ux-eyebrow`,
`.gallery-section-title`).

---

## 8. Module (Card) System

One universal module structure. All content modules share it — only content differs.

```
Module (.card / .ds-module)
├── Header (.card-header / .ds-module-hdr)
│   ├── icon (16px) + Title (15px, 600)
│   └── actions (right)
├── Body (.card-body / .ds-module-content)
└── optional footer (.ds-module-footer)
```

| Geometry | Value |
|----------|-------|
| Header padding | `space-3` × `card-inline` |
| Body padding | `space-3` `card-inline` `space-4` |
| Card radius | `--card-radius` |
| Card accent | `--card-accent` (per-card, or `--accent`) |

Module sub-structures (stat rows, status rows, freshness, badges, metric bars,
progress rings) come from `design-system.js` (`ds.*`) — single shared implementation.

---

## 9. Shared Layout Primitives

Canonical composition primitives (use these everywhere; don't reinvent):

| Primitive | Implementation |
|-----------|----------------|
| AppShell | `#app` + `#top-bar` + `#footer` (index.html) |
| PageContainer | `#card-grid` |
| PageHeader | `#top-bar` (the global header) |
| PageActions | `#top-actions` |
| ContentGrid | `#card-grid` (integer-span grid) |
| Module | `.card` / `ds.card()` |
| ModuleHeader | `.card-header` / `ds-module-hdr` |
| ModuleBody | `.card-body` / `ds-module-content` |
| Toolbar | `.gallery-tools` / `.layout-toolbar` / `#top-actions` pattern |
| FormSection | `.cp-group`, `meFieldGroup` |
| Modal | `openModal()` (modals.js) |
| SlidePanel | `.slide-panel` (shared shell for Config/Edit/Icon/BG) |
| Surface | `ux-surface` (Card Gallery / Layout / Presets) |
| StatRow | `ds.statRow()` |
| StatusRow | `ds.statusRow()` |
| Icon | `ds.icon()` |

---

## 10. Controls (Dimensions)

Recurring controls share dimensions so adjacent controls line up.

| Control | Height × padding | Token |
|---------|------------------|-------|
| Button (.btn) | ~33px, `7px space-4` | `--text-base` |
| Button sm (.btn-sm) | `space-1 space-2`, 12px | `--text-xs` |
| Icon button (.btn-icon) | ~30px, `space-1 7px` | `--text-lg` |
| Input (.cp-input / .cp-select) | `space-3 14px`, 14px | `--text-base` |
| Page tab | `6px 12px`, 12px | `--text-xs` |
| Toolbar button (layout) | `min-height:34px` | — |
| Table rows / link rows | `5px space-2` | — |

Focus ring: `2px var(--accent)` outline on `:focus-visible`.

---

## 11. Positions (Positional Rules)

- Page title, description, and actions belong to the **top-bar** global header —
  there is no floating per-page title/actions.
- **Primary action** lives in the **upper-right** `#top-actions` cluster (Add).
- **Destructive actions** never occupy the primary position.
- **Tabs** (page tabs / config tabs / icon tabs) sit in their owning bar, directly
  where the user expects them — page tabs in the top-bar, config tabs at the top
  of the config body, icon tabs under the icon-picker header.
- Tables/lists fill their containing module; filters/search live in the module
  toolbar.
- The **accent rule** (3px) tops the top-bar — the one shell accent.

---

## 12. Overlay System

Three surfaces, one grammar (dark backdrop + radius + shadow):

| Surface | Backdrop | Width | Z |
|---------|----------|-------|---|
| Modal (`openModal`) | `modal-overlay`, 0.6 black | `min 320 / max 90vw` | `--z-modal`+40 |
| Slide panel (`.slide-panel`) | `config-overlay` transparent→fade | **520px** (`--panel-width`), right sheet, sheet on mobile | `--z-panel..--z-picker` |
| ux-surface (`ux-surface`) | `ux-overlay`, 0.68 + blur | `min(1120px,100%)`, max `880px`/`100vh-48` | `--z-modal`+30 |

All provide: Esc-to-close, backdrop-click close, `role=dialog` + `aria-modal`,
focus return/focus-in. Escape paths funnel through the shared `openModal()` /
`surface()` / slide-panel mechanisms — no hand-rolled shells.

- **Header** pattern: eyebrow (accent, 10px, 800, 0.16em tracking) → title →
  optional subtitle → close button, for ux-surfaces; title + close for
  slide-panels/modals.
- Mobile: overlays become bottom sheets (slide from bottom, rounded top,
  full-width).

---

## 13. Responsive Boundaries

| Breakpoint | Behavior |
|------------|----------|
| ≤1400px | inline System stat strip collapses to summary |
| ≤1199px | grid → **2 columns** |
| ≤1100px | telemetry disclosure hidden; gallery/preset grids → 2 col |
| ≤768px | grid → **1 column**; top-bar reflows (brand/command/actions row, tabs row below); overlays → bottom sheets; touch targets ≥44px |
| coarse-pointer | touch-friendly min targets |

---

## 14. Motion & Accessibility

- Durations: `--anim-fast 0.15s` · `--anim-normal 0.3s` · `--anim-slow 0.45s`.
- Entrance: subtle fade+rise via `ds.entrance()`.
- Respect `prefers-reduced-motion`.
- Focus visibility everywhere; `:focus-visible` accent outline.
- Interactive targets ≥44px on coarse-pointer / mobile.

---

## 15. Exceptions

Exceptions must be rare and must have a concrete UX reason documented here. When a
page cannot use the standard structure, add it below before diverging.

| Surface | Why it diverges | Where |
|---------|-----------------|-------|
| Keyboard-shortcuts overlay | A data-driven keyboard-reference table (`kbd` cells + grouped rows); its `.shortcuts-*` classes are specialized table anatomy, not a generic modal shell. Still uses `modal-overlay`/`modal-box` + `role=dialog`. | pages.js `showShortcutsOverlay()` |
| Update terminal modal | A live-log terminal surface (persistent polling, disabled Close while running); widens the shared modal shell to 90% and owns the mono `pre` terminal geometry. Funnels through `openModal()` (label + beforeClose). | updates.js `openTerminal()` |

---

## 16. Conformance Checklist (every surface before shipping)

- [ ] Uses the shared shell / tokens (no bespoke colors, spacing, radius).
- [ ] Begins at the same structural coordinate (no shifted title/content start).
- [ ] Header uses the standard anatomy; primary action upper-right.
- [ ] Modules snap to integer grid spans; never auto-reflow cards.
- [ ] Spacing drawn from `--space-*`; no near-miss values.
- [ ] Controls share standard dimensions; tabs/inputs/buttons match.
- [ ] Overlays use the shared modal/surface/slide primitives.
- [ ] Switches between pages without visible layout jump.
- [ ] Silhouette (geometry-only) is recognizable across pages.
- [ ] No page-specific CSS for things the shared system already provides.
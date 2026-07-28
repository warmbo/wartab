# WarTab Aura Bump: Responsive Sizing, Spacing, and Module Cohesion Audit

Date: 2026-07-13
Status: Proposed implementation audit
Scope: page shell, top bar, card grid, card hierarchy, panels, dialogs, all 18 modules, and mobile through ultrawide behavior

## Goal

Raise WarTab's visual aura without redesigning it: retain the sharp-corner glass identity, user-controlled theme/radius/layout/module settings, and framework-free architecture while making the interface feel proportionate, calm, responsive, and intentionally grouped.

The target is not “more decoration.” The target is better rhythm:

- related elements sit closer together;
- unrelated levels gain deliberate separation;
- text and controls scale without becoming oversized;
- modules use the same density, typography, alignment, and height language;
- cards stop creating accidental dead space or crowding;
- mobile, tablet, desktop, and ultrawide layouts each feel composed rather than merely resized.

## Architecture

Keep the existing CSS-variable and `data-mod-*` architecture. Add a semantic fluid sizing layer above the current raw spacing tokens, then migrate the shell and modules to those shared variables. Module revisions should use a small set of archetypes and shared classes rather than adding one-off responsive overrides or replacing the module registry.

No framework, route, storage, config-schema, or module-registry replacement is proposed.

## Audit baseline

### Live desktop measurement

Measured at a 1280 × 577 viewport with:

- base text: 15px;
- configured `--topbar-scale`: 2;
- application width: about 1088px;
- four columns: about 266px per column;
- grid gap: 8px in the live user layout;
- top bar before typography correction: 90px high;
- brand before correction: 34px;
- page tabs before correction: 24px and 56px high;
- body horizontal overflow: none.

The configured 2× top-bar scale had begun multiplying text literally. The immediate correction caps brand text at `--text-xl` and page-tab text at `--text-base` while retaining smaller-scale behavior and configurable icon/control dimensions.

Post-correction at the same settings:

- brand: 20px, down from 34px;
- page tab: 15px, down from 24px;
- top bar: 84px, down from 90px;
- no horizontal overflow.

### Source measurements

- `style.css`: 1,882 lines.
- Fluid `clamp()` usage before this audit: 2 declarations.
- Unique raw pixel values in `style.css`: 74.
- Module `style.cssText` sites: 140 across 14 modules.
- Only weather and clock strongly reference module scaling variables in their own source.
- `render.js:305-330` exposes alignment, density, scale, height, and three typography multipliers to every module, but many modules bypass them with inline sizing.
- Responsive ownership currently centers on ≤380px, ≤768px, and 769–1199px. There is no explicit standard desktop or ultrawide composition tier.

## Severity summary

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 9 | Blocking layout/cascade defects or controls that materially fail |
| P1 | 12 | Major proportional, responsive, or module-system inconsistencies |
| P2 | 8 | Aura and hierarchy improvements with meaningful UX value |
| P3 | 4 | Cleanup and polish opportunities |

## Independent validation addendum

Three independent source/layout audits were run after the initial document was drafted: shell and responsive layout, all-module compliance, and CSS/token ownership. They confirmed the two original P0 findings and added the following blockers. These are release-blocking for the Aura implementation because they are functional defects, not subjective polish.

### AURA-000A — Tablet column rules are currently defeated by inline ownership

Evidence:

- `render.js:20` writes `--grid-cols` directly on `#card-grid`.
- `style.css:1114-1119` attempts to set tablet columns on `:root`.
- An element-local custom property outranks the inherited root value, so a configured four- or six-column grid remains four/six columns from 769–1199px.
- The same conflict affects `grid.style.gap`: mobile/tablet CSS cannot reliably bound the configured gap.
- CSS width-span rules cover only widths 1–4 while configuration allows columns/card widths through 6.

Required correction:

1. JavaScript publishes only `--layout-cols` and `--layout-gap` preference inputs.
2. One final CSS grid layer owns effective `--grid-cols` and `--grid-gap`.
3. Card spans are clamped to the effective responsive column count.
4. Add width 5–6 coverage and verify 769, 1024, and 1199px.

### AURA-000B — Highlighted cards can paint above the edit panel

Evidence:

- Highlighted cards use z-index 105 at `style.css:294-299`.
- The edit panel uses z-index 103 through the token at `style.css:66`.
- A wide/full-width card can therefore intersect and paint over the drawer despite opposite-side placement in `edit-panel.js:58-73`.

Required correction:

- Keep all dashboard content below every panel/overlay layer.
- Use an inset highlight or a preview inside the drawer; do not elevate live page content above modal UI.

### AURA-000C — Mobile branding and the complete action set can overlap

Evidence:

- At mobile widths, all five top-bar actions are absolutely positioned while configurable branding remains in normal flow (`index.html:76-86`, `style.css:1034-1038`).
- Five coarse-pointer controls consume roughly 220px before gaps; a 2× top-bar preference increases pressure further.
- Branding has no reliable reserved width or truncation contract.

Required correction:

- Explicit mobile rows: brand + primary/overflow action, page tabs, then optional status.
- Move lower-priority actions into an overflow control rather than overlaying configurable text.

### AURA-000D — Fixed footer lacks guaranteed content and safe-area clearance

Evidence:

- `#app` starts with an 80px bottom reserve at `style.css:189-190`.
- `render.js:20-27` replaces the app padding with percentage values.
- Mobile later reduces app padding to 8px while the footer remains fixed (`style.css:1005-1018`, `style.css:1032`, `style.css:1102-1106`).

Impact:

- The final card can pass behind the footer.
- Footer, bottom sheet, and transient UI can compete at the bottom edge.

Required correction:

- Prefer a footer in document flow. If fixed behavior remains, define `--footer-clearance` and include it in app, panel, sheet, and safe-area padding.

### AURA-000E — Generated typography can become non-monotonic

Evidence:

- `theme.js:25-38` generates some text tokens by adding/subtracting fixed pixels while `--text-4xl` and `--text-5xl` remain static.
- At body size 10px, `--text-sm` can exceed `--text-base`.
- At body size 28px, generated `--text-3xl` can exceed static 4xl/5xl tokens.
- Heading and body sliders are independent enough to permit a 10px card heading with 28px body content.
- Mutating `documentElement.style.fontSize` adds a second sizing channel beside pixel tokens.

Required correction:

- JavaScript sets user text/heading scale inputs only.
- CSS owns a monotonic semantic type ramp with bounded user multiplication.
- Add extreme-value tests at body/heading settings 10, 14/16, and 28.

### AURA-000F — Module scale and density are mostly dead controls

Evidence:

- `render.js:305-330` publishes `--mod-scale`, data attributes, and typography variables.
- `style.css:418-421` defines separate `--mod-scale-factor` and `--mod-density-factor` values.
- `section-editor.js` uses two additional multiplier sets for preview/editor display.
- Several published variables are never consumed; preview mutates leaf pixel sizes and therefore differs from a real rerender.
- Only Weather materially supports the complete setting contract. Clock, Timer, and Quotes are partial; the remaining modules mostly ignore it.

Required correction:

- Choose one persistent variable contract and use it in shared component tokens.
- Preview and rerender must consume the same variables.
- Remove DOM traversal/direct leaf font mutation from live preview.

### AURA-000G — Selector drift silently breaks advertised controls

Confirmed mismatches:

| Shared selector | Rendered selector/element |
|---|---|
| `.notes-toolbar` | `.notes-tb` |
| `.link-grid-item` | `.link-item` |
| `.link-list-item` | `.link-row` |
| `.search-wrap input` | `.inline-search-wrap input` |
| `.dp-stat-label/.dp-stat-value` | `.dp-stat-lbl/.dp-val` |
| `.git-card-link` | unclassed repository link |
| `.media-card-title` | unclassed media title |
| `.proxmox-card-title` | unclassed Proxmox title |

The generic height selectors are also structurally wrong: the section wrapper itself has `.dropdown-content` and `data-mod-height`, but CSS targets a descendant (`[data-mod-height] .dropdown-content`) at `style.css:432-437`.

Required correction:

- Align shared selectors with production DOM.
- Change height selectors to same-element forms such as `.dropdown-content[data-mod-height="small"]`.
- Add rendered-DOM contract tests so source strings cannot drift silently again.

## Additional independently verified P1 findings

### Drawer cliff around 769px

The 520px drawer pushes only the top bar on desktop. Around 769px, that leaves roughly 200px for brand, tabs, status, and actions; one pixel lower the UI abruptly switches to a bottom sheet. Switch to sheet/overlay behavior near 960px or stop pushing only the header (`style.css:442-453`, `style.css:922-937`, `style.css:1028-1084`).

### Configured zero padding is not preserved

The UI advertises 0–15%, but truthy fallbacks convert zero to two in `config-panel.js:102-103` and `render.js:23,26`. Use finite/nullish validation rather than `|| 2`.

### Percentage block padding scales from width

Vertical percentage padding in `render.js:25-27` is calculated from containing-block width. This produces excessive vertical space on wide screens and makes the configured 15% maximum pathological. Preserve compatibility but map it to a bounded fluid length.

### Late cascade patches defeat customization

`.card-body` has five definitions; `.card-header`, `.card-title`, and `#top-actions` each have four. Late beautification rules reset module typography after module-scale rules—for example Quotes and Timer. Move sizing to one owner and keep polish paint-only.

### Touch-target coverage remains incomplete

The coarse-pointer rule does not cover Notes raw toolbar buttons, link-list rows, Git links, Media `div[role=link]` headers, or the 4px Notes resize separator. Every interactive module primitive needs the same 44px coarse-input contract.

### Progressive disclosure is not implemented

`design-system.js` exposes height helpers, but no audited module calls `ds.showAt()`. Unlimited links, API mappings, media services, and forecast items render at every height. Card height must change information quantity before shrinking text or clipping content.

### Footer, modal, and panel spacing are outside the shared token system

Modals largely use inline structural styles and nonwrapping action rows. Panels jump from a fixed 520px side drawer to full-width sheet behavior. Both should consume the same shell gutter, panel inset, control-target, and safe-area tokens as the page.

## P0 findings

### AURA-001 — Top-bar scaling multiplies layout faster than available width

Evidence:

- `style.css:263-274` scales gaps, padding, text, page tabs, arrows, and icons independently.
- `style.css:227-231` gives telemetry only `max-width: 40%` and hides overflow.
- At the live 2× setting, brand text reached 34px and tabs reached 24px.
- The live top bar has four competing regions: branding, page navigation, telemetry, and five actions.

Impact:

- Text becomes display-sized in utility navigation.
- Tabs and branding consume space needed by telemetry.
- Status values clip rather than degrading gracefully.
- The scale control changes the bar's information architecture, not only its legibility.

Immediate correction:

- Cap brand and tab typography with `clamp()` while retaining the user's scaling setting.

Aura implementation:

1. Split scale into semantic effects:
   - typography uses a damped/capped scale;
   - icons and hit targets use a bounded control scale;
   - spacing uses a narrower fluid range.
2. Model the top bar as brand / navigation / telemetry / actions regions.
3. Add priority classes to telemetry items.
4. At constrained desktop widths, hide low-priority telemetry behind one status disclosure rather than clipping text.
5. Keep action hit areas 40–44px while icons remain 15–18px.

Acceptance:

- No clipped telemetry at 768, 1024, 1280, 1440, or 1920px.
- Top-bar text never exceeds the card-heading hierarchy.
- `topBarScale` 0.5–2.0 remains visibly functional.
- The bar remains a single row when it fits and wraps intentionally when it does not.

### AURA-002 — Grid rows convert module height differences into large dead zones

Evidence:

- `style.css:292` uses `align-items: stretch` and shared grid row tracks.
- `render.js:92-132` maps configured card heights to `grid-row: span N`.
- In the live layout, the long Homelab card establishes very tall tracks; Today, Cat, Notes, and Resources stretch with mostly empty bodies.
- Notes sections appear separated by hundreds of pixels because flex children inherit the stretched card body.

Impact:

- Useful second-row content is pushed far below the fold.
- The page feels unfinished even though each module works.
- Dense and compact modules cannot coexist naturally in one row.

Aura implementation:

1. Preserve explicit card height settings but add `heightMode: auto | rows` at the card level.
2. Default new cards to `auto`; retain `rows` for legacy/configured dashboards.
3. In auto mode, use intrinsic card height and `align-self: start`.
4. Offer a masonry-like layout mode only as an opt-in—not as a silent replacement for the existing grid.
5. Ensure multi-section cards stack content with semantic section gaps rather than `flex: 1` distribution.
6. Provide a “Fit content” action in the card size editor.

Acceptance:

- A short card does not inherit a neighboring long card's visual height in auto mode.
- Existing row-span dashboards retain their current layout until opted in.
- No section is vertically distributed merely to fill a card.

## P1 findings

### AURA-003 — Four columns are too narrow at ordinary desktop widths

Evidence:

- `style.css:292` uses `repeat(var(--grid-cols), 1fr)` without a minimum card width.
- `app.js:75-82` treats column count as a fixed default.
- At 1280px, the live four-column layout produces cards around 266px wide.
- Tablet switches directly to two columns only below 1200px (`style.css:1114-1119`).

Improvement:

- Introduce an adaptive-column option using `repeat(auto-fit, minmax(var(--card-min), 1fr))`.
- Recommended default minimum: `clamp(280px, 24vw, 320px)`.
- Retain fixed-column mode as a user option.
- Allow card width spans to map onto the resolved track count.

### AURA-004 — Page and card spacing lack a fluid hierarchy

Evidence:

- `#app` uses static `var(--space-5)` top padding at `style.css:190` while runtime layout also applies percentage padding.
- The live user grid gap is 8px, visually small against large cards.
- Top-bar margin scales to 48px at 2× while grid gaps remain 8px.
- `style.css` contains 74 unique pixel values and only two fluid clamps.

Improvement:

Create semantic fluid tokens:

- `--page-gutter: clamp(12px, 2.2vw, 36px)`;
- `--page-block-gap: clamp(16px, 2vw, 28px)`;
- `--card-gap: clamp(10px, 1vw, 16px)`;
- `--card-pad-inline: clamp(12px, 1.3vw, 20px)`;
- `--card-pad-block: clamp(10px, 1vw, 16px)`;
- `--section-gap: clamp(14px, 1.3vw, 24px)`;
- `--cluster-gap: clamp(6px, 0.6vw, 10px)`.

Do not make fixed hit targets or tiny labels fluid.

### AURA-005 — The module scaling API exists but most modules bypass it

Evidence:

- `render.js:305-330` publishes module alignment, density, scale, height, and typography variables.
- 14 of 18 modules still use `style.cssText`.
- Media, API Poller, Resource Monitor, Quotes, Git, Timer, Proxmox, Notes, and Image contain repeated fixed padding/gap/font declarations.

Improvement:

- Define shared module primitives for shell, header, row, metric, tile, action row, editor row, media viewport, and state blocks.
- Replace inline fixed geometry with classes consuming `--mod-space-*`, `--mod-font-*`, and `--mod-control-size`.
- Keep dynamic values inline only when they are data: percentages, colors, dimensions explicitly configured by the user, and canvas coordinates.

### AURA-006 — Module scale and density overlap without a clear contract

Current behavior exposes:

- `scale`: small / medium / large;
- `density`: compact / standard / comfortable;
- font scale: title / content / secondary;
- card height: small / medium / large / expanded.

These can multiply one another and create extreme combinations.

Improvement:

- Scale controls visual emphasis and key-value/icon sizes.
- Density controls spacing and information count only.
- Font scale controls typography only.
- Card height controls progressive disclosure only.
- Clamp combined output to minimum readable and maximum hierarchy-safe values.

### AURA-007 — Notes does not form compact visual groups

Evidence:

- `modules/notes.js` has seven inline-style sites and no direct module-variable usage.
- Editors, toolbars, resize handles, counters, and section separation are independently sized.
- In stretched cards, note sections drift apart.

Revised Notes module:

- `.notes-section`: heading → toolbar → editor → metadata/action footer.
- `--module-section-gap` separates notes; no `margin-top:auto` or flex distribution.
- Editor min-height derives from configured rows but is bounded by viewport/card height.
- Compact mode hides secondary metadata; comfortable mode increases editor padding, not empty card height.
- Scale affects editor/body typography and toolbar icon size through shared tokens.

### AURA-008 — Telemetry and data modules underuse available hierarchy

Affected:

- Resource Monitor;
- API Poller;
- Proxmox;
- Media;
- Git;
- LAN Scan.

Common issue:

- labels, values, separators, bars, timestamps, and status indicators use many nearly identical small sizes;
- values do not establish a strong scan line;
- inline styles prevent global scale settings from correcting this consistently.

Revised data module archetype:

- primary metric row: label / value / state;
- optional compact visualization beneath it;
- secondary metadata grouped in a footer cluster;
- tabular numerals and consistent value alignment;
- one divider convention;
- progressive disclosure tied to `data-mod-height`.

### AURA-009 — Responsive coverage has a tablet gap in composition quality

Current tiers:

- tiny: ≤380px;
- mobile: ≤768px;
- tablet: 769–1199px;
- everything above: one desktop model.

Recommended five-tier model:

| Tier | Range | Composition |
|---|---|---|
| Tiny | ≤380px | One column; compact frame; 44px touch targets; hide tertiary content |
| Mobile | 381–767px | One column; bottom-sheet panels; stacked top-bar regions |
| Tablet | 768–1099px | Two adaptive columns; telemetry disclosure; compact panels |
| Desktop | 1100–1599px | Adaptive 3–4 columns based on minimum width |
| Ultrawide | ≥1600px | Max-width canvas; 4–6 tracks; bounded card widths and gutters |

Breakpoints are implementation defaults; container/query behavior should be preferred for modules.

## P2 findings

### AURA-010 — Card-level and section-level hierarchy blend together

Card title, dropdown title, module header, and data label often differ only by a few pixels and opacity.

Adopt four explicit levels:

1. page chrome: brand, page tabs, telemetry;
2. card: card title and edit action;
3. section: collapsible section title and section actions;
4. module content: primary, secondary, metadata.

Each level needs one typography token, one gap token, and one divider rule.

### AURA-011 — Interactive target sizes do not match visual importance

- Coarse-pointer overrides provide 44px targets for selected shared controls.
- Desktop card edit buttons, Cat controls, note controls, and module-specific buttons remain inconsistent.

Improvement:

- icon-only chrome: 36px desktop, 44px touch;
- compact text action: 30–32px desktop, 44px touch;
- primary module action: 36–40px;
- preserve small icons inside larger invisible/quiet hit boxes.

### AURA-012 — Surface levels need a consistent luminance ladder

Define only three main levels:

1. background canvas;
2. card/panel surface;
3. interactive/editor/tile surface.

Internal tiles should not look more elevated than their parent card unless they are interactive. Notes editors need both a fill and border delta. Repeated hardcoded `rgba(0,0,0,0.15)` surfaces should map to one semantic token.

### AURA-013 — Secondary text is often both tiny and faint

Set readability floors:

- ordinary content: no smaller than 13–14px at default scale;
- metadata: 11–12px minimum;
- interactive labels: at least 12px and medium contrast;
- tertiary opacity reserved for timestamps/hints, not values or controls.

### AURA-014 — Card headers need one geometry contract

Standardize:

- consistent inline padding with card body;
- icon box size;
- title baseline and line height;
- edit-action hit box;
- optional subtitle/status placement;
- divider and accent-bar relationship.

### AURA-015 — Background contrast varies too much down the page

The current image is visually active behind upper cards and nearly black lower down. Add a configurable vertical scrim/tint token so card contrast remains stable without flattening the wallpaper.

### AURA-016 — Panels use fixed desktop width instead of fluid constraints

Current shared panel width is 520px at `style.css:443-450`.

Use `width: clamp(360px, 38vw, 560px)` with existing 100vw max, then retain bottom sheets on mobile. Editor form grids should become two-column only when the panel itself has room.

### AURA-017 — Motion and aura should not depend on element translation

Retain the established no-hover-lift contract. Aura should come from border clarity, localized glow, surface contrast, and a small number of short state transitions. Do not add perpetual decorative movement.

## Module compliance and revision matrix

Legend: ✓ materially supports the setting; △ partial/indirect; ✕ ignored or contradicted.

| Module | Align | Density | Scale | Font | Height/mobile | Overall | Main revision |
|---|---:|---:|---:|---:|---:|---|---|
| Weather | ✓ | ✓ | ✓ | ✓ | △ | B+ | Width/height-aware 2/3/5-day forecast disclosure |
| Clock | ✕ | △ | ✓ | ✓ | ✓ | B- | Make alignment explicit; clamp mobile hero size without erasing scale |
| Timer | △ | ✓ | ✕ | △ | ✕ | C+ | Shared hero/action/footer rhythm; height-gate detail |
| Quotes | △ | ✓ | ✕ | ✓ | ✕ | C+ | Scale ornament and clamp quote lines by available height |
| API Poller | ✕ | ✓ | ✕ | △ | ✕ | C- | Standard stat list; show 2–3 mappings before disclosure |
| Search | △ | ✕ | ✕ | ✕ | △ | C- | Correct selector drift; shared input/action sizing; hide metadata when small |
| LAN Scan | ✕ | ✓ | ✕ | △ | △ | C- | Count-first responsive table with bounded scroll at larger heights |
| Links | ✕ | ✕ | ✕ | ✕ | △ | D+ | Container-derived columns; no font shrinking; 44px list rows |
| Link List | ✕ | ✕ | ✕ | ✕ | △ | D | Normalize to Links `mode:list` rather than a separate implementation |
| Image | △ | ✕ | ✕ | ✕ | △ | D+ | Responsive contain/cover media viewport and shared states |
| Iframe | ✕ | ✕ | ✕ | N/A | △ | D | Fill allocated module area; configured height cannot override card ownership |
| ASCII Animation | ✕ | ✕ | ✕ | ✕ | ✓ | D+ | Scale glyph preference/inset while retaining ResizeObserver behavior |
| Resource Monitor | ✕ | ✕ | ✕ | ✕ | △ | D | Height-gated telemetry; derived graph/ring/bar geometry |
| Digital Pet | ✕ | △ | ✕ | ✕ | ✕ | D | Progressive scene: pet/mood → stats → full room/details |
| Git | ✕ | ✕ | ✕ | ✕ | ✕ | D- | Entity summary with compact badges and height-gated CI/description |
| Proxmox | ✕ | ✕ | ✕ | ✕ | ✕ | D- | Shared infrastructure status rows and summary-first hierarchy |
| Media | ✕ | ✕ | ✕ | ✕ | ✕ | D- | Shared service status list with expandable subordinate detail |
| Notes | ✕ | △ | ✕ | ✕ | ✕ | D- | Card-owned editor height, standard controls, grouped toolbar/editor/footer |

## Shared module archetypes

### 1. Hero metric

Used by Clock, Weather, and Timer.

- one primary value;
- one secondary line;
- optional forecast/action cluster;
- hero size clamped by module scale and container width;
- compact height removes tertiary content before shrinking readability.

### 2. Metric stack

Used by Resource Monitor, API Poller, Proxmox, and Media.

- consistent label/value baseline;
- optional status and progress visualization;
- numeric alignment;
- compact/standard/comfortable spacing from one token set.

### 3. Tile/row collection

Used by Links, Link List, Git, and LAN Scan.

- adaptive columns based on container width;
- one tile minimum width;
- consistent icon box and row height;
- truncation and tooltip contract for long labels.

### 4. Editorial/editor

Used by Notes and Quotes.

- bounded readable line length;
- clear content/editor surface;
- metadata/footer grouped directly with its content;
- no flex distribution through unused height.

### 5. Media viewport

Used by Image, Iframe, and ASCII Animation.

- configured height is a preference, bounded by container and viewport;
- consistent empty/loading/error state;
- caption/actions do not overlap content;
- object-fit/aspect behavior is explicit.

### 6. Simulation

Used by Digital Pet.

- art region remains coordinate-based;
- surrounding title, stats, information, and actions consume shared tokens;
- tiny/mobile mode reduces art complexity before reducing control usability.

## Proposed semantic sizing system

```css
:root {
  --page-gutter: clamp(12px, 2.2vw, 36px);
  --page-block-gap: clamp(16px, 2vw, 28px);
  --card-gap: clamp(10px, 1vw, 16px);
  --card-pad-inline: clamp(12px, 1.3vw, 20px);
  --card-pad-block: clamp(10px, 1vw, 16px);
  --section-gap: clamp(14px, 1.3vw, 24px);
  --cluster-gap: clamp(6px, 0.6vw, 10px);
  --control-hit: 36px;
  --control-hit-touch: 44px;
  --card-min: clamp(280px, 24vw, 320px);
}
```

Module-derived variables should be computed once on `.dropdown-content`:

```css
.dropdown-content {
  --mod-space-cluster: calc(var(--cluster-gap) * var(--mod-density-scale));
  --mod-space-section: calc(var(--section-gap) * var(--mod-density-scale));
  --mod-control-size: clamp(30px, calc(34px * var(--mod-scale)), 44px);
  --mod-content-size: clamp(12px, calc(var(--text-base) * var(--mod-font-content)), 24px);
  --mod-meta-size: clamp(11px, calc(var(--text-xs) * var(--mod-font-secondary)), 16px);
}
```

Validate browser support and combined extremes before adopting these exact formulas.

## Implementation initiatives

### Initiative 1 — Lock top-bar typography behavior

Files:

- `style.css:263-274`
- `tests/ui-consistency.test.js`

Work:

1. Keep the immediate capped typography correction.
2. Add computed-style tests at scales 0.5, 1, and 2.
3. Separate typography, control, and spacing scale effects.
4. Add telemetry priority behavior.

### Initiative 2 — Add Aura semantic tokens

Files:

- `style.css:1-80`
- `theme.js:24-40`
- `tests/ui-consistency.test.js`

Work:

1. Add semantic fluid tokens without replacing existing base tokens.
2. Map shell/card spacing to the semantic layer.
3. Verify user layout settings remain authoritative within safe bounds.
4. Add assertions preventing zero-gap/full-bleed regressions.

### Initiative 3 — Make the grid width-aware

Files:

- `style.css:291-320`
- `render.js:92-132`
- `config-panel.js:99-103`
- `app.js:75-82`

Work:

1. Add fixed/adaptive column mode.
2. Add minimum card width.
3. Add auto/row card height mode and “Fit content.”
4. Preserve existing dashboards through normalization defaults.
5. Test mixed-width and mixed-height cards at every tier.

### Initiative 4 — Establish five responsive tiers

Files:

- `style.css:1028-1174`
- final responsive block at `style.css:1862-1881`
- `tests/ui-consistency.test.js`

Work:

1. Consolidate responsive ownership into a final ordered section.
2. Add desktop and ultrawide tiers.
3. Test card minimum widths, panel behavior, top-bar regions, and overflow.
4. Prefer container queries inside modules where support permits.

### Initiative 5 — Build shared module primitives

Files:

- `design-system.js`
- `style.css`
- `render.js:305-330`
- new tests under `tests/`

Work:

1. Add semantic DOM helpers/classes for metric rows, tiles, action rows, metadata, and media viewports.
2. Compute module spacing/control variables once.
3. Document scale/density/font/height responsibilities.
4. Add production-DOM tests proving settings change computed module styles.

### Initiative 6 — Revise modules by archetype

Order:

1. Notes, Resource Monitor, and Links as reference implementations.
2. Timer, Quotes, and Search.
3. API Poller, Proxmox, Media, and Git.
4. Weather and Clock refinements.
5. Image, Iframe, ASCII Animation, LAN Scan, and Digital Pet.

For every module:

1. Write a computed-style/settings contract.
2. Replace inline static geometry with shared classes.
3. Verify small/medium/large scale.
4. Verify compact/standard/comfortable density.
5. Verify left/center/right alignment where meaningful.
6. Verify small/medium/large/expanded height disclosure.
7. Check 360, 768, 1024, 1280, 1600, and 1920px widths.

### Initiative 7 — Clarify hierarchy and surfaces

Files:

- `style.css`
- `design-system.js`

Work:

1. Define page/card/section/module typography roles.
2. Define three surface levels.
3. Standardize card headers and editor surfaces.
4. Raise metadata readability without flattening hierarchy.
5. Preserve accent/theme/radius configuration.

### Initiative 8 — Add responsive visual regression gates

Tests and checks:

- Computed styles rather than source substring alone.
- No horizontal document overflow at target widths.
- No top-bar region overlap.
- Minimum interactive target dimensions.
- Card intrinsic-height behavior in auto mode.
- Module setting changes affect representative descendants.
- Browser screenshots for dark/light cards and radius extremes.
- Reduced-motion and animations-off checks.

## Acceptance matrix

| Area | Desktop | Tablet | Mobile | Tiny | Ultrawide |
|---|---|---|---|---|---|
| Top bar | All regions visible or intentionally disclosed | Telemetry compacts | Regions stack | Tertiary stats hidden | Width remains bounded |
| Grid | 3–4 adaptive tracks | 2 tracks | 1 track | 1 compact track | 4–6 bounded tracks |
| Cards | No accidental stretching in auto mode | No overflow | Preserved frame/radius | Tight but nonzero gaps | No giant single cards |
| Modules | Scale/density work | Container adapts | No clipped controls | 44px targets | Bounded readable measure |
| Panels | Fluid side panel | Narrow side/bottom decision | Bottom sheet | Bottom sheet + safe area | Width capped |
| Typography | Clear four-level hierarchy | No squeeze | Readable floors | Tertiary disclosure | No unbounded growth |

## Non-goals

- No new framework.
- No forced masonry migration.
- No removal of explicit card sizing.
- No flattening of meaningful module-specific visuals.
- No pill-shaped redesign.
- No hover lifting or perpetual decorative motion.
- No hardcoded theme or radius.
- No replacement of user configuration with “designer defaults.”

## Definition of done

- Top-bar text remains proportional at every configured scale.
- No shell or module overlap at the target viewport matrix.
- No unintended horizontal scrolling.
- Page, card, section, and module levels are visually distinct but cohesive.
- Every module passes scale, density, typography, height, and responsive contracts applicable to its archetype.
- Existing configurations normalize safely.
- JavaScript/Python suites, syntax, compilation, extension builds, browser console, service probes, and independent review pass.
- Audit evidence is updated with before/after computed measurements and screenshots.

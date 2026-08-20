# WarTab — Transformative UI/UX Audit & Redesign Plan

**Date:** 2026-08-20  
**Audited commit:** `6718e7b`  
**Scope:** live dashboard shell, default/current page, cards, modules, top bar, add-card flow, configuration, card editing, mobile/tablet/desktop composition, accessibility, and feature discoverability.  
**Files modified during audit:** this report only. No application code or config changed.

---

## Executive verdict

WarTab is functionally advanced but **perceptually conservative**. Recent releases added command search, PWA behavior, smart links, RSS, iCal, Markdown, service monitoring, custom CSS, and other capabilities, but almost all of that work lives behind the same card shell, the same tiny utility controls, and the same settings-heavy configuration model. A user looking at the dashboard for five seconds sees essentially the same composition as before.

The problem is not insufficient polish. It is that WarTab has **one visual archetype, one editing archetype, and weak product storytelling**:

1. Every card looks like the same black outlined container regardless of whether it is a launcher, a live metric, a writing canvas, or a decorative experience.
2. Manual row spans can create enormous empty areas, and the UI offers no strong visual layout-planning experience to help the user choose better sizes.
3. Powerful features are hidden behind icon-only chrome, keyboard shortcuts, right-click, and technical settings.
4. Adding a card means choosing from 23 equal-looking labels without categories, previews, descriptions, examples, or recommended sizing.
5. Mobile is a desktop card stack, not a deliberately authored mobile experience.

**Conclusion:** another pass of token cleanup, tiny spacing changes, or extra modules will not make Cody “feel” the improvement. WarTab needs a deliberate **experience redesign** while preserving its core identity and the hard rule that card geometry changes only through explicit user action.

### Severity summary

| Severity | Count | Meaning |
| --- | ---: | --- |
| P0 | 0 | No crash or unusable layout found |
| P1 | 12 | Major experience/hierarchy problems that materially weaken daily use |
| P2 | 11 | Important cohesion, discoverability, responsive, and accessibility improvements |
| P3 | 5 | Cleanup and finishing work |

---

## Audit method and evidence

### Source reviewed

- `index.html`
- `style.css`
- `app.js`, `render.js`, `theme.js`, `pages.js`
- `config-panel.js`, `edit-panel.js`, `section-editor.js`, `page-editor.js`
- `command-palette.js`, `arrange-mode.js`, `design-system.js`
- all module registration and current default-card definitions
- prior consistency and Aura audits

### Browser evidence

The current app was served locally using the live project config, with the busy background disabled and a flat `#0f0f0f` canvas for accurate layout recognition.

Screenshots:

- `docs/audits/2026-08-20-screenshots/desktop-1400.png` — 1400 × 1000
- 1024 × 900 layout measured through the same browser probe
- `docs/audits/2026-08-20-screenshots/tablet-900.png` — 900 × 900
- `docs/audits/2026-08-20-screenshots/mobile-390.png` — 390 × 844
- `docs/audits/2026-08-20-screenshots/add-card.png` — Add Card flow
- `docs/audits/2026-08-20-screenshots/config-panel.png` — configuration panel

### Measured composition

| Viewport | Top bar | Page height | Horizontal overflow | Notable composition |
| --- | ---: | ---: | ---: | --- |
| 1400 × 1000 | 44px | 1053px | none | Welcome card 659×548; System stranded on lower left |
| 1024 × 900 | 44px | 1258px | none | Welcome becomes full-width 973×294; System begins below fold |
| 900 × 900 | 44px | 1337px | none | rigid two-column band; module card full-width 854×306 |
| 390 × 844 | 99px | 1741px | none | only Welcome, Search, and part of Clock fit near first viewport |

The current page contains **12 visible text elements below 11px on desktop/tablet and 15 on mobile**.

At 390px, a browser probe found undersized visible controls including:

- five top actions: **30×30px**
- page tab: **76×26px**
- card edit buttons: **32×32px**
- Notes toolbar actions: mostly **28×28px**
- Search action: **42×38px**
- search-engine button: **48×19px**
- panel close buttons/tabs: **31px high**

This is browser-verified, not inferred from CSS.

---

## Why recent improvements are not being felt

### 1. Capability changed; composition did not

The shell still renders one grid of nearly identical black cards (`style.css:355-390`). New modules inherit the same card header, border, accent stripe, title size, and body rhythm. The visual system does not announce that an RSS feed, command launcher, system monitor, note, and digital pet are fundamentally different experiences.

### 2. High-value features are hidden

The command palette is invoked by keyboard, link actions appear on right-click, typed filtering requires focusing a link grid, and engine prefixes are shown as very faint microcopy. The top bar offers five unlabeled icons (`index.html:87-91`) with almost equal emphasis. Functionality exists, but the interface does not teach it.

### 3. The default/current page demonstrates configuration, not delight

The dominant desktop object is a huge “Welcome to WarTab” Notes card. Its useful content ends near the top while the explicit four-row height continues to 548px. The “Card Modules” card lists only a subset of capabilities and presents them as tiny equal tiles. The first impression is a setup canvas, not a polished personal command center.

### 4. Configuration is technically complete but emotionally flat

The configuration panel exposes “Override Columns,” “Card Gap (px),” and percentage padding sliders (`config-panel.js:79-101`) before it offers meaningful visual presets or examples. It communicates implementation parameters rather than outcomes such as “Compact command center,” “Spacious glass,” or “Dense homelab.”

---

# Severity-ranked findings

## P1-01 — The dashboard has no primary focal experience

**Evidence:** desktop screenshot; `style.css:355-390`; `render.js:314-410`.  
**Current:** every card is a peer. The welcome note is largest only because of manual geometry, not because the visual system establishes importance. Search, Clock, Card Modules, and System all use the same title/header/surface language.  
**Impact:** the eye does not know where to start. The dashboard reads as a wireframe of containers rather than a command center.  
**Transformative fix:** create explicit card presentation roles:

- **Launcher** — strong icon/label rhythm, less card chrome
- **Metric** — large values, compact context, state color
- **Canvas** — writing/media area, subdued surrounding chrome
- **Feed** — dense rows, readable chronology
- **Ambient** — clock/weather/photo with expressive typography

Roles affect paint and internal hierarchy only. They do **not** change user-set width, height, or order.  
**Acceptance:** at five seconds, a blinded reviewer can identify the primary launcher, live data cards, writing cards, and ambient cards without reading titles.

## P1-02 — Explicit card heights produce visually catastrophic dead space

**Evidence:** desktop Welcome card 659×548; content occupies roughly the upper 230px. `style.css:356`, `style.css:382`, `style.css:388-390`; Notes uses a flex column (`modules/notes.js:3-5`).  
**Current:** row-spanned cards stretch, while their actual content does not meaningfully use the area. This strands System below the primary composition and leaves half the screen empty.  
**Constraint:** WarTab must never silently resize, auto-span, or reorder cards.  
**Transformative fix:** build a **Layout Studio**, not auto-layout:

- miniature page map showing real card spans and empty regions
- direct width/height stepper on selected card
- ghost preview before applying
- “recommended size” shown as advice only, never applied automatically
- explicit Apply/Cancel and multi-step Undo
- optional separate mobile order/size profile, activated only after user confirmation

**Acceptance:** no geometry changes until Apply; a user can diagnose and fix the screenshot’s large dead zone in under 15 seconds.

## P1-03 — Add Card is a 23-choice wall with no product guidance

**Evidence:** `/tmp/wartab-audit-add-card.png`; `app.js:314-351`. Modal is 376×741px with 23 equal tiles in a three-column grid.  
**Current:** no search, category, description, preview, recommended size, “popular” section, recent choices, or examples. “API Poller,” “Resources,” “Service Status,” and “Git Repo” require prior product knowledge.  
**Impact:** feature richness becomes decision fatigue; added modules remain undiscovered.  
**Transformative fix:** replace with a **Card Gallery**:

- search field at top
- categories: Start Here, Links & Search, Personal, Homelab, Data, Media, Fun
- large featured templates with a screenshot/mini-preview
- one-sentence purpose and setup requirements
- “works immediately” vs “requires URL/token” badges
- recommended width/height shown before creation
- Favorites and Recently Added

**Acceptance:** a new user can choose an appropriate card without knowing module names; no modal scroll is required to reach common choices.

## P1-04 — Editing is a settings form, not direct manipulation

**Evidence:** `edit-panel.js:49-94`, `edit-panel.js:124-160`, `edit-panel.js:193+`.  
**Current:** clicking edit opens a 520px inspector. Nearly every change mutates live state and saves immediately. The edited card is highlighted while every other card is blurred. There is no coherent transaction, visible diff, or persistent undo history.  
**Impact:** customization feels technical and risky; the user mentally translates slider values into visual outcomes.  
**Transformative fix:** **Edit Mode** with:

- compact contextual toolbar anchored to the selected card
- direct title/icon/accent editing in place
- resize handles or explicit span steppers with a grid preview
- inspector reserved for advanced section settings
- staged transaction with Apply / Cancel
- multi-step undo history and “Revert card”

**Acceptance:** rename, recolor, resize, duplicate, and move a card without entering a long form; Cancel restores the exact prior state.

## P1-05 — Mobile is a long desktop stack, not an authored experience

**Evidence:** 390×844 screenshot; total document height 1741px. First viewport is dominated by 99px top bar + 332px welcome card + most of Search. `style.css:1218-1305`.  
**Current:** every card becomes full width and retains broadly desktop-oriented content. The module catalog alone becomes 438px high.  
**Impact:** daily mobile use requires excessive scrolling before reaching useful status or links.  
**Transformative fix:** an explicit, user-controlled **Mobile Layout Profile**:

- separate mobile order and collapsed/open state
- “hide on mobile” per card
- compact/standard mobile density per card
- sticky compact launcher/search row
- collapsed telemetry summary with tap-to-expand
- preserve desktop geometry untouched

**Acceptance:** a user can configure their top three mobile cards; the first useful action appears within 120px after the top bar; desktop order remains unchanged.

## P1-06 — Mobile touch targets fail the interaction contract

**Evidence:** browser-measured target list above; source dimensions `style.css:319-327`, mobile rules `style.css:1224-1233`, Notes controls `style.css:470-479`.  
**Current:** the most important mobile controls are 28–32px, even though prior audits established a 44px touch goal.  
**Impact:** inaccurate tapping, inaccessible action chrome, and a visibly cramped top bar.  
**Fix:** one final coarse-pointer ownership layer covering top actions, page tabs, card edit controls, Notes toolbar, search engine, panel tabs, and panel closes. Icons remain optically 16–18px inside 44px quiet hit boxes.  
**Acceptance:** browser probe returns zero primary interactive targets under 44px in either dimension, except inline text links with adequate line height.

## P1-07 — The top bar hides meaning behind five equal icon circles

**Evidence:** `index.html:87-91`; `style.css:269-327`; mobile screenshot.  
**Current:** Help, Add, Pages, Arrange, and Config have the same weight. Search/command is absent from visible chrome. On mobile, brand text disappears while all five utility actions remain.  
**Impact:** the primary action is unclear and the most powerful navigation feature is invisible.  
**Transformative fix:** redesign the shell into three semantic regions:

1. identity + current page
2. visible **Command/Search trigger** as the primary control
3. Add as the primary action + one overflow menu for Pages/Arrange/Settings/Help

On mobile: identity, Command trigger, Add, overflow; telemetry moves to a compact disclosure row.  
**Acceptance:** Add and Command are recognizable without tooltips; secondary actions no longer consume five permanent slots.

## P1-08 — The visual system is almost monochrome at every hierarchy level

**Evidence:** screenshots; `.card`, `.link-item`, `.modal-box`, and panel cards all use near-black fills and thin grey borders (`style.css:365-377`, `style.css:412-420`, `style.css:1207-1210`).  
**Current:** accent mostly appears as a 3px stripe and subtle focus/hover state. Parent card, interactive tile, input, panel group, and modal are differentiated by tiny luminance changes.  
**Impact:** the dashboard feels flat despite glass/shadow complexity.  
**Transformative fix:** define a perceptual surface ladder:

- canvas
- card
- card-emphasis / selected
- interactive tile
- input/editor well
- floating layer

Use accent in localized halos, selected regions, metric state, and primary actions—not on every border. Provide 3–4 cohesive appearance presets, not dozens of raw knobs.  
**Acceptance:** surfaces remain AA-readable and visually distinguishable with the background disabled and with a busy image enabled.

## P1-09 — Typography establishes too little contrast between levels

**Evidence:** `style.css:379-382`, `style.css:428`, generated type tokens in `theme.js:24-51`; 12–15 visible text elements under 11px.  
**Current:** page chrome, card title, section label, module label, hint, and metadata are often separated by opacity rather than meaningful size/weight/spacing. Search hints and module labels are extremely faint.  
**Impact:** users must read linearly instead of scanning.  
**Fix:** four explicit text levels with readability floors:

- card title: 16–18px / 650
- section label: 12–13px / 650 / tracked
- primary content: 14–16px
- metadata: minimum 11.5–12px at useful contrast

Large ambient/data values become genuinely large; utility labels stay compact.  
**Acceptance:** no essential interactive label below 12px; primary values are identifiable at a glance.

## P1-10 — Configuration exposes implementation values instead of outcomes

**Evidence:** `/tmp/wartab-audit-config.png`; `config-panel.js:28-54`, `config-panel.js:79-101`, `config-panel.js:104+`.  
**Current:** the first tab exposes branding, page columns, gap pixels, and width/height padding percentages. Visual consequences appear on the blurred dashboard behind a fixed 520px panel.  
**Impact:** users tune numbers without confidence and cannot quickly produce a coherent look.  
**Transformative fix:** lead with **Experience Presets**:

- Command Center
- Dense Homelab
- Calm Minimal
- Ambient Glass
- Mobile First

Each preset previews a thumbnail and lists exactly what it changes. Raw controls move under Advanced. Add a compare toggle (Before / Preview) and explicit Apply.  
**Acceptance:** a user can produce an obviously different visual direction in two clicks; advanced controls remain available.

## P1-11 — The first-run experience showcases setup scaffolding instead of WarTab’s best state

**Evidence:** default cards in `app.js:94-182`; restore behavior `app.js:362-365`; desktop screenshot.  
**Current:** empty/no-card state can be replaced by the large default dashboard; the hero card is setup prose; Card Modules is a partial static catalog; status may show host-specific zero-value rows.  
**Impact:** the first impression is “configure me,” not “this is already useful and impressive.”  
**Transformative fix:** a template-based first-run chooser:

- Personal Startpage
- Homelab Command Center
- Minimal Launcher
- Productivity Desk
- Start Empty

Show full-page previews. Apply only after explicit selection. “Start Empty” must remain empty and never be silently repopulated.  
**Acceptance:** all templates are useful immediately; empty configuration persists across reload; no host-specific assumptions leak into a clean install.

## P1-12 — Daily actions lack a coherent undo/recovery model

**Evidence:** immediate saves in `edit-panel.js:101-160`; one-off undo toast patterns in `core.js`; destructive paths across card/page/section/link editors.  
**Current:** some deletions provide undo, others save immediately, and editing has no transaction boundary.  
**Impact:** customization feels fragile, especially on touch devices.  
**Fix:** central bounded undo stack for card/page/section/link/config mutations. Display one persistent “Undo” affordance with operation name and history count. Snapshot before bulk/preset/layout changes.  
**Acceptance:** at least the last 20 local mutations can be undone/redone during the session; server snapshots cover reload recovery.

---

## P2 findings

### P2-01 — The Card Modules showcase is stale and visually low value

The current page shows about ten equal tiles while WarTab has 23 registered module types. Labels truncate (“Links & Bookm…”, “Resource Mon…”). Replace the static catalog card with either Smart Links / a real daily-use card or a dynamic “Discover” entry that opens the Card Gallery.

### P2-02 — Feature discoverability depends on hover, right-click, and memory

Search prefixes, command palette, typed link filtering, context menus, image attachment, and module-specific actions are not taught in context. Add a first-use coachmark system with at most one hint at a time, dismiss permanently, and surface equivalent touch actions.

### P2-03 — Right-click link actions have no mobile-equivalent gesture

`modules/links.js` binds `contextmenu`; touch users need a visible kebab on focus/long press or an actions sheet. Never make long press the only route.

### P2-04 — Tablet composition is technically correct but visually rigid

The 769–1199px breakpoint enforces two equal columns (`style.css:1307-1317`). At 900px it avoids overflow, but wide cards consume full rows and the page becomes a sequence of large horizontal slabs. Layout Studio should preview tablet behavior and allow explicit tablet spans without touching desktop.

### P2-05 — Progressive disclosure is inconsistent

Card height changes empty space more often than information quantity. Dense cards should reveal additional rows/charts/details only at larger manually selected heights. Small cards should not merely clip or leave space empty.

### P2-06 — Data modules lack one strong scan line

System and similar telemetry show many tiny labels and values with similar weight. Use a dominant state/number, aligned values, one compact visualization, and a secondary metadata footer.

### P2-07 — Panel width is fixed rather than content-responsive

The config panel is exactly 520px at 1400px. Use `clamp(380px, 38vw, 600px)` and switch to sheet behavior before the page behind becomes too narrow. Panel form grids should respond to panel width, not viewport width.

### P2-08 — “Customizable” does not yet mean “visually ownable”

Users can tune many raw values but cannot choose card role, chrome density, header treatment, section divider style, or a coherent preset. Add restrained role/preset choices rather than more independent sliders.

### P2-09 — Page navigation is visually secondary even when pages are a core model

Page tabs are small outlined pills next to branding. Give pages clearer identity: icon, title, optional accent, and a compact switcher that can show page purpose or scene.

### P2-10 — Empty and error states are individually good but not part of one guided journey

`ds.empty` and error components exist, but they do not connect users to the best next action, templates, or relevant settings. Empty states should offer one prominent action and one sample/template action.

### P2-11 — Dialog and panel focus ownership is incomplete

Add Card focuses only its overlay, while config/edit panels toggle open without a shared focus trap or consistent focus restoration (`app.js:314-351`, `config-panel.js:26`, `edit-panel.js:49-121`). Icon Picker has bespoke restoration, but the shell does not provide one dialog manager. Consolidate focus entry, Tab cycling, Escape ownership, and return-focus behavior for every modal/sheet/panel.

---

## P3 findings

1. The Add Card modal uses inline grid geometry (`app.js:325-341`) instead of a reusable gallery component.
2. Multiple card/module labels truncate without an accessible secondary description.
3. The fixed footer competes with mobile toasts and sheets despite clearance improvements.
4. Several faint helper labels remain visible only on hover/focus, weakening feature teaching.
5. The card edit pencil is repeated on every card and adds visual noise; show it in Edit Mode, on focus, or when a card is selected.

---

# Prior-audit status reconciliation

| Prior finding | Current status | Evidence / update |
| --- | --- | --- |
| AURA-000A tablet columns defeated | **Fixed** | 900/1024 render two columns; `style.css:1307-1317` |
| AURA-000B card above panel | **Mostly fixed** | tokenized layers; still visually highlights/blur-behavior complicates editing |
| AURA-000C mobile top-bar overlap | **Layout fixed, UX open** | no overlap; 99px high and five 30px actions remain |
| AURA-000D footer clearance | **Fixed** | `--footer-clearance` + safe-area padding |
| AURA-000E non-monotonic type ramp | **Fixed** | bounded ramp in `theme.js` + tests |
| AURA-000F dead scale/density controls | **Partially open** | framework publishes contract; module compliance remains uneven |
| AURA-000G selector drift | **Mostly fixed** | contract tests cover known mismatches |
| AURA-001 top-bar over-scaling | **Mechanically fixed, composition open** | clamped sizing; still too many equal-priority regions/actions |
| AURA-002 large dead zones | **Still true and browser-confirmed** | Welcome 659×548 with large unused body |
| AURA-003 narrow desktop columns | **Improved** | 322px tracks at 1400; fixed-mode quality still depends on user count |
| AURA-004 spacing hierarchy | **Partially improved** | tokens exist; visual hierarchy remains flat |
| AURA-007 Notes grouping/dead space | **Still visible** | giant note card dominates desktop composition |
| AURA-008 telemetry hierarchy | **Still true** | System uses many equally small rows/values |
| AURA-009 tablet composition gap | **Functionally fixed, aesthetically open** | no overflow; rigid slab composition |
| AURA-010 hierarchy blend | **Still true** | card/section/module labels differ mostly by opacity |
| AURA-011 target sizes | **Still true and measured** | primary mobile controls 28–32px |
| AURA-013 tiny/faint secondary text | **Still true and measured** | 12–15 visible nodes under 11px |
| AURA-015 background/surface contrast | **Still true** | one near-black ladder throughout |
| AURA-016 fixed panel width | **Still true** | measured 520px at desktop |
| AURA-017 no translation-based aura | **Fixed** | restrained transitions retained |

---

# Cohesive redesign direction: “Personal Command Deck”

WarTab should feel like a **personal operating surface**, not a collection of settings cards.

## Visual thesis

- Keep the dark glass/skeuomorphic identity.
- Use stronger hierarchy, not more decoration.
- Give modules distinct archetypes while preserving shared tokens.
- Make command/search and Add visible primary actions.
- Treat editing as a mode with direct manipulation and safe transactions.
- Preserve every user-set card size/order unless the user explicitly applies a change.

## Five signature experiences

### 1. Command Deck

A visible top-bar command/search trigger that opens the existing palette. It includes recent links, smart suggestions, pages, cards, and actions. On mobile it becomes the primary top-bar control.

### 2. Card Gallery

A searchable, categorized, preview-driven replacement for the 23-tile modal. Templates explain value and setup before creation.

### 3. Layout Studio

A page mini-map with manual span controls, empty-space visualization, breakpoint previews, Apply/Cancel, and undo. It never auto-resizes or reorders.

### 4. Contextual Edit Mode

Select a card and edit its common properties in place. Advanced settings remain in an inspector. All changes are staged and reversible.

### 5. Experience Presets

Cohesive visual/layout presets with previews: Command Center, Dense Homelab, Calm Minimal, Ambient Glass, Mobile First. Presets declare exactly what they change and require explicit Apply.

---

# Implementation plan

## Phase 0 — Baseline and design prototypes

1. Preserve current live version as rollback baseline.
2. Add deterministic desktop/tablet/mobile screenshot fixtures.
3. Record card rects, tiny text, target sizes, overflow, and first-use task times.
4. Build three non-production visual prototypes:
   - Command Deck shell
   - Card Gallery
   - Layout Studio
5. Cody chooses one visual direction before production migration.

**Exit gate:** approved screenshot direction at 1400, 900, and 390px.

## Phase 1 — New hierarchy foundation

1. Add semantic card roles: launcher, metric, canvas, feed, ambient.
2. Create one perceptual surface ladder and four-level typography hierarchy.
3. Raise essential metadata/interaction labels to readability floors.
4. Make card header chrome conditional by edit state instead of permanently noisy.
5. Create role-aware shared module primitives.

**No layout geometry changes in this phase.**

## Phase 2 — Shell and navigation remake

1. Promote command/search to visible primary chrome.
2. Keep Add prominent.
3. Move Pages, Arrange, Settings, Help into one overflow menu.
4. Recompose telemetry as a compact disclosure.
5. Give pages stronger identity and switching feedback.
6. Verify keyboard, coarse pointer, reduced motion, and no-JS fallback.

## Phase 3 — Card Gallery and first-run templates

1. Replace Add Card grid with searchable categorized gallery.
2. Add module descriptions, setup badges, previews, and recommended manual size.
3. Add first-run template chooser and persistent Start Empty.
4. Replace static Card Modules showcase with Discover / Gallery entry.
5. Add contextual onboarding hints that permanently dismiss.

## Phase 4 — Contextual editing and undo

1. Implement staged mutation transaction.
2. Add in-place title/icon/accent controls.
3. Add card duplicate, hide, move, size, and delete to contextual toolbar.
4. Build central undo/redo stack.
5. Add Revert Card and Revert Page.
6. Keep advanced section/module settings in responsive inspector.

## Phase 5 — Layout Studio

1. Render page mini-map from actual card spans.
2. Show empty tracks/dead regions.
3. Add manual width/height steppers with ghost preview.
4. Add desktop/tablet/mobile breakpoint preview.
5. Add explicit mobile order/visibility profile.
6. Apply only after confirmation; snapshot before apply.

## Phase 6 — Module archetype migration

Order by perceptual impact:

1. Search / Links / Smart Links → Launcher archetype
2. Resource Monitor / Proxmox / Git / Service Status → Metric archetype
3. Clock / Weather / Image / Digital Pet → Ambient archetype
4. Notes / Markdown / iframe → Canvas archetype
5. RSS / Agenda / Media / API Poller → Feed archetype

For each module:

- dominant information line
- role-consistent controls
- meaningful progressive disclosure for manually selected heights
- 12px metadata floor
- 44px coarse-pointer controls
- empty/loading/error/action consistency

## Phase 7 — Mobile-first composition

1. Implement mobile profile without altering desktop geometry.
2. Compact shell to identity + Command + Add + overflow.
3. Add card hide/order/density controls for mobile.
4. Collapse telemetry by default.
5. Ensure first useful card/action is visible near the first viewport.
6. Re-test at 320, 360, 390, 430, 768px.

## Phase 8 — Presets, delight, and release hardening

1. Add visual Experience Presets with before/preview/apply.
2. Add background-aware contrast preview.
3. Add restrained role-specific motion and reduced-motion equivalents.
4. Add full interaction/visual regression suite.
5. Dogfood with common tasks and time-to-completion measurements.
6. Deploy in reversible commits; visually verify each phase live.

---

# Acceptance matrix

| Journey | Current | Target |
| --- | --- | --- |
| Find a known link | keyboard shortcut/right card | visible Command trigger; ≤2 actions |
| Add useful card | scan 23 equal tiles | search/category/preview; ≤20 seconds |
| Understand module | name/icon only | purpose + preview + requirements |
| Resize/recompose page | edit sliders one card at a time | Layout Studio preview; explicit apply |
| Undo accidental change | inconsistent toast/snapshot | session undo/redo + snapshot recovery |
| Mobile reach useful content | 99px chrome + long stack | command/add visible; selected top cards first |
| Identify live system state | many tiny equal rows | dominant metric/state + supporting details |
| Make page look different | tune many raw values | choose coherent preset then refine |

---

# Validation requirements for every implementation phase

## Viewports

- 320 × 700
- 390 × 844
- 768 × 1024
- 900 × 900
- 1024 × 900
- 1400 × 1000
- 1920 × 1080

## Automated

- `npm run test`
- JS syntax checks
- no horizontal overflow
- target-size probe
- tiny essential-text probe
- card geometry unchanged unless test explicitly applies a manual layout action
- reduced-motion snapshot
- keyboard traversal through shell, gallery, editor, and layout studio

## Visual

- flat background and busy image background
- dark and light card modes
- default accent and vivid accent
- compact and comfortable density
- panel open from both sides
- first-run, empty page, loading, offline, error, and populated states

---

# Recommended execution order

1. Prototype and approve the **Command Deck shell** and **Card Gallery** first; these create the largest immediately felt change.
2. Implement the hierarchy foundation and shell in one guarded release.
3. Ship Card Gallery + first-run templates.
4. Ship contextual Edit Mode + undo.
5. Ship Layout Studio, preserving manual-only geometry.
6. Migrate modules by archetype in perceptual-impact order.
7. Finish mobile profiles and experience presets.

Do **not** start with more modules, more settings, additional CSS token cleanup, or isolated micro-animation. Those may improve implementation quality but will repeat the current problem: substantial work that the user cannot feel.

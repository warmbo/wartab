# WarTab UI/UX Consistency Audit and Remediation Plan

> **For Hermes:** Execute this plan task-by-task. Load the `wartab`, `frontend-css-maintenance`, `project-code-audit`, `test-driven-development`, and `requesting-code-review` skills before execution. Do not commit unless the user explicitly requests it.

**Goal:** Find, document, and correct visual and interaction inconsistencies across WarTab so every icon, surface, state, panel, control, and module feels like one coherent product without redesigning the established WarTab concept.

**Architecture:** Keep the existing framework-free browser application, shared `design-system.js`, CSS-token theme layer, module registry, and configurable appearance model. First establish a measurable visual contract and capture evidence; then repair outliers through shared icon/component helpers, semantic tokens, and narrowly scoped CSS consolidation rather than one-off overrides.

**Tech stack:** Vanilla JavaScript and DOM APIs, CSS custom properties, Lucide, Vitest + jsdom, production-source browser harness, Python static-analysis scripts where useful, live Chromium/browser inspection, and the existing self-hosted/extension builds.

---

## 1. Audit intent

This is not a subjective redesign pass. It is a consistency audit with three outputs:

1. A reproducible inventory of visual and interaction patterns currently shipped.
2. A severity-ranked audit report with source evidence and live-browser evidence.
3. A controlled remediation that makes equivalent UI elements look and behave equivalently while preserving WarTab’s identity and customization options.

The audit must detect both obvious mismatches and subtle drift, including:

- Two instances of the “same” icon using different names, dimensions, stroke widths, alignment, opacity, rendering branches, or hover behavior.
- Lucide icons, uploaded icon images, and emoji behaving differently in equivalent contexts.
- Borders that are too bright, too dark, too thick, dashed without a semantic reason, or sourced from a one-off color instead of the theme hierarchy.
- Shadows and highlights whose direction, blur, spread, intensity, animation, or accent treatment conflict with adjacent surfaces.
- Rounded corners that bypass the configured/default sharp-corner treatment.
- Cards, controls, tabs, and links that use inconsistent hover, active, focus-visible, disabled, selected, dragging, loading, empty, error, and success states.
- Late stylesheet overrides that silently contradict an earlier component definition.
- Modules that visually resemble separate applications rather than members of the shared WarTab design system.
- Desktop-only interactions that become invisible, cramped, or untappable on touch devices.

---

## 2. WarTab visual contract

Use this contract as the audit lens. Do not “fix” intentional differences that communicate distinct semantics.

### Product identity

- Dark, neutral glass + restrained skeuomorphic depth.
- Configurable card appearance with a sharp-corner default.
- One user-selected accent drives selection, focus, and intentional emphasis.
- Subtle borders, layered transparency, controlled blur, and restrained highlights establish depth.
- Information remains dense and legible; decoration must not compete with content.
- User-configurable theme, layout, icon, density, alignment, and animation settings remain functional.

### Interaction identity

- Hover changes border, shadow, background, color, or opacity; it does not lift, translate, or scale cards, buttons, links, or tabs.
- Pressed/active feedback may use a small transform only while actively pressed and must be consistent by control family.
- Keyboard focus is always visible and uses the accent/focus-ring language.
- Disabled controls are visibly unavailable and do not retain normal hover/active behavior.
- Selected/active state must remain recognizable without color alone.
- Motion respects both WarTab’s animation toggle and `prefers-reduced-motion`.
- Touch users receive persistent access to controls that desktop exposes on hover.

### Icon identity

Every configurable icon surface must support the same three branches:

1. Lucide name → hydrated SVG.
2. URL, uploaded path, or data URL → constrained `<img>` with fallback behavior.
3. Emoji/text glyph → text node with the emoji font stack.

Equivalent icon roles must share:

- Container dimensions.
- Rendered SVG/image dimensions.
- Alignment and flex-shrink behavior.
- Lucide stroke width.
- Default, hover, active, selected, disabled, and error-fallback opacity/color.
- Accessible name rules for icon-only controls.

Role-specific sizes are allowed, but each role must have one canonical size:

- Brand icon.
- Page-tab icon.
- Card-title icon.
- Module-header icon.
- Grid link icon.
- Row link icon.
- Status/stat icon.
- Toolbar action icon.
- Small editor/action icon.
- Picker preview and picker-grid icon.
- Empty/loading/error-state icon.

---

## 3. Scope and invariants

### In scope

- `style.css` design tokens, component rules, duplicate selectors, state selectors, breakpoints, and late overrides.
- `design-system.js` shared component output and icon behavior.
- `index.html` semantic structure and fixed controls.
- Core renderers and editors: `render.js`, `theme.js`, `pages.js`, `app.js`, `config-panel.js`, `edit-panel.js`, `page-editor.js`, `section-editor.js`, `icon-picker.js`, `uploads.js`, `modals.js`, `form-helpers.js`, `stats.js`, `dragdrop.js`, `arrange-mode.js`, and `page-drag.js`.
- All 18 registered module files under `modules/`.
- Dark and light card modes, configurable accent, card radius, accent bar, animation toggle, module density/scale, all card widths/heights, and responsive layouts.
- Mouse, keyboard, coarse-pointer, reduced-motion, and panel/overlay behavior.
- Empty, loading, error, success, offline, no-results, and destructive-action feedback.
- Self-hosted dashboard and generated extension packages.

### Explicitly out of scope

- No framework, bundler, CSS preprocessor, or component-framework migration.
- No new visual theme, palette, page layout, or navigation concept.
- No removal of user-facing customization options.
- No feature additions unrelated to consistency.
- No changes to server endpoints, persisted config keys, or user data.
- No edits to `config.json`, `uploads/`, `notes/`, or `snapshots/`.
- No broad stylesheet rewrite before evidence identifies the affected component families.
- No automatic replacement of every raw pixel/color value; decorative module artwork and genuinely dynamic values may remain when documented.

### Working-tree safety

The repository contains substantial uncommitted work from the logic audit. Preserve it. Before each remediation batch:

```bash
git status --short
git diff --check
```

Never reset, clean, checkout, or overwrite unrelated changes. Do not commit unless explicitly requested.

---

## 4. Preliminary signals that justify the audit

These are planning-time measurements, not final findings. Recompute them at audit start because the working tree is active.

- `style.css`: approximately 1,864 lines.
- 22 unique hardcoded pixel values appear in spacing properties.
- 113 unique hardcoded color literals appear in the stylesheet.
- 40 unique shadow declarations appear in the stylesheet.
- 78 `!important` declarations exist; some are justified responsive/light-theme overrides, while others may indicate specificity drift.
- 510 JavaScript inline-style sites exist across root and module scripts.
- Only 3 `:focus-visible` selectors were detected, compared with 63 hover selectors and 11 active selectors.
- No explicit `:disabled` selector was detected.
- A late “VISUAL EXCELLENCE” block redefines foundational selectors such as `.card`, `.card::before`, `.card-header`, `.card-body`, `.link-item`, `.page-tab`, `.btn-glass`, and `.modal-box` after their base declarations.
- Icon dimensions currently appear as many inline values, including 10, 12, 14, 16, 18, 20, 22, 28, 36, and 48 pixels.
- `renderIconElement()` centralizes the three-branch icon pattern for card/link output, but `pages.js`, `page-editor.js`, and portions of `design-system.js` currently treat every non-Lucide string as text, which can make uploaded image paths render as text.
- Some component families use semantic tokens while equivalent instances use direct `rgba()`, hex, inline shadow, radius, border, or transition declarations.

Treat every signal as a lead to verify in source and the browser, not as an automatic defect.

---

## 5. Evidence and classification standard

Every report item must include:

- Stable finding ID, such as `ICON-03`, `SURFACE-07`, or `UX-12`.
- Severity: High, Medium, Low, or Intentional Exception.
- Confidence: Confirmed in browser, Confirmed in source, or Needs design decision.
- Affected component family and all affected instances.
- Exact source file, selector/symbol, and current line range.
- Intended reference component or canonical token/state.
- Static screenshot or DOM/computed-style evidence when visual.
- User impact, not merely “CSS is different.”
- Smallest cohesive remediation and regression test.
- Theme, viewport, input-method, and state combinations where it occurs.

### Severity

- **High:** Misleading state, inaccessible interaction, invisible control, broken icon branch, unusable touch behavior, unreadable contrast, content clipping/overflow, or inconsistency that causes a wrong user action.
- **Medium:** Noticeable mismatch in a recurring component family, inconsistent feedback, divergent borders/shadows/highlights, or an outlier that weakens hierarchy across multiple surfaces.
- **Low:** Minor spacing, optical alignment, stroke, opacity, or polish mismatch with no task-completion impact.
- **Intentional Exception:** A verified semantic or decorative reason exists; document it so a later cleanup does not erase it.

---

# Audit Phase

## Initiative 1: Build a reproducible UI consistency inventory

**Objective:** Produce machine-readable metrics and a browser capture matrix before changing visual code.

**Files:**

- Create: `tests/ui-consistency.test.js`
- Create: `docs/audits/wartab-ui-ux-consistency-audit.md`
- Generate, do not commit unless requested: `test-results/ui-ux-audit/`
- Read: `style.css`, `index.html`, all root JavaScript files, and all `modules/*.js`

### Steps

1. Record `git status --short`, current build hash, browser title, loaded stylesheet URL, and script list so the audit cannot accidentally compare stale runtime assets.
2. Add a production-source audit test that reads `style.css`, `index.html`, root scripts, and modules without copying implementation logic.
3. Inventory and group:
   - Spacing values by property and selector.
   - Typography values by semantic role.
   - Border widths, styles, and colors.
   - Radius values and their relationship to `--card-radius`/`--radius-*`.
   - Box/text shadows and highlight pseudo-elements.
   - Blur/backdrop-filter values.
   - Hardcoded colors versus semantic CSS tokens.
   - Transition durations/easings/properties.
   - `!important` declarations with selectors and reason candidates.
   - Inline styles by file and property category.
   - Duplicate exact selectors and late override chains.
4. Inventory every interactive selector/element and mark whether it defines or inherits hover, active, focus-visible, disabled, selected/open, and coarse-pointer behavior.
5. Inventory every icon-producing call site and classify it by role, source support, dimensions, stroke width, fallback, hydration, and accessible name.
6. Capture a baseline at these viewport classes:
   - 2560×1440 ultrawide.
   - 1440×900 desktop/laptop.
   - 1024×768 tablet landscape.
   - 768×1024 tablet/mobile boundary.
   - 375×812 tiny phone.
7. At minimum, capture each viewport with default dark mode. Capture dark/light, animations on/off, card radius 0/custom, and accent-bar on/off at representative desktop and mobile sizes.
8. Store screenshots by stable name, for example `desktop-dark-home.png`, `mobile-light-config.png`, and `desktop-dark-icon-picker.png`.
9. Record console errors, failed assets, horizontal overflow, clipped focus rings, and elements outside the viewport for every capture.
10. Write the raw metrics and capture manifest into the audit report before assigning recommendations.

### Verification

```bash
npm test -- tests/ui-consistency.test.js
npm test
```

Expected:

- Metrics are reproducible from production source.
- Every root/module script is represented in the inventory.
- Every screenshot records viewport, mode, route/page, open panel, and build identifier.
- No remediation has occurred yet.

---

## Initiative 2: Establish the canonical component and state matrix

**Objective:** Define what “consistent” means for each WarTab component role before comparing individual instances.

**Files:**

- Document in: `docs/audits/wartab-ui-ux-consistency-audit.md`
- Inspect: `style.css`, `design-system.js`, `form-helpers.js`, `render.js`, `index.html`

### Steps

1. Build a component-family table covering:
   - Glass cards and transparent/gap cards.
   - Top bar and page tabs.
   - Primary, glass, danger, icon, small, and editor buttons.
   - Inputs, selects, textareas, ranges, color inputs, checkboxes, upload zones, and search fields.
   - Slide panels, overlays, modals, toasts, dropdowns, accordions, picker grids, and drag affordances.
   - Module headers, content regions, stat rows, metric bars, status dots, empty/loading/error states, and footers.
2. For each family, identify the best current implementation to use as a reference. Do not assume the first or newest definition is correct; compare usability, token usage, responsiveness, and accessibility.
3. Define the canonical visual properties for each family:
   - Surface/background token.
   - Border token/width.
   - Default and hover shadow/highlight.
   - Radius behavior.
   - Padding/gap/type role.
   - Icon role and size.
   - Transition token/easing.
4. Define the full interaction matrix for each interactive family: default, hover, active, focus-visible, disabled, selected/open, loading, success, error, dragging, and coarse-pointer.
5. Mark states that do not apply rather than inventing meaningless effects.
6. Record semantic exceptions, such as dashed borders for drop zones or danger color for deletion.
7. Confirm that customization changes values through tokens/variables rather than bypassing shared component rules.

### Exit criteria

- Every audited instance can be compared against a named component role.
- No recommendation relies on personal taste alone.
- Intentional exceptions are explicit and testable.

---

## Initiative 3: Audit icon semantics, rendering, geometry, and behavior

**Objective:** Ensure equivalent icon roles use the same visual language and all configurable icons behave identically across Lucide, image, and emoji sources.

**Files:**

- Inspect: `core.js`, `render.js`, `theme.js`, `pages.js`, `page-editor.js`, `edit-panel.js`, `config-panel.js`, `icon-picker.js`, `design-system.js`, `stats.js`, `app.js`, `card-model.js`
- Inspect: every `modules/*.js` file containing icon output
- Test: `tests/ui-consistency.test.js`
- Extend as appropriate: `tests/theme.test.js`, `tests/core.test.js`

### Source audit

1. Enumerate every `data-lucide`, `renderLucideEl`, `renderIconElement`, `renderLinkIcon`, `isLucideName`, `<img>`, and emoji-icon branch.
2. Map each site to an icon role from the visual contract.
3. For every configurable icon site, test Lucide, absolute URL, uploaded `/uploads/icons/...` path, data URL, emoji, empty value, invalid Lucide name, and failed image load.
4. Verify each site hydrates newly inserted Lucide nodes after DOM replacement.
5. Find renderers that currently turn uploaded paths into literal text; specifically verify page tabs, page editor previews/cards, and shared design-system empty/module headers.
6. Compare semantic choices for repeated actions. The same action must not use `settings` in one place and an unrelated glyph elsewhere without reason.
7. Flag mixed visual languages in the same control family, such as Unicode `✕` beside Lucide-only toolbar controls, only when the mismatch is visible or behaves differently.
8. Verify icon-only buttons have one accessible name, useful tooltip text where appropriate, and no duplicate spoken label.

### Geometry audit

1. Measure container box, SVG/image box, optical alignment, baseline, stroke width, opacity, and gap for every role.
2. Compare Lucide, image, and emoji variants in the same component. Their occupied boxes must remain stable when switching sources.
3. Check SVGs and images at 100%, 125%, and 200% browser zoom for clipping or blur.
4. Check image `object-fit`, aspect ratio, fallback replacement, and layout shift.
5. Check icon state behavior: hover color/opacity, active feedback, selected treatment, disabled treatment, and reduced motion.
6. Verify user-selected icon colors are not accidentally overridden by generic SVG rules.

### Required evidence

Create an icon matrix in the report with columns:

`Role | Site | Lucide | URL | Upload path | Emoji | Empty | Error fallback | Box | SVG/img size | Stroke | State behavior | A11y | Result`

### Exit criteria

- 100% of configurable icon sites are classified.
- Every equivalent role has one canonical size/behavior.
- Every broken three-branch path has a failing production-source test before remediation.

---

## Initiative 4: Audit surfaces, borders, shadows, highlights, and corner behavior

**Objective:** Find visual depth treatments that do not belong to the shared glass/skeuomorphic theme or contradict adjacent components.

**Files:**

- Primary: `style.css`
- Supporting: JavaScript files with `style.cssText`, `.style.boxShadow`, `.style.border*`, `.style.background`, `.style.opacity`, `.style.filter`, or radius assignments
- Report: `docs/audits/wartab-ui-ux-consistency-audit.md`

### Steps

1. Group every surface by semantic elevation: background, card, inset/input, elevated control, top bar, panel, modal, toast, drag ghost, and transient highlight.
2. Compare each surface’s background alpha, backdrop blur, border, inner bevel, outer shadow, and highlight pseudo-element against its semantic elevation.
3. Identify near-duplicate one-off values that should resolve to the same semantic token.
4. Flag shadows that are unusually bright, large, colored, multi-ringed, or directionally inconsistent without a semantic reason.
5. Audit arrange-mode green/red glows separately; retain clear mode/error semantics while checking that intensity and transition still belong to WarTab.
6. Inspect every `::before`/`::after` highlight for stacking, pointer-event pass-through, content occlusion, border thinning, and reduced-motion behavior.
7. Check default, hover, selected/editing, panel-open blur, dragging, and disabled surface states side by side.
8. Detect late duplicate rules where the final cascade conflicts with the base component contract. The current late “VISUAL EXCELLENCE” section must be reconciled selector by selector, not merely deleted.
9. Audit corner behavior against the configurable sharp-corner default. Flag hardcoded `--radius-*`, numeric radii, and pill/circle treatments that remain rounded when the component is not semantically circular.
10. Preserve true circles where geometry communicates meaning, such as a status dot, spinner, or circular gauge.
11. Verify light card mode and custom accent do not introduce stronger borders, washed-out shadows, or unreadable highlights.

### Required evidence

Create a surface matrix:

`Surface role | Selector/site | Background | Border | Inner highlight | Shadow | Radius | Hover | Selected | Light mode | Tokenized | Result`

### Exit criteria

- Every shared surface maps to a semantic depth role.
- Every raw shadow/border/highlight is either mapped to a token or documented as an intentional exception.
- No pseudo-element intercepts interaction or sits above content unintentionally.

---

## Initiative 5: Audit interaction feedback and behavioral consistency

**Objective:** Ensure identical actions communicate clickability, selection, focus, progress, success, failure, and disabled state in the same way.

**Files:**

- CSS: `style.css`
- Fixed interactions: `index.html`, `pages.js`, `app.js`, `config-panel.js`, `edit-panel.js`, `page-editor.js`, `section-editor.js`, `icon-picker.js`, `uploads.js`, `modals.js`
- Reordering: `dragdrop.js`, `arrange-mode.js`, `page-drag.js`
- Modules: all interactive `modules/*.js`
- Test: `tests/ui-consistency.test.js`

### Steps

1. Build an exhaustive list of native and scripted interactive elements: buttons, anchors, tab controls, editable titles, contenteditable notes, dropdown headers, drag handles, cards used as selectors, upload areas, picker tiles, and keyboard shortcuts.
2. For each role, verify state coverage from the canonical matrix.
3. Find hover-only disclosure. Confirm touch/coarse-pointer users can always reach edit, delete, drag, and gap controls.
4. Search hover rules and JavaScript mouseenter/mouseleave handlers for transform/translation/scale. WarTab hover motion must use border/shadow/background/color/opacity only.
5. Normalize active/pressed feedback by family. Avoid different scale/translate combinations for equivalent buttons.
6. Verify focus order starts at the top-level actions, enters open panels/modals predictably, and does not remain behind overlays.
7. Verify `Escape` behavior closes the topmost open layer and restores focus to its opener.
8. Verify panel overlays, modal overlays, and card blur/highlight states cannot leave the app visually stuck after close, save, delete, or error.
9. Verify dropdown/accordion arrows, open-state styling, and animation durations are consistent across cards, design-system sections, and editor sections.
10. Verify destructive controls use consistent danger styling and confirmation language.
11. Verify save, upload, restore, delete, add, retry, and polling actions expose consistent loading/success/error feedback and prevent accidental double submission where applicable.
12. Verify drag cursor (`grab`/`grabbing`), drag ghost, source opacity, drop target, and completion feedback use one interaction language across cards, pages, sections, and links.
13. Verify animation toggle and reduced-motion mode suppress all nonessential movement without removing state visibility.

### Exit criteria

- Every interactive element is accounted for.
- No action is available only through hover on coarse pointers.
- Keyboard focus is visible on all interactive families.
- Equivalent control families have equivalent state behavior.

---

## Initiative 6: Audit panels, forms, pickers, dialogs, and feedback layers

**Objective:** Make configuration and editing workflows feel like one system rather than separately styled tools.

**Files:**

- `index.html`
- `style.css`
- `form-helpers.js`
- `config-panel.js`
- `edit-panel.js`
- `page-editor.js`
- `section-editor.js`
- `icon-picker.js`
- `uploads.js`
- `modals.js`
- `core.js` toast helpers

### Steps

1. Open and capture config, edit, icon picker, background picker, confirmation modal, help modal, toast, and undo toast in both dark and light modes.
2. Compare headers, close controls, titles, icon treatment, body padding, section grouping, divider treatment, action rows, overlay opacity, panel shadow direction, and scrolling behavior.
3. Compare all form-control roles across config, page editor, card editor, section editor, and module-specific editors.
4. Inventory helper-generated controls versus hand-built inline controls. Flag same-purpose controls that bypass `form-helpers.js` and therefore drift in typography, spacing, border, focus, or disabled behavior.
5. Verify field labels are programmatically associated, validation/errors are adjacent and actionable, and required/disabled state is clear.
6. Check sticky/footer action areas and destructive actions for visual priority and accidental proximity.
7. Check picker-grid tile size, selected state, hover, keyboard navigation, loading/no-result/error state, and image/emoji/Lucide equivalence.
8. Check upload and background thumbnails for matching delete controls, borders, hover, focus, image ratio, and filename truncation.
9. Check mobile bottom-sheet behavior, safe areas, scroll containment, focus visibility, and close affordance.
10. Flag inline style clusters that make equivalent panel controls impossible to theme consistently.

### Exit criteria

- All panels share one header/body/action structure unless a documented UX reason differs.
- Form controls of the same role are visually and behaviorally equivalent.
- All feedback layers are readable, dismissible, keyboard reachable, and responsive.

---

## Initiative 7: Audit every module as part of one design system

**Objective:** Find module-level visual and UX drift while preserving module-specific information design and artwork.

**Files:**

Audit all registered modules:

- `modules/api-poller.js`
- `modules/ascii-anim.js`
- `modules/clock.js`
- `modules/digital-pet.js`
- `modules/git.js`
- `modules/iframe.js`
- `modules/image.js`
- `modules/lan-scan.js`
- `modules/link-list.js`
- `modules/links.js`
- `modules/media.js`
- `modules/notes.js`
- `modules/proxmox.js`
- `modules/quotes.js`
- `modules/resource-monitor.js`
- `modules/search.js`
- `modules/timer.js`
- `modules/weather.js`

### Per-module matrix

Render each module at:

- Widths 1 through the maximum valid configured width.
- Heights 1 through 4 where supported.
- Compact, standard, and comfortable density.
- Small, medium, and large scale.
- Dark and light card mode.
- Default and high-contrast custom accent.
- Loading, configured success, empty/unconfigured, no-data, offline/error, and stale states where applicable.
- Desktop and mobile/coarse-pointer layouts.

### Per-module checks

1. Header, icon, title, status, content, secondary content, action, and footer structure.
2. Shared token use for typography, spacing, borders, surfaces, state colors, and transitions.
3. Inline styles that duplicate shared component rules.
4. Metric bars, status dots, badges, charts, values, units, timestamps, and labels compared across data modules.
5. Loading skeleton, empty state, retry, error, and offline language compared across asynchronous modules.
6. Control discoverability and state feedback for interactive modules.
7. Content overflow, truncation, wrapping, canvas/image sizing, and minimum useful card size.
8. Module-specific decorative artwork separated from shared chrome. Digital-pet and ASCII artwork may use bespoke values; their surrounding controls and states must still follow the shared system.
9. Whether the module uses `design-system.js` helpers correctly or recreates near-identical structures.
10. Visual hierarchy: primary value, secondary context, and tertiary metadata.

### Scoring

Score each module from 1–10 on:

- Icon consistency.
- Shared component compliance.
- Visual hierarchy.
- Information density.
- Interaction consistency.
- State completeness.
- Responsive behavior.
- Accessibility.

Scores must cite concrete evidence. They are triage aids, not aesthetic grades.

### Exit criteria

- All 18 modules have a completed matrix and scorecard.
- Cross-module problems are grouped into shared root causes before recommending module-local patches.
- Decorative exceptions are explicitly separated from shared chrome defects.

---

## Initiative 8: Audit responsiveness, accessibility, and perceptual consistency

**Objective:** Verify that the design remains coherent across screen sizes, zoom, input methods, motion preferences, and visual limitations.

**Files:**

- `index.html`
- `style.css`
- All files creating dynamic interactive elements
- Report: `docs/audits/wartab-ui-ux-consistency-audit.md`

### Steps

1. Test the viewport matrix from Initiative 1 with no horizontal scrollbar and no unreachable actions.
2. Test browser zoom at 100%, 125%, 200%, and 400% for core navigation, panels, and representative modules.
3. Test keyboard-only operation: Tab, Shift+Tab, Enter, Space, Escape, arrow keys where tabs/pickers require them, and existing shortcuts.
4. Verify focus rings are not clipped by `overflow: hidden`, pseudo-elements, or panel edges.
5. Measure coarse-pointer targets. Primary mobile controls should meet a 44×44 CSS-pixel target unless an equivalent larger hit area is proven.
6. Verify icon-only buttons have accessible labels and dynamic state is exposed where necessary (`aria-expanded`, selected/current state, disabled state, and live status).
7. Verify selected/open/error/success/disabled states are not communicated only by color.
8. Check text and non-text contrast for default dark, light, and representative custom accent themes. Flag user-configurable combinations that need automatic contrast/fallback behavior separately from fixed-theme defects.
9. Verify reduced motion and animations-off preserve state changes without moving shadows, transforms, or long fades.
10. Verify background images, blur, dimming, and card opacity do not make text/borders illegible.
11. Check responsive breakpoint handoffs at 1199/1200, 768/769, 600/601, and 380/381 pixels, not only the nominal widths.
12. Verify extension output matches the self-hosted UI at the same config and viewport, allowing only environment-specific capability messaging.

### Exit criteria

- Core workflows are keyboard and touch operable.
- No breakpoint handoff produces an abrupt style or behavior mismatch.
- Mode/theme differences retain the same component hierarchy and state language.

---

## Initiative 9: Publish findings and approve the consistency target

**Objective:** Convert evidence into a prioritized, reviewable remediation backlog before changing shared visual contracts.

**File:**

- Complete: `docs/audits/wartab-ui-ux-consistency-audit.md`

### Report structure

1. Executive summary and consistency score.
2. Confirmed high-impact findings.
3. Icon matrix and icon findings.
4. Surface/border/shadow/highlight matrix.
5. Interaction-state coverage matrix.
6. Panels/forms/dialogs findings.
7. Module scorecards.
8. Responsive/accessibility findings.
9. Token and cascade metrics.
10. Intentional exceptions.
11. Quick wins.
12. Shared root-cause remediations.
13. Module-local remediations.
14. Risks and design decisions requiring user confirmation.
15. Before-state screenshot index.

### Prioritization order

1. Broken or misleading interactions and inaccessible states.
2. Broken icon source branches and semantic mismatches.
3. Shared component/cascade conflicts affecting many screens.
4. Theme/token drift in recurring surfaces.
5. Panel/form/editor inconsistencies.
6. Cross-module consistency.
7. Minor optical polish.

Do not begin a subjective visual change if the report marks it “Needs design decision.” Present that item with side-by-side evidence first.

---

# Remediation Phase

## Initiative 10: Lock shared icon and component contracts with tests

**Objective:** Make the agreed consistency rules executable before visual fixes.

**Files likely to change:**

- `tests/ui-consistency.test.js`
- `tests/core.test.js`
- `tests/theme.test.js`
- `tests/browser-harness.js`
- `core.js`
- `render.js`
- `design-system.js`

### Steps

1. Write failing tests for every confirmed icon branch defect and shared-state defect.
2. Centralize configured icon construction behind one production helper where call-time load order permits it. Keep role classes in CSS rather than assigning dimensions inline.
3. Ensure the helper supports Lucide, image URL/path/data URL, emoji, empty/default, image failure fallback, and post-insertion hydration.
4. Add source-level guard tests that every configurable icon renderer delegates to the shared contract or implements an explicitly approved equivalent.
5. Add tests for icon-only accessible names and expected role classes.
6. Add tests that reject hover transforms on cards, buttons, links, tabs, and picker tiles while allowing approved active/drag transforms.
7. Add tests for focus-visible and disabled-state coverage by interactive family.
8. Keep generated markup contracts stable except where the audit approved a semantic/accessibility correction.

### Verification

```bash
npm test -- tests/ui-consistency.test.js tests/core.test.js tests/theme.test.js
npm test
```

---

## Initiative 11: Consolidate semantic tokens and cascade ownership

**Objective:** Give each shared visual property one owner and remove conflicting duplicate component definitions.

**Files likely to change:**

- `style.css`
- `theme.js` only where runtime token assignment is required
- `design-system.js` only where inline shared styles must become role classes

### Steps

1. Add or refine semantic tokens only for repeated, approved roles: surface levels, border levels, focus ring, shadow levels, highlight levels, icon sizes, and component transition contracts.
2. Preserve user-driven values such as accent, card background, blur, opacity, radius, type size, and layout.
3. Reconcile duplicate selectors property by property. Merge complementary declarations; do not blindly delete the earlier or later block.
4. Remove empty state rules and dead transition properties only after proving no runtime use.
5. Make the configured/default sharp-corner behavior flow through shared controls and surfaces. Retain circles and approved semantic exceptions.
6. Replace repeated one-off borders/shadows/highlights on shared chrome with semantic tokens.
7. Reduce `!important` only where cascade ownership makes it unnecessary. Keep and comment the cases genuinely needed to override runtime inline styles, mobile layout, or light-theme behavior.
8. Move static shared inline style bundles to CSS role classes. Leave dynamic geometry, progress values, drag coordinates, user colors, and measured dimensions inline.
9. Re-run the metrics after each component family rather than making one monolithic stylesheet patch.

### Verification

```bash
npm test
node --check design-system.js
node --check theme.js
git diff --check
```

Expected:

- One authoritative shared rule per component family/state.
- Metrics improve without arbitrary “zero hardcoded values” goals.
- Custom theme controls still change the intended values live.

---

## Initiative 12: Normalize icons and interaction states by component family

**Objective:** Correct approved icon and state inconsistencies in cohesive batches.

**Files likely to change:**

- `pages.js`
- `page-editor.js`
- `edit-panel.js`
- `config-panel.js`
- `icon-picker.js`
- `uploads.js`
- `app.js`
- `index.html`
- `stats.js`
- `style.css`
- `design-system.js`

### Batch order

1. Top bar, brand, page tabs, and global action buttons.
2. Card headers, section headers, link-grid icons, and link-row icons.
3. Config/edit/page/section editor previews and controls.
4. Icon/background picker tiles and upload thumbnails.
5. Empty/loading/error/status icons and feedback layers.
6. Drag/arrange affordances.

For each batch:

1. Write or update the failing production-source test.
2. Apply the shared role class/helper.
3. Verify Lucide, image, emoji, empty, and broken-image cases.
4. Verify default, hover, active, focus-visible, selected, disabled, and coarse-pointer states.
5. Capture before/after at desktop and mobile.
6. Run the targeted test and the full JavaScript suite before moving on.

---

## Initiative 13: Normalize panels, forms, dialogs, and shared feedback

**Objective:** Apply the approved component contract to every editing/configuration workflow.

**Files likely to change:**

- `form-helpers.js`
- `config-panel.js`
- `edit-panel.js`
- `page-editor.js`
- `section-editor.js`
- `icon-picker.js`
- `uploads.js`
- `modals.js`
- `core.js`
- `style.css`

### Steps

1. Migrate same-purpose controls to the existing form helpers or shared CSS roles where behavior is equivalent.
2. Keep unique complex editors local, but compose them from the same field, label, action, icon, and state roles.
3. Normalize panel headers, close controls, body spacing, section headings, dividers, scroll behavior, and action rows.
4. Normalize loading, empty, success, error, retry, undo, confirmation, and destructive states.
5. Add focus management and ARIA state corrections identified by the audit.
6. Verify dark/light mode, mobile bottom sheets, reduced motion, and custom accent after every panel family.

---

## Initiative 14: Normalize modules in shared-root-cause batches

**Objective:** Bring all modules into the common design system without flattening useful module-specific presentation.

### Batch A: Data/status modules

- `modules/api-poller.js`
- `modules/git.js`
- `modules/media.js`
- `modules/proxmox.js`
- `modules/resource-monitor.js`
- `modules/weather.js`
- `modules/lan-scan.js`

Normalize headers, status indicators, labels/values/units, metric bars, timestamps, loading/offline/error states, and quick actions.

### Batch B: Content/input modules

- `modules/links.js`
- `modules/link-list.js`
- `modules/search.js`
- `modules/notes.js`
- `modules/quotes.js`
- `modules/timer.js`
- `modules/clock.js`

Normalize icons, focus/active feedback, editable states, helper text, action buttons, typography roles, and empty states.

### Batch C: Media/decorative modules

- `modules/image.js`
- `modules/iframe.js`
- `modules/ascii-anim.js`
- `modules/digital-pet.js`

Normalize shared card chrome, controls, loading/error behavior, and responsive containment while preserving artwork and content-specific geometry.

### Per-batch process

1. Fix shared helper/token/root cause before module-local CSS.
2. Replace static inline shared chrome with CSS classes; retain dynamic art/data geometry.
3. Test all widths, heights, density/scale variants, modes, and states from the module matrix.
4. Capture the complete batch in one before/after contact sheet or indexed screenshot set.
5. Run tests and verify no module console errors before the next batch.

---

## Initiative 15: Complete live, extension, and independent-review verification

**Objective:** Prove the consistency work is coherent, regression-free, and actually deployed from current source.

### Automated checks

```bash
npm test
python3 -m unittest discover -s tests -v
for f in *.js modules/*.js tests/*.js; do node --check "$f"; done
python3 -m py_compile server.py server_config.py server_defaults.py server_files.py server_network.py server_startup.py stats.py
git diff --check
bash extension/build.sh all
```

### Live verification

1. Restart the self-hosted service only after all source checks pass.
2. Verify local and hosted pages load the current build identifier and current stylesheet/script assets.
3. Re-run the full viewport/theme/input/state screenshot matrix.
4. Compare before/after evidence for every resolved finding ID.
5. Verify zero unexpected console errors, failed assets, horizontal overflow, clipped controls, or stuck overlay/blur states.
6. Exercise core workflows:
   - Page switch, page add/edit/reorder/delete.
   - Card add/edit/reorder/delete/undo.
   - Section collapse/edit/reorder.
   - Icon selection for Lucide, upload path, URL, and emoji.
   - Config/theme changes and restore/reset flows.
   - Keyboard shortcuts, Escape close, and focus restoration.
   - Touch/coarse-pointer access to edit and arrange controls.
7. Load representative generated Chrome, Edge, and Firefox extension packages and compare against the self-hosted UI with the same config.

### Independent review

Dispatch independent reviewers after the remediation is complete:

1. **Icon reviewer:** Find any remaining role, branch, size, stroke, alignment, semantic, fallback, or state mismatch.
2. **Surface/state reviewer:** Find inconsistent borders, shadows, highlights, radius, hover, active, focus, disabled, selected, drag, and feedback treatment.
3. **Responsive/module reviewer:** Inspect all modules and viewport/mode combinations for hierarchy, overflow, touch, accessibility, and cross-module drift.

Reviewers must cite exact source locations and distinguish confirmed defects from subjective preferences. Resolve confirmed blockers with tests and rerun the entire verification chain before completion.

---

## 6. Final acceptance criteria

The UI/UX consistency work is complete only when:

### Icons

- Every configurable icon site passes Lucide, URL, uploaded path, data URL, emoji, empty, and failed-image tests.
- Equivalent icon roles use one canonical container/rendered size, alignment, stroke, opacity, and state behavior.
- No uploaded icon path renders as literal text.
- All icon-only controls have accessible names.

### Surfaces and theme

- Every recurring surface, border, shadow, and highlight maps to a semantic role or a documented intentional exception.
- Shared selectors have one authoritative cascade owner; late overrides no longer contradict base component contracts.
- The default/configured sharp-corner behavior is respected by non-circular shared components.
- Dark/light/custom-accent modes retain the same hierarchy and readable contrast.
- No decorative pseudo-element obscures content or intercepts interaction.

### Interactions

- Equivalent controls provide equivalent hover, active, focus-visible, selected/open, disabled, loading, success, error, and coarse-pointer behavior where applicable.
- No hover transform/lift exists on cards, buttons, links, tabs, or picker tiles.
- Pressed, dragging, and deliberate transition transforms remain narrowly scoped and reduced-motion safe.
- Hover-revealed controls remain accessible on touch.
- Open panels/modals manage focus, Escape, overlays, and restoration correctly.

### Modules and responsiveness

- All 18 registered modules have completed scorecards and pass their relevant width/height/density/scale/state matrix.
- No viewport/breakpoint in the audit matrix has horizontal overflow or unreachable controls.
- Self-hosted and extension builds use the same component language.
- 200% zoom preserves all core workflows; 400% remains operable for primary navigation/configuration.

### Engineering quality

- Consistency rules are protected by production-source tests rather than copied implementations.
- Dynamic visual values remain dynamic; static shared chrome is class/token driven.
- Existing JavaScript, Python, syntax, diff, and extension checks pass.
- The hosted service is restarted and verified against the current build.
- Three independent review passes report no unresolved high-severity consistency defects.
- The final report maps every original finding ID to `Resolved`, `Intentional Exception`, or `Deferred — needs design decision` with evidence.

---

## 7. Likely files changed during execution

The audit itself creates only tests, report, and evidence. Remediation is expected to touch a subset of:

- `style.css`
- `design-system.js`
- `core.js`
- `render.js`
- `theme.js`
- `pages.js`
- `app.js`
- `config-panel.js`
- `edit-panel.js`
- `page-editor.js`
- `section-editor.js`
- `icon-picker.js`
- `uploads.js`
- `modals.js`
- `form-helpers.js`
- `stats.js`
- `dragdrop.js`
- `arrange-mode.js`
- `page-drag.js`
- Confirmed outlier files under `modules/`
- `tests/ui-consistency.test.js`
- Existing focused tests where behavior changes
- `docs/audits/wartab-ui-ux-consistency-audit.md`

Do not modify every listed file by default. Touch only files connected to confirmed findings.

---

## 8. Risks and controls

- **Risk: consistency becomes sameness.** Control: classify semantic/decorative exceptions before remediation.
- **Risk: token consolidation changes user themes.** Control: test default, light, custom accent, custom opacity/blur/radius, and animation settings after each shared-token batch.
- **Risk: cascade cleanup silently changes unrelated modules.** Control: reconcile one selector family at a time and capture before/after across representative modules.
- **Risk: replacing inline styles breaks dynamic geometry.** Control: migrate only static shared chrome; retain measured positions, progress widths, canvas dimensions, user colors, and art animation coordinates.
- **Risk: screenshots hide interaction defects.** Control: pair visual evidence with state/keyboard/touch execution and source-level state inventory.
- **Risk: browser runtime is stale.** Control: verify build identifier and loaded asset URLs before every capture round.
- **Risk: subjective reviewer churn.** Control: require every issue to cite the agreed visual contract, canonical component, and user impact.
- **Risk: active uncommitted logic work is overwritten.** Control: inspect current diffs before every batch and never reset/clean/commit without instruction.

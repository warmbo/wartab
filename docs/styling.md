# WarTab — Styling

WarTab's styling is a single large `style.css` (~2,300 lines, ~130 KB) plus
per-module CSS injected at registration (via the `css` field in
`registerModule`). There is no build step and no CSS preprocessor.

## Global stylesheet (`style.css`) organization

The file is organized into comment-delimited sections. The intended layering
(top to bottom, later rules win on equal specificity):

1. **Tokens** — `:root` custom properties: colors, spacing (`--space-*`), text
   size ramp (`--text-*`), z-index (`--z-*`), animation (`--anim-*`), glass
   surface variables.
2. **Base / reset** — element defaults, `* { box-sizing }`, body, links.
3. **Application shell** — `#app`, layout container, top bar.
4. **Top bar** — actions, status display, branding, page tabs.
5. **Dashboard grid** — `#card-grid`, column/gap tokens, responsive columns.
6. **Cards** — `.card`, card header, card accents, gap cards, highlights.
7. **Shared controls** — buttons (`.btn`, `.btn-glass`, `.btn-sm`), inputs,
   toggles, icons.
8. **Panels / modals** — slide panel, modal overlay/box, edit/icon pickers.
9. **Modules** — shared module surface styles (most module-specific styling is
   injected per-module).
10. **States** — `.is-*`/state classes, hover/active/focus/disabled.
11. **Responsive** — media queries (five breakpoint tiers + coarse-pointer).
12. **Accessibility / motion** — `prefers-reduced-motion`, focus-visible.

## Design tokens

Use the existing `:root` custom properties rather than hardcoding values:
- `--space-1 … --space-6` — spacing scale
- `--text-xs … --text-5xl` — type ramp
- `--glass-border`, `--glass-shadow`, `--surface-*` — surface appearance
- `--accent`, `--accent-glow`, `--text-*` — color
- `--z-*` — stacking order
- `--anim-fast/medium/slow` — transition durations

## Per-module CSS

A module can declare a `css` string in `registerModule(type, { css: '…' })`.
`core.js` injects it as `<style id="mod-css-<type>">` idempotently. Prefer this
for widget-local styling over adding to the global `style.css`.

## Known issues (maintainability backlog)

- **~78–81 `!important` declarations**, concentrated in late override/compat
  layers. Consolidation is a goal — do not add more.
- **Five separate `@media (max-width:768px)` blocks** plus stacked polish
  layers (~lines 1700–2300). They work but are brittle.
- **JS-written inline styles** sometimes fight responsive CSS. In particular,
  `render.js` writes `--grid-cols`/gap inline on `#card-grid`, defeating the
  `:root` tablet media rule (AURA-000A). Correct pattern: JS publishes a
  preference; a final CSS layer owns effective presentation.

## Rules for editing CSS

1. Preserve rendered appearance unless fixing a confirmed defect.
2. Never remove a selector until proven unused (grep HTML + all JS first).
3. Don't increase specificity to fix a conflict — fix the source (usually JS
   inline style vs `:root` media rule).
4. No new `!important` unless documented.
5. Consolidate values into tokens only when genuinely reusable.
6. Test responsive + interactive states after every change.
7. For visual/browser-vision review, disable the background image first
   (`#bg-canvas{display:none}` + solid body) for clean recognition.

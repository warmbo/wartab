# Hestia Core vs WarTab — Comparative Audit

## Overview

| Aspect | Hestia Core | WarTab |
|--------|-----------|--------|
| Stars | 681 | — |
| Language | Vanilla JS (ES Modules) | Vanilla JS (script-tag) |
| Backend | None (static, optional Docker+Nginx) | Python http.server (port 8081) |
| Persistence | localStorage + IndexedDB | JSON file via server API |
| Modules | 14 apps (class-based) | 17 modules (registerModule) |
| Grid | Virtual grid with collision detection (10×6) | CSS grid (column span only) |
| Icons | Font Awesome | Lucide |
| Edit Mode | Toggle edit mode (lock/unlock layout) | Always-editable (click ✎ per card) |
| Theming | Full Base16 palette system | Accent color + bg gradient |
| License | MIT | MIT |

---

## Key Architecture Differences

### 1. ES Module System (import/export)
Hestia uses a true ES module architecture with `import`/`export`. WarTab uses script-tag ordering with global variables. Hestia's approach enables:
- **Explicit dependency graph** — `import` statements declare dependencies
- **Tree-shaking** — unused exports are dropped
- **No load-order bugs** — the module runtime handles resolution
- **Isolated scope** — no global namespace pollution

**WarTab impact**: The `registerModule()` / `CARD_MODULES` pattern works well but depends on script load order (core.js → render.js → app.js → modules/*.js). This is brittle — adding a new module requires editing index.html to add a `<script>` tag. ES modules would eliminate this.

### 2. Centralized State with Pub/Sub (state.js)
Hestia has a single `state` object with `setState(path, value)` and `subscribe(listener)`. Components don't poll or re-render everything — they subscribe to the specific paths they care about.

WarTab uses global variables (`config`, `config.cards`, `config.theme`, etc.) and `renderAll()` to redraw everything on any change. The pub/sub pattern enables:
- Targeted re-renders (only affected cards update)
- Grid reacts to theme changes without full rebuild
- Side-effect separation (subscriptions decouple components)

**WarTab impact**: `renderAll()` is the hammer for every nail. A pub/sub layer would let individual cards re-render themselves without rebuilding the entire page.

### 3. Virtual Grid (virtualGrid.js)
Hestia implements a proper `VirtualGrid` class with:
- Matrix-based collision detection (2D array)
- Multi-case move resolution: free move, atomic swap, reverse clearance
- 1-indexed coordinates (x, y from 1-10)
- Bounds checking before DOM manipulation

WarTab uses CSS Grid (`grid-column: span N`) with no collision detection. Card positions are array indices, not coordinates. Drag-to-reorder works by swapping array positions. This limits:
- No overlapping prevention
- No complex grid operations (multi-card swap)
- No grid coordinate system for layout persistence

**WarTab impact**: Adding a virtual grid would enable proper drag-and-drop with position coordinates (like Hestia's x/y system), collision resolution, and more sophisticated layouts.

### 4. Declarative Settings Schema
Hestia defines app settings as data:
```js
settings: [
  { name: 'lat', label: 'Latitude', type: 'text', placeholder: 'e.g. 51.50' },
  { name: 'lon', label: 'Longitude', type: 'text', placeholder: 'e.g. -0.12' }
]
```
The settings panel auto-renders inputs from this schema — no manual editor function needed.

WarTab requires a full `editor(sec, card, bd)` function per module that manually creates DOM elements using `cpInput`, `cpSelect`, etc. This is 30-80 lines of boilerplate per module.

**WarTab impact**: A declarative settings DSL would eliminate 60% of module editor code. Modules would declare their settings as a JSON array and the editor framework would auto-render the form.

### 5. App-Scoped CSS
Hestia bundles CSS per app in the registration metadata:
```js
registry.register('weather', WeatherApp, {
  css: `.app-type-weather { ... }`
});
```
CSS is auto-injected into `<head>` on registration and namespaced to the app type.

WarTab puts all module CSS in `style.css` (1012 lines). Adding a module requires editing style.css. This violates the Rule 3 (keep files small) and makes modules less portable.

**WarTab impact**: Auto-injected per-module CSS would make modules self-contained, reduce style.css bloat, and make new modules drop-in additions.

### 6. Two-Phase Rendering (render → onMount)
Hestia splits rendering into two phases:
- `render(app)`: Returns HTML string (synchronous, idempotent)
- `onMount(el, app)`: Called after DOM insertion (async data fetching, event binding)

WarTab uses a single `render(sec, card, cw)` callback that both creates DOM and (sometimes) triggers async fetches in the same function.

**WarTab impact**: The split is cleaner for async modules. Render returns the skeleton immediately, onMount fills in data. No need for the `fetchWeather(w)` hack I just added — it would be automatic.

### 7. Free Weather API (Open-Meteo)
Hestia uses Open-Meteo (free, no API key, no registration). WarTab uses OpenWeatherMap (requires API key). Open-Meteo is:
- Completely free (no rate limits for personal use)
- No API key needed — zero setup friction
- Global coverage, standard weather codes

**WarTab impact**: Switching to Open-Meteo would eliminate the API key requirement for weather. Users would just set lat/lon instead of zip + API key.

### 8. Toggle Edit Mode
Hestia has a global edit mode toggle. The dashboard is "locked" by default — no edit buttons visible. Clicking the edit button unlocks the grid for drag/resize/add. This is cleaner than WarTab's always-visible ✎ button per card.

**WarTab impact**: A toggle-edit-mode approach reduces visual clutter. Cards would only show edit controls when in edit mode. Could also prevent accidental changes.

### 9. Import/Export with Clean Mode
Hestia's settings panel has export with two modes:
- **Clean (Shareable)**: Strips API keys, passwords, tokens. Safe to share.
- **Full Backup**: Everything including secrets.

**WarTab impact**: This is a good UX pattern. WarTab has `snapshot delete` but no clean-export for sharing themes without leaking credentials.

### 10. Markdown Notes
Hestia uses Markdown for notes (parseMarkdown + render). WarTab uses contentEditable with innerHTML. Markdown is:
- Portable (works everywhere, no DOM dependency)
- Safer (no XSS from innerHTML)
- Editable as plain text
- Version-control friendly

---

## Recommended Improvements for WarTab

### P1 — High Impact, Low Risk

1. **Open-Meteo Weather** — Replace OpenWeatherMap with Open-Meteo. No API key needed. Users set lat/lng instead of zip. Removes a major friction point. Estimated: 1 file, ~20 lines changed.

2. **Declarative Settings DSL** — Add `registerModule(type, {defaults, render, editor, settings: [...]})` where `settings` is an optional JSON schema. When present, the section-editor auto-generates the editor UI instead of calling the `editor` function. Keep `editor` as a fallback for complex cases. Estimated: +50 lines in section-editor.js, -50% editor code per module.

3. **Per-Module CSS Injection** — Allow modules to declare CSS in registration metadata. Inject into `<head>` on module load. Start migrating module-specific CSS out of style.css. Estimated: +20 lines in core.js.

### P2 — Medium Impact, Medium Risk

4. **State Pub/Sub** — Add a simple `EventBus` or `subscribe(path, callback)` system to replace `renderAll()` hammer. Start with the weather/clock/resource-monitor refresh cycles — subscribe to config changes instead of re-rendering everything. Estimated: +60 lines in core.js, incremental migration.

5. **Two-Phase Render** — Change `registerModule` to accept `render(sec, card, cw)` (skeleton) + `onMount(cw, sec, card)` (data fetch). Keeps async widgets from staying in "Loading..." state after soft-save. Estimated: +20 lines in render.js, per-module changes.

6. **Toggle Edit Mode** — Add `_editMode` flag to config. When off, hide all ✎ buttons and drag handles. Single button in toolbar to toggle. Estimated: +40 lines in app.js + style.css.

### P3 — Lower Impact, Higher Risk

7. **Virtual Grid** — Replace CSS-grid-based positioning with coordinate-based virtual grid (x, y, cols, rows). This is a major architectural change. Would enable proper drag-and-drop, collision detection, and multi-card swap. Only worth it if grid complexity grows significantly.

8. **ES Module Migration** — Convert from `<script>` tags to ES modules. Would require restructuring all files and adding a build step or importmap. High effort for cosmetic improvement — the current module pattern works.

9. **Markdown Notes** — Replace contentEditable with a textarea + Markdown renderer. Would lose rich-text editing but gain portability. Trade-off depends on user preference.

---

## Concrete Next Steps

1. **Switch weather to Open-Meteo** — trivially replaces OpenWeatherMap with a free, keyless API. Just lat/lon and a fetch URL change.
2. **Add settings schema support** — the biggest code-reduction win. Most module editors are 30-80 lines of boilerplate that could be 5 lines of JSON.
3. **Inject per-module CSS** — start extracting module-specific styles from style.css into module registration data.

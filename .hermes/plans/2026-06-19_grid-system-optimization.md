# Dashboard Grid System Optimization — Audit & Implementation Plan

## 1. Grid Audit

### Layout Engine (Current)
- CSS Grid with `--grid-cols` variable (default: 4)
- `grid-column: span N` via `data-width` attribute (1-4)
- `grid-row: span N` for height > 1 cards
- Single-column collapse at 768px

### Strengths
- CSS Grid is the right foundation — declarative, responsive
- Data-attribute-based spanning is clean
- Gap/spacing is uniform via CSS variable

### Weaknesses

| Issue | Severity | Detail |
|-------|----------|--------|
| **No tablet breakpoint** | High | Desktop 4-column → mobile 1-column. Nothing for tablet (768-1200px) |
| **Arbitrary card sizes** | Medium | Width is 1-4, height is 1-4 with no standardized ratios |
| **Row height not aligned** | High | `align-items: stretch` makes short cards as tall as tall ones |
| **`equalizeCardHeights` is fragile** | Medium | Uses rAF + `min-height` — races with layout, unreliable on resize |
| **No grid-gap aware insertion** | Medium | DnD insertion between rows uses row bounding boxes, ignores CSS gap |
| **Single-column mobile is extreme** | High | 4→1 column collapse wastes screen on ~500px tablets |
| **No `grid-auto-rows` sizing** | Medium | Rows auto-size to content with no minimum consistency |
| **Performance on 30+ cards** | Medium | `renderAll()` destroys and rebuilds everything; no diffing |
| **Gap cards not part of grid flow** | Low | `_isGap` cards are regular cards styled differently — OK but uses hacks |
| **Accessibility** | Medium | Drag handles have no aria roles, keyboard not supported for reorder |

### Comparison to Industry Standards

| Feature | Grafana | Home Assistant | WarTab |
|---------|---------|---------------|--------|
| Breakpoints | 4 tiers (mobile→wide) | 3 tiers | 2 tiers (desktop→mobile only) |
| Card sizes | Fixed grid units | Section-based auto | Arbitrary 1-4 span |
| DnD placeholder | Semi-transparent card | Blue insertion line | Accent bar |
| Layout persistence | Per-dashboard JSON | Per-user storage | Config JSON (good) |
| Virtualization | No (panel count small) | No | N/A (card count is fine) |

## 2. Improvement Roadmap

### Phase 1 — High Impact, Low Effort (this session)

1. **Add tablet breakpoint (768-1200px → 2-column)** — single CSS change, huge win for tablet users
2. **Add `grid-auto-rows` for consistent row sizing** — stops `equalizeCardHeights` from fighting the grid
3. **Standardize card height calculation** — replace magic numbers with CSS `min-height` based on grid units

### Phase 2 — Medium Impact, Medium Effort (next session)

4. **Improve DnD insertion point precision** — already done (insertion bar + row gap detection)
5. **Define standardized card size presets** — Small (1×1), Medium (1×2), Large (2×2), XL (2×3/2×4) with enforced aspect ratios
6. **Add keyboard reorder support** — Tab to focus drag handle, arrow keys to move

### Phase 3 — Lower Priority

7. **Virtual DOM diffing for renderAll** — skip full rebuild when only config changes
8. **CSS container queries** — make link-grid and section content adapt to card width
9. **Animation-on-empty-state** — smooth transitions when cards appear/disappear

## 3. Technical Design

### Responsive Breakpoints

```
Mobile:  <768px         → 1 column (current, works well)
Tablet:  768-1199px     → 2 columns
Desktop: 1200px+        → 4 columns (current)
```

Implementation: CSS media queries overriding `--grid-cols`. Cards spanning > available columns get capped via `min()`.

### Grid Row Sizing

Replace `align-items: stretch` (which makes all rows the same height) with:
```css
#card-grid { align-items: start; grid-auto-rows: minmax(auto, max-content); }
```

This lets each card take its natural content height while maintaining grid alignment. `equalizeCardHeights()` is no longer needed for basic layout — it can be repurposed as optional "equal height rows" toggle.

### Card Size Presets

Map config values to CSS classes:

| Preset | width | height | CSS |
|--------|-------|--------|-----|
| Small  | 1     | 1      | `grid-column: span 1` |
| Medium | 1     | 2      | `grid-column: span 1; grid-row: span 2; min-height: 220px` |
| Large  | 2     | 2      | `grid-column: span 2; grid-row: span 2; min-height: 260px` |
| XL     | 2     | 3      | `grid-column: span 2; grid-row: span 3; min-height: 380px` |

Cards with explicit `height > 1` get `grid-row: span N` and a proportional `min-height`.

### Persistence

Already handled by `saveConfig()` → `config.json`. No change needed.

## 4. Implementation — Phase 1

### 4a. Add tablet breakpoint (style.css)

Add 2-column layout between 768px-1199px. Cards spanning >2 columns cap to 2.

### 4b. Fix `align-items: stretch` → `align-items: start`

Change `#card-grid` from `align-items: stretch` to `align-items: start`, add `grid-auto-rows: minmax(auto, max-content)`.

This makes cards take their natural height — a small links card won't stretch to match a tall service-grid card.

### 4c. Remove `equalizeCardHeights()` call

Since cards no longer stretch to match row height, the equalization hack is unnecessary for basic layout. Remove the `scheduleEqualize()` call from `renderAll()`.

### 4d. Improve card height sizing

Replace magic height numbers with proportional CSS:

```css
.card[data-height="2"] { min-height: 200px; }
.card[data-height="3"] { min-height: 320px; }
.card[data-height="4"] { min-height: 440px; }
```

## 5. Performance & UX Review

### Expected improvements

| Metric | Before | After |
|--------|--------|-------|
| Tablet layout | Single-column (wasted space) | 2-column (dense) |
| Card row height | All cards = row height | Natural content height |
| equalizeCardHeights | rAF race condition | Removed |
| Responsive tiers | 2 | 3 |
| DnD insertion clarity | Thin border | Accent bar + row-gap detection |

### Accessibility

- Drag handles remain mouse/touch only (Phase 2 for keyboard support)
- Add `role="button"` and `aria-label="Drag to reorder"` to drag handles
- Drop zone uses accent color (contrast OK against dark theme)

### Maintainability

- CSS-driven breakpoints (no JS media queries)
- Grid sizing via CSS variables and data attributes
- `equalizeCardHeights` removal eliminates a rAF timing bug

# WarTab — Phase 6 Module Expansion Report

## Post-Phases 1-5 Assessment

Six phases of improvement are now complete:
1. Design System (shared components, card states)
2. Editor Redesign (collapsible sections, sticky bar, grouped editors)
3. Universal Customization (typography, height variants, font scaling)
4. Discoverability Overhaul (help button, touch controls, overflow arrows)
5. Simplify Complex Modules (presets-first, auto-label, batch add, quick setup)

This document evaluates every module for daily value, identifies gaps, and produces a growth roadmap for each.

---

# Module Evaluations

---

## 1. Clock

**Daily Value**: High. Time is universal.

**Current State**: Time (12/24h), date, calendar, week/day-of-year extras. Settings for format, showDate, showCalendar. Height-based responsive. Scale/typography controls.

**Why keep visible daily**: Everyone needs the time. The calendar provides at-a-glance month view.

**What's missing**:
- Timezone support (add second timezone for remote team, family in another zone)
- World clocks (configure multiple cities)
- Sunset/sunrise times (daily relevance)
- Configurable date format (ISO, EU, US)

**What appears at larger sizes**: Currently same content at all heights — spacing scales only.

**Missing customization**: Timezone override (currently uses browser locale).

**Missing actions**: None needed — clock is informational.

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Second timezone | Small | High | Medium |
| Configurable date format | Small | Medium | Low |
| Sunset/sunrise | Medium | Medium | Low |

---

## 2. Weather

**Daily Value**: High. Weather is universally checked daily.

**Current State**: Current temp, condition icon, wind speed, 5-day forecast, "feels like" text, timestamp. Open-Meteo (no API key). Settings for zip, country, units. Scale/typography controls via ds.card().

**Why keep visible daily**: "What's the high today?" is a daily question for most people.

**What's missing**:
- Hourly forecast (temperature by hour for today)
- Weather alerts (NWS integration or similar)
- Radar map link (click to open weather.gov or windy.com)
- Humidity, UV index, pressure (common weather data)
- Location name display ("New York, US")
- Feels-like more prominent (currently a detail)
- Weather icons instead of Lucide (more visually descriptive)

**What appears at larger sizes**: Currently shows forecast in secondary area at all sizes. Could show hourly breakdown at expanded.

**Missing customization**: Show/hide individual data points (wind, humidity, forecast days count).

**Missing actions**: Click to open full forecast on weather website.

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Hourly forecast today | Medium | High | High |
| Click to open radar | Small | Medium | Medium |
| Location name display | Small | Medium | Medium |
| Weather alerts | Medium | Medium | Low |
| Humidity/UV | Small | Low | Low |

---

## 3. Search

**Daily Value**: Very high. Search is the most used new-tab feature.

**Current State**: Search input + button, inline engine tag, Ctrl+K shortcut, search hint.

**Why keep visible daily**: It's a search bar — primary entry point to the web.

**What's missing**:
- **Inline engine switcher**: Currently requires edit panel to change engine. Should have a dropdown next to the search input.
- Search suggestions (browser built-in, but could be more visible)
- Recent searches (stored locally)
- Multiple search layouts (compact vs full-width)
- Focus on page load (optional)

**What appears at larger sizes**: Currently same at all sizes.

**Missing customization**: Engine list, open-in-new-tab toggle.

**Missing actions**: None needed — search bar is inherently actionable.

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Inline engine switcher dropdown | Small | Very high | **High** |
| Focus on page load option | Small | Medium | Medium |
| Recent searches | Small | Low | Low |

---

## 4. Links (grid)

**Daily Value**: High. Bookmarks are the core dashboard use case.

**Current State**: Grid of link buttons with icons, drag-reorder in editor, batch add. Section collapsible in card. List/block mode toggle.

**Why keep visible daily**: Quick access to frequently used services.

**What's missing**:
- **Search within links** (filter links by name as you type)
- Folder/category management (currently uses collapsible sections at the card level)
- Usage tracking (most clicked → auto-sort by frequency)
- Custom link colors per link
- Open-all-in-tabs action per section

**What appears at larger sizes**: Grid gets more columns. No progressive content.

**Missing customization**: Columns override for the link grid, icon size.

**Missing actions**: Click is the action (open URL). Could support right-click context menu (copy URL, open in new tab vs current).

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Search/filter links | Medium | High | Medium |
| Per-link color | Small | Medium | Low |
| Usage tracking | Medium | Low | Low |

---

## 5. Link-List

**Daily Value**: Same as Links but more compact.

**Current State**: Text rows with icons, same editor as Links with listMode. Implementation is a thin wrapper around links module.

**What's missing**: Same as Links — search, usage tracking.

**Growth Roadmap**: Consider merging with Links module (links + listMode flag already does this).

---

## 6. Notes

**Daily Value**: High. Quick notes and scratchpad.

**Current State**: Rich text editor with toolbar (bold/italic/heading/list/code), autosave to server, download .md button, character count, 20-line max-height. Contenteditable-based.

**Why keep visible daily**: Quick jotting, to-do lists, meeting notes.

**What's missing**:
- **Markdown preview/source toggle** (WYSIWYG is nice but markdown is more reliable)
- Multiple notes per section (currently one content block per section)
- Search across all notes
- Pin important notes to top
- Checklist/task tracking (detect `- [ ]` patterns)

**What appears at larger sizes**: Editor gets more lines.

**Missing customization**: Font size override, line-height, dark/light editor background.

**Missing actions**: Download is present. Missing: copy to clipboard, print, share.

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Markdown source toggle | Medium | High | High |
| Search across notes | Medium | Medium | Medium |
| Task tracking (checklist detection) | Medium | Medium | Low |

---

## 7. Quotes

**Daily Value**: Medium. Nice to have but not essential.

**Current State**: Cycling quotes with custom quote editor, "Click to cycle" hint. Fetches from an API + user's custom quotes.

**Why keep visible daily**: Inspiration, humor, or just visual interest on the dashboard.

**What's missing**:
- **Multiple API sources** (currently hardcoded zenquotes API)
- Categories (motivational, tech, random, custom)
- Favorite/bookmark quotes
- Auto-cycle interval setting
- Author filter/custom quote API URL

**What appears at larger sizes**: Quote gets bigger. No additional content.

**Missing customization**: Font for quotes, quote alignment, cycle interval.

**Missing actions**: Share quote, copy to clipboard, open author page.

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Multiple API sources | Small | Medium | Medium |
| Cycle interval setting | Small | Medium | Medium |
| Copy/share quote | Small | Low | Low |

---

## 8. Resource Monitor

**Daily Value**: High for self-hosters, low for general users.

**Current State**: CPU/RAM/Disk/GPU/NET with sparkline graphs, per-metric toggles, IntersectionObserver for pause-when-hidden. Local + Glances sources.

**Why keep visible daily**: System health at a glance.

**What's missing**:
- **Disk usage bars** (current root disk I/O speed, not capacity)
- Process list (top CPU/memory processes)
- Docker container stats (CPU/memory per container)
- Historical data persistence (graphs reset on page load)
- Temperature graph (CPU/GPU temp over time)
- Alert thresholds (highlight when CPU > 80%)

**What appears at larger sizes**: More sparkline detail, process list.

**Missing customization**: Graph colors per metric, refresh rate, metrics shown.

**Missing actions**: Click metric → open system monitor, kill process.

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Disk capacity bars | Small | High | **High** |
| Process list (top 5) | Medium | Medium | Medium |
| Alert thresholds | Medium | Medium | Medium |
| Docker stats | Medium | Medium | Low |
| Historical persistence | Large | Medium | Low |

---

## 9. API Poller

**Daily Value**: High for power users, low for general.

**Current State**: Fetch any JSON API with field mappings, format types, presets (15), grouped editor, auto-label. Direct fetch (no proxy needed).

**Why keep visible daily**: Custom data from any API — server stats, crypto prices, service status.

**What's missing**:
- **Response preview in editor** (click "Test" to see what the API returns)
- Template formatting (custom HTML template instead of just label+value)
- Conditional display (show green when value < threshold, red when >)
- Multiple API calls per section
- Data transformation (string replace, regex)
- Error history (show last error, time of last successful fetch)

**What appears at larger sizes**: More fields visible without scrolling.

**Missing customization**: Card title from API data, refresh-on-focus, method per field.

**Missing actions**: Click value → open detail, refresh button.

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Response preview (Test button) | Small | Very high | **Critical** |
| Conditional formatting | Medium | High | High |
| Error history | Small | Medium | Medium |

---

## 10. Media

**Daily Value**: Medium for media enthusiasts.

**Current State**: Sonarr/Radarr/Plex stats (series count, wanted, queue, sessions). Service definitions with type/URL/key.

**Why keep visible daily**: Media library at a glance.

**What's missing**:
- **Action buttons** (trigger library scan, check for updates)
- Unified search across all services
- Recently added items feed
- Storage usage per service
- Service health check (is it responding?)

**What appears at larger sizes**: More services visible.

**Missing customization**: Order of services, show/hide individual stats per service.

**Missing actions**: Trigger scan, open service in new tab (already has clickable headers).

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Action buttons (scan, update) | Medium | High | Medium |
| Health check indicators | Small | High | Medium |
| Recently added | Medium | Medium | Low |

---

## 11. Git

**Daily Value**: Medium for developers.

**Current State**: Repo stats (stars, forks, issues, language), CI status, 3 forge types. Quick-setup URL paste.

**Why keep visible daily**: Monitor repos without opening browser.

**What's missing**:
- **PR list** (open PRs with status)
- Commit feed (recent commits)
- Release monitoring (latest release version)
- Multi-repo support per section
- Trending stats (stars over time)

**What appears at larger sizes**: More repo info, CI details.

**Missing customization**: Show/hide individual stats, repos to track.

**Missing actions**: Click to open repo, PR, commit.

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| PR list | Medium | High | Medium |
| Multi-repo | Medium | High | Medium |
| Release monitoring | Small | Medium | Low |

---

## 12. Iframe

**Daily Value**: Low for daily use, high for specific use cases.

**Current State**: Embed any URL in an iframe.

**Why keep visible daily**: Only if embedding a specific tool (radar map, admin panel, etc.)

**What's missing**:
- Sandbox attribute controls (security for embedded content)
- Height auto-resize
- URL param passthrough (embed with query parameters)

**Growth Roadmap**: Minimal — iframe is inherently a passthrough module. Sandbox controls would be the only valuable addition.

---

## 13. Image

**Daily Value**: Low.

**Current State**: Display image from URL or upload.

**Why keep visible daily**: Only if used as a photo frame or reference image.

**What's missing**:
- Gallery mode (multiple images, navigate between them)
- Slideshow auto-advance
- Image fit controls (cover, contain, fill)
- Aspect ratio lock

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Gallery/slideshow | Medium | Medium | Medium |
| Fit controls | Small | Low | Low |

---

## 14. Timer

**Daily Value**: Low.

**Current State**: Simple countdown with preset times.

**Why keep visible daily**: Only if using for Pomodoro or cooking.

**What's missing**:
- Multiple timers
- Preset configurations (Pomodoro: 25min, break: 5min)
- Notification on complete (page title flash, sound)
- Named timers

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Page notification on complete | Small | High | **High** |
| Named presets | Small | Medium | Medium |

---

## 15. Digital Pet

**Daily Value**: Low (novelty).

**Current State**: ASCII cat with room, stats (hunger/mood/dirt), feed/pet/clean actions. Network speech.

**Why keep visible daily**: Only for fun/whimsy.

**What's missing**:
- More pet types (dog, robot, slime)
- Achievements/progress
- Actual utility (pet could fetch server status, notify on events)
- Persistent state (survives page reload)

**Growth Roadmap**: Keep as optional fun module. Consider adding utility hooks (pet alerts on server issues).

---

## 16. LAN Scan

**Daily Value**: Low for daily, high for network admins.

**Current State**: ARP scan results with IP/hostname/vendor. Requires server mode.

**Why keep visible daily**: Network device monitoring.

**What's missing**:
- New device alerts
- Persistent device names (override detected hostnames)
- Port scan integration
- Historical device tracking (first seen, last seen)
- Ping monitoring (is device up?)

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| New device alerts | Medium | High | Medium |
| Device name override | Small | High | Medium |

---

## 17. Proxmox

**Daily Value**: Low (niche — Proxmox users only).

**Current State**: VM/CT status with resource usage.

**Why keep visible daily**: Only if managing Proxmox servers.

**What's missing**:
- Quick actions (start/stop/restart VM)
- Console link (open noVNC)
- Backup status and schedule
- Cluster overview
- Alert on high resource usage

**Growth Roadmap**:
| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Start/stop actions | Medium | High | **High** |
| Backup status | Medium | Medium | Medium |

---

## 18. ASCII Animation

**Daily Value**: Low (novelty).

**Current State**: Custom ASCII animation frames with speed control.

**Why keep visible daily**: Only for fun/decoration.

**What's missing**:
- Preset animation library
- Preview in editor
- Multiple animations per section

**Growth Roadmap**: Keep as optional. Preset library would reduce friction.

---

# Top Module Gaps by User Impact

| Module | Gap | Impact |
|--------|-----|--------|
| API Poller | No "Test" button to preview API response | Users guess at field paths, waste time |
| Search | No inline engine switcher | Users must open edit panel to change search engine |
| Resource Monitor | No disk capacity bars | Shows I/O speed but not how full the disk is |
| Clock | No timezone support | Global users need multiple timezones |
| Weather | No hourly forecast | "What's the temp at 3pm?" is a daily question |
| Timer | No page notification on complete | Timers are easily missed |
| Proxmox | No start/stop actions | Read-only status is half the value |

---

# Next Evolution — Audit Proposal

## WarTab Evolution: The Road Ahead

The 6-phase improvement cycle is complete. The dashboard is now:
- **Design-consistent**: Shared components, unified card states
- **Editor-friendly**: Collapsible sections, grouped editors, scroll preservation
- **Customizable**: Typography, scale, density, alignment per module
- **Discoverable**: Help button, touch controls, overflow indicators
- **Simplified**: API presets, auto-label, batch add, quick setup

## Next Evolution Cycle Priorities

### Tier 1: Module Depth (High Impact)

The modules are now consistent and usable. The next cycle should add depth to the modules that earn daily dashboard space.

1. **API Poller: Response Preview** — Add "Test" button in editor that fetches the URL and shows the JSON response. Users can click field paths in the response to auto-fill mappings. This single feature eliminates the #1 cause of API Poller frustration.

2. **Search: Inline Engine Switcher** — Add a dropdown next to the search input so users can switch between Google/DuckDuckGo/Brave without opening the editor. 3 lines of JS, massive discoverability win.

3. **Resource Monitor: Disk Capacity Bars** — Replace the current I/O speed bar with disk capacity percentage for the root filesystem. Show "used/total GB" alongside. Much higher daily relevance than I/O speed.

4. **Weather: Hourly Forecast** — Add an hourly temperature breakdown for today in the secondary area. Fetched from the same Open-Meteo API call (just add `hourly` parameter). Appears at card height >= 3.

5. **Clock: Second Timezone** — Simple dropdown in settings to add a second timezone displayed below the primary time. High value for remote workers.

### Tier 2: Cross-Module Features (Ecosystem)

1. **Module Actions System** — Standardize how modules register click/action handlers. Media module could offer "Scan Library" buttons, Proxmox "Start VM", Git "Open PR". Currently each module implements actions ad-hoc.

2. **Global Search** — Search across all links, notes, and API data from a single search bar. Ctrl+K currently focuses the search widget — extend to be a universal command palette.

### Tier 3: Polish & Performance

1. **Module load time optimization** — Weather and API Poller make external requests on every page load. Add client-side caching with TTL headers.

2. **Config size management** — Large configs with many links/notes can exceed 100KB. Add config compression or lazy-load sections.

3. **Offline resilience** — Currently fails silently when APIs are unreachable. Add retry indicators and stale-while-revalidate patterns.

---

## Key Architectural Decisions for Next Cycle

### 1. Standardize Module Actions API

Current state: Modules add action buttons ad-hoc (digital-pet has feed/pet/clean, media has clickable headers). 

Proposal: Register actions declaratively:
```javascript
registerModule('my-module', {
  actions: [
    { label: 'Refresh', icon: 'refresh-cw', onActivate: (sec) => { ... }, primary: true },
    { label: 'Settings', icon: 'settings', onActivate: () => openEditor(), secondary: true },
  ],
  ...
});
```

Actions render in a module footer (`.ds-module-footer`) at all card sizes, with primary actions visible and secondary in a "..." menu on small cards.

### 2. Response Preview in API Poller

Add a "Test & Configure" mode in the API Poller editor:
1. User enters URL → clicks "Test"
2. Module fetches the URL and renders the JSON as an interactive tree
3. User clicks on values in the tree → auto-fills field path + label
4. "Apply" button saves the configuration

This reduces API Poller setup from 10+ steps to: Enter URL → Test → Click values → Apply.

### 3. Universal Caching Layer

Current state: Every module implements its own caching (weather caches coordinates, resource-monitor uses _rmCache). 

Proposal: Add `ds.cache(key, ttl, fetcher)` that stores results in memory with TTL:
```javascript
function renderWeather() {
  ds.cache('weather-' + sec.zip, 600000, function() {
    return fetch(url).then(r => r.json());
  }).then(data => { /* render */ });
}
```

### 4. Editor Transition: Presets-First by Default

Current state: Most module editors show empty fields. 

Proposal: When a section type is first added, show a preset/library picker (like the card type picker) instead of empty fields. Only show the manual editor when "Configure Manually" is clicked.

---

## Success Metric: Configuration Effort Reduction

| Module | Before Phases 1-5 | After Phases 1-5 | Target for Next Cycle |
|--------|-------------------|------------------|----------------------|
| API Poller | 10+ steps, flat editor | 3 groups, 15 presets, auto-label | 2 steps: Test → Click → Apply |
| Links | One-at-a-time add | Batch add + drag-reorder | Auto-import from browser |
| Git | 4 fields, no help | Quick setup URL paste | One-click from repo list |
| Media | Manual port guessing | Port hints in placeholders | Connection test + auto-detect |
| Search | Field hidden in editor | Ctrl+K hint visible | Inline dropdown |

---

# Final Assessment

## What's Working Well

- **Design System**: `ds.*` components provide a consistent foundation. Weather module as reference demonstrates loading → empty → error → active states.
- **Editor Experience**: Collapsible sections, grouped module editors, sticky action bar, scroll preservation. Editing is no longer overwhelming.
- **Customization**: Typography sliders, alignment/density/scale per section. Every module inherits baseline font scaling.
- **Discoverability**: Help button in top bar, touch-friendly card controls, page tab overflow indicators, self-advertising hints on quotes and search.
- **Complex Modules**: API Poller has 15 presets with auto-label, Git has one-paste quick setup, Links has batch add.

## What Needs Work Next

1. **Module Depth**: The modules are consistent but not yet deep. API Poller needs response preview, Weather needs hourly, Search needs inline engine switcher.
2. **Cross-Module Actions**: No standardized way for modules to expose actions (scan, refresh, start/stop).
3. **Performance**: External fetches on every page load, no caching layer.
4. **Module Parity**: Some modules (ASCII Animation, Digital Pet, LAN Scan) lag behind in design system adoption.

## Recommendation

**The dashboard is now ready for users.**

The next evolution cycle should focus on **module depth and ecosystem features** rather than foundational improvements. The architecture is solid — now it needs data richness and cross-module integration.

Recommended order:
1. API Poller response preview (eliminates #1 configuration pain point)
2. Search inline engine switcher (quickest win, highest visibility)
3. Standardized module actions API (enables all future action-based features)
4. Resource Monitor disk capacity + alert thresholds
5. Weather hourly forecast

---

# Beautification Initiative — Visual Scores & Assessment

## Module Visual Scores (Post-Beautification)

| Module | Visual Appeal | Density | Personality | Info Presentation | Showcase Potential |
|--------|:------------:|:-------:|:-----------:|:----------------:|:-----------------:|
| Clock | 8 | 8 | 7 | 8 | 9 |
| Weather | 8 | 8 | 6 | 7 | 8 |
| Search | 7 | 8 | 4 | 7 | 7 |
| Links (grid) | 8 | 7 | 6 | 8 | 8 |
| Link-List | 7 | 9 | 5 | 7 | 6 |
| Notes | 7 | 7 | 5 | 7 | 6 |
| Quotes | 7 | 8 | 8 | 7 | 7 |
| Resource Monitor | 8 | 8 | 6 | 8 | 8 |
| API Poller | 7 | 7 | 4 | 7 | 7 |
| Media | 7 | 7 | 5 | 7 | 7 |
| Git | 7 | 7 | 4 | 7 | 6 |
| Iframe | 6 | 6 | 3 | 5 | 4 |
| Image | 6 | 6 | 4 | 6 | 5 |
| Timer | 6 | 7 | 5 | 6 | 5 |
| Digital Pet | 8 | 8 | 9 | 7 | 7 |
| LAN Scan | 7 | 7 | 5 | 7 | 5 |
| Proxmox | 7 | 7 | 4 | 7 | 5 |
| ASCII Animation | 6 | 7 | 7 | 5 | 5 |

## Biggest Visual Weaknesses (Post-Beautification)

1. **Iframe**: Lowest visual engagement — embeds other sites, no WarTab identity
2. **Timer**: Functional but visually flat — numeric display lacks character
3. **Image**: Simple img tag, no gallery or frame treatment
4. **ASCII Animation**: Niche appeal, rough terminal aesthetic
5. **Digital Pet room**: Complex DOM with absolute positioning, fragile on narrow cards

## Biggest Beautification Opportunities

1. **Clock**: Gradient text on time is premium — extend to date and calendar
2. **Timer**: Circular progress ring instead of flat text display
3. **Resource Monitor**: Gradient fills on metric bars, animated transitions
4. **Weather**: Animated weather icons (CSS keyframes for rain/snow)
5. **Links**: Service icon loading states, category color themes
6. **Digital Pet**: Animated idle (blink, tail wag via CSS keyframes)
7. **API Poller**: Visual diff indicators (up/down arrows on value changes)

## Beautification Implementation

The beautification CSS block adds approximately 270 lines covering:

- **Card hover elevation**: translateY(-1px) + enhanced shadow + border glow
- **Accent bar gradient**: Linear gradient from card accent color to transparent
- **Card header polish**: Subtle bottom border, icon opacity transition
- **Link items**: Gradient overlay on hover, scale(1.1) icon enlargement, translateY(-2px) lift
- **Link rows**: translateX(2px) slide on hover
- **Clock**: Gradient text fill on time display
- **Search input**: Glow box-shadow on focus
- **Button premium**: ::after pseudo-element for gradient highlight on hover
- **Page tabs**: translateY(-1px) hover, box-shadow on active
- **Modal**: backdrop-filter blur on overlay, elevated shadow on box
- **Resource monitor**: smooth cubic-bezier transition on fill bars
- **Weather temp**: Gradient text fill
- **Notes editor**: Enhanced focus ring
- **Digital pet**: text-shadow + drop-shadow for ASCII depth
- **Toast**: Rounded corners + enhanced backdrop blur
- **Section editor cards**: Rounded corners + rich transitions
- **Card type picker**: translateY(-2px) lift on hover

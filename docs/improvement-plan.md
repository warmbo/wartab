# ⚔️ WarTab — 100-Point Improvement Roadmap

A hefty, prioritized roadmap to make WarTab sleeker, cooler, more advanced, more
intelligent, and genuinely impressive as a self-hosted new-tab / startpage.

**Status legend:** ✅ shipped · 🟡 in progress · ⬜ backlog · 🎯 first tranche (shipped 2026-08-20)

Each item is scoped to WarTab's hard constraints: no new runtime deps, no build
step, stdlib-only backend, **cards resize manually only** (never auto-span/reflow),
conservative + reversible, and `npm run test` stays green.

---

## A. Intelligence & Command (make it *smart*)
1. ✅ **Command palette** (`Ctrl+K` / `Ctrl+P`) — fuzzy-find & launch any page, link,
   card section, or app action. Spotlight-for-new-tab. (`command-palette.js`)
2. ✅ **Palette actions** — actions (new card, new page, manage pages, arrange,
   settings, shortcuts) are first-class palette results.
3. ✅ **Palette navigation** — `↑↓` navigate, `↵` open, `esc` close, fuzzy-ranked
   results with highlighted matches; links open in a new tab, pages switch in place.
4. ✅ **Type-to-filter link grids** — with a card's grid focused, typing filters tiles
   live (no full-screen palette needed for quick lookups).
5. ✅ **Most-used suggestion card** — optional per-page "Recent / Most used" section
   that ranks your clicks (frequency × recency). NEVER auto-moves user cards.
6. ✅ **Smart default search** — search module supports keyword
   prefix (e.g. `yt: cats`, `gh: repo`) via a rules table.
7. ✅ **Fuzzy URL completion** — as you type in a search bar, suggests matching links
   already in your dashboard (with favicon) before hitting Enter.
8. ✅ **Global quick-jump** — type a link label in the global palette to open it,
   not just within its card.
9. ✅ **Natural-language queries** — ask the palette `weather today` / `notes`
   to jump to the right module.
10. ✅ **Clipboard action palette** — a link tile gets "Copy URL / Copy markdown / Copy
    as HTML" from a context menu (see D).
11. **Undo stack** — every destructive config action (delete card/section/link,
    reset) pushes to an undo stack for multi-step undo, not just one toast.
12. ✅ **Autocomplete history** — search module keeps a bounded per-engine recent-query history.
13. ✅ **Temporal hints** — world-clock rows surface "It's 9:41 AM in
    Tokyo" when you have world clocks configured.
14. ✅ **Smart offline status** — status bar turns red and cards that need network get a
    muted "offline" badge automatically when the browser is offline.
15. **Link health monitoring** — optional background probe of your dashboard links;
    dead links get a subtle warning dot + last-checked time.

## B. Sleekness & Visual Polish (make it *sleek*)
16. ✅ **System-theme auto-follow** — a "Follow system" appearance option that swaps
    dark/light with the OS (live re-apply on OS change; overrides card style).
17. ✅ **Custom CSS injection** — an Appearance config field to drop your own CSS
    overrides, persisted server-side, loaded last so you can theme anything.
18. ✅ **Micro-interactions** — restrained button/card/icon feedback —
    already partially in place; add reduced-motion-safe entrance micro-animations.
19. ✅ **Per-card accent glow** — subtle radial accent behind a card header (already
    partially present) extended to configurable glow intensity.
20. **Card style variants** — per-card "glass / flat / outline / neon" skin selector
    (server-side config, no new CSS deps).
21. ✅ **Consistent surface ladder** — shared surface tokens cover cards/panels/modals
    so contrast is uniform down the page (AURA-015).
22. ✅ **Fluid spacing rhythm** — core shell/cards use the existing `--space-*`
    tokens so all breakpoints share one hierarchy (AURA-004).
23. ✅ **Type ramp monotonicity** — theme.js owns a strictly monotonic `--text-*` ramp so
    generated scales never invert (AURA-013/000E).
24. **Corner-radius tokens** — every literal radius folded into `var(--radius)`.
25. ✅ **Better empty states** — empty pages/sections get illustrated, actionable
    placeholders (icon + tip + one-click add).
26. ✅ **Focus-ring design system** — one consistent, high-contrast focus ring for all
    interactive elements (a11y + aesthetics).
27. ✅ **Command palette styling** — palette is the hero surface: big, centered,
    blurred backdrop, dimmed app behind it.
28. ✅ **Footer safe-area clearance** — `--footer-clearance` token so the last card
    never hides behind the fixed footer on short viewports (AURA-000D).
29. ✅ **Top-bar clamp** — `--topbar-scale` clamps so the top bar never overflows at
    high user scale (AURA-001/000C).
30. ✅ **Card header geometry contract** — one shared header layout for all cards
    (title + icon + optional actions) (AURA-014).
31. ✅ **Scrollbar styling** — thin, theme-matching scrollbars for the app and panels.
32. ✅ **Selection color** — theme-aware `::selection` so highlighted text matches.
33. ✅ **Reduced-data loading skeletons** — shared skeletons on weather/media/git while
    fetching (weather already caches; extend pattern).
34. ✅ **Loader polish** — replace the plain spinner with a branded animated loader that
    fades out on first paint.

## C. Performance & Speed (make it *fast*)
35. ✅ **Service worker** — cache the app shell + static assets for offline-first and
    near-instant repeat loads (pairs with PWA, item 47).
36. ✅ **Preload critical assets** — `<link rel=preload>` for style.css and core.js.
37. **Defer non-critical modules** — modules not visible on the active page load after
    first paint (idle callback).
38. ✅ **HTTP caching audit** — immutable `?v=` assets stay cached and
    tighten remaining revalidations.
39. **Icon lazy-loading** — offscreen card icons render when near viewport.
40. ✅ **Config write coalescing** — config-store.js coalesces rapid edits without
    overlapping writes.
41. **JSON parse caching** — cache parsed config keyed by last-modified to skip
    re-normalization on rapid reloads.
42. ✅ **DOM batching** — renderAll and renderSection batch DOM inserts via fragments.
43. **Font subsetting** — serve only needed Inter weights; consider woff2 subset.
44. **Remove dead CSS/JS** — keep the dead-code backlog (AURA + duplication map)
    trimmed so payload shrinks.
45. **Bundle audit** — report per-file bytes in the footer dev view to catch bloat.

## D. Feature-Richness: Interaction & UX (make it *advanced*)
46. ✅ **Link context menu** — right-click a link tile: Open, New tab, Copy URL,
    Copy markdown, Edit link, Delete link, Move. (`showLinkContextMenu`)
47. ✅ **PWA installable** — web manifest + icons + service worker so WarTab installs
    as a real app (Chrome/Edge/Firefox). Offline-first app shell via `sw.js`.
48. **Multi-select arrange mode** — shift-click to select several cards and move them
    as a group in arrange mode.
49. ✅ **Section collapse/expand** — per-section collapse toggle,
    persisted per card.
50. **Drag links between cards** — drag a link tile from one card's grid to another.
51. ✅ **Search bar in a card** — search module gains a dedicated one-key focus and
    engine-switcher pill inside the card.
52. ✅ **Notes attachments** — attach an image to a note (uploads dir reuse).
53. ✅ **Notes search** — find within a notes card highlights matches.
54. ✅ **Quotes rotation options** — shuffle / sequential / daily-quote modes.
55. ✅ **Timer presets** — save named timer presets (pomodoro, deep-work) per card.
56. **API poller richer views** — render JSON as a mini-table or sparkline, not just a
    scalar dot-path.
57. ✅ **Resource monitor sparklines** — inline canvas history charts for CPU/RAM/disk
    over time (canvas, no deps).
58. **Git card detail** — click a repo row to see recent commits inline.
59. **Media card grid view** — optional 2-up poster grid instead of the list for
    Plex/Jellyfin rows.
60. **Lan-scan details** — click a scanned host for open-port / MAC / vendor detail.
61. **Proxmox VM actions** — start/stop/reboot a VM from its tile (guarded, token).
62. **Digital pet skill tree** — pet unlocks cosmetic variants as it's cared for
    (level-ups already partially exist).
63. ✅ **Keyboard help overlay** — a live keyboard shortcuts cheat-sheet.
64. ✅ **Command palette accessibility** — full arrow-key + type-ahead + ARIA listbox
    semantics.

## E. New Modules & Widgets (make it *feature-rich*)
65. ✅ **World clock** — multiple named timezones in one card (`zones` field, e.g.
    `Tokyo:Asia/Tokyo, London:Europe/London`).
66. ✅ **Weather forecast** — cached five-day forecast rows with condition icons.
67. ✅ **RSS / feeds card** — subscribe to a feed URL, render recent headlines.
68. ✅ **Calendar / agenda card** — read an iCal URL and list upcoming events.
69. **Bookmarks / browsing history card** — surface browser history (extension only).
70. ✅ **Homelab service status card** — aggregate HTTP health of your self-hosted
    apps into a green/amber/red list (uses server_network probe tools).
71. **Crypto / stock ticker card** — fetch a small quote list from a free API.
72. **Sports / game score card** — optional; config-driven league scores.
73. **Quote of the day from an API** — optional remote quotes source (local-first
    remains the default).
74. **Random fact / tip card** — a rotating homelab or general tip widget.
75. ✅ **Countdown / event date card** — "days until X" with a target date.
76. **Weather radar iframe presets** — embed rain-view maps with the iframe module;
    dedicated one-click presets remain backlog.
77. **Uptime status card** — pair with the homelab monitor for last-outage history.
78. **Photo of the day card** — image module supports remote URLs; an automatic
    Bing/NASA source remains backlog.
79. ✅ **Note-to-card templates** — quick templates (meeting notes, grocery list, TODO)
    pre-filled in a notes card.
80. ✅ **Markdown card** — a safe static rendered markdown block.

## F. Intelligence: Data & Insight (make it *intelligent*)
81. ✅ **Usage analytics** — local-only click logging (no external telemetry) with a
    Smart Links card for "Most used" and "Recent" rankings.
82. ✅ **Theme auto-suggest** — sample a background image and suggest an accent color.
83. ✅ **Background image optimizer** — auto-compress/downscale uploads (PIL path)
    to keep the page light.
84. **Clock timezone auto-detect** — detect the user's IANA timezone and prefill.
85. **Weather location reuse** — reuse a configured city across weather and world
    clock cards.
86. **Search engine recommender** — after N searches, offer the engine you use most
    as a one-click default.
87. **Config diff view** — show what changed between the last snapshot and current
    config in the panel.
88. **Export rich format** — export config as pretty markdown or HTML bookmark page,
    not just JSON.
89. **Import from other dashboards** — accept a simple bookmark-HTML import to seed a
    links section.
90. ✅ **Predictive prefetch** — pre-resolve DNS for the domains of visible
    link tiles to shave navigation latency.

## G. Architecture, Security & Developer Experience (make it *solid*)
91. ✅ **`el()` promoted to core** — move the de-facto shared helper out of
    config-panel into design-system/core so modules stop relying on load order
    (duplication-map finding).
92. ✅ **Fetch consolidation onto http.js** — route core storage/stats calls
    (weather/media/git/storage) through `WarTabHttp` (audit finding).
93. ✅ **`stats.js` poller** — uses `WarTabHttp.createPoller` instead of raw setInterval.
94. ✅ **Dead-code sweep** — removed confirmed-dead helpers (bumpVersion, addGap,
    removeGap, findSection, on/emit bus with no subscribers) after grep-verifying.
95. ✅ **Config-default drift fix** — reconciled API_PRESETS URL vs sectionDefaults repo
    (warmbo vs nousresearch) and section-editor style defaults.
96. ✅ **Module contract docs** — refreshed docs/modules.md with the full module
    contract and the el()/reuse conventions.
97. ✅ **Server route hardening audit** — re-verified the SPA allowlist after adding
    new static file (manifest, sw.js, icons).
98. ✅ **CSP headers** — baseline Content-Security-Policy allows the current
    inline styles without breaking custom-CSS or extension.
99. ✅ **Test coverage** — added vitest cases for the palette, PWA manifest, context menu,
    and custom-CSS injection; keep `npm run test` green.
100. ✅ **README + docs sync** — README and active docs reflect the live schema;
    legacy PLAN.md is explicitly archived and points to the authoritative pages-object,
    glow-accent, and 23-module documentation.

---

## Priority tiers (execution order)
- **Tier 1 — First tranche (shipped 2026-08-20):** items 1–3 (command palette),
  16–17 (system-theme + custom CSS), 46–47 (link context menu + PWA), 65 (world clock).
- **Tier 2 — High impact:** 4–7, 11, 15, 18–24, 35–37, 48–49, 57, 63–64, 81, 91–94.
- **Tier 3 — Feature depth:** the remaining new modules (E) and intelligence (F).
- **Tier 4 — Hardening:** G, docs sync, security audit.

*Generated by Hermes for Cody — each shipped item is a small, reversible commit with
`npm run test` green, dual-pushed (github + origin), and deployed to `master` on the
live box.*

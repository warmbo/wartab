# WarTab — Full-Project Audit Plan (for an LLM reviewer)

This document is a **self-contained audit brief**. It is designed to be handed to a
large, long-context LLM so it can read the codebase, produce a severity-ranked
findings report, and have that report fed back to Hermes (the agent) for
implementation. If you are that LLM, work through the numbered tasks below, read
the cited files, and return your findings in the required format at the end.

---

## 1. Orientation — what WarTab is

**WarTab** is a self-hosted new-tab / dashboard web app: a card grid of bookmarks,
widgets (clock, weather, notes, media, git, resource-monitor, digital pet, quotes,
API poller, etc.), multi-page tabs, a config panel, and an in-app **self-update**
system. It is styled as a dark glass + skeuomorphic UI.

- **Backend:** pure-Python stdlib HTTP server (`http.server`), **zero pip deps**.
- **Frontend:** vanilla JS, no build step, ES modules loaded via `<script defer>`.
- **Config:** server-side `config.json` (shared across devices), synced via
  `GET/POST /api/config`, auto-snapshotted into `snapshots/`.
- **Repo layout:** `/home/cody/Projects/wartab` on the host; also on Forgejo
  `cody/wartab` and GitHub `warmbo/wartab`. Deployed live at `tab.warho.me`
  (container CT1109, port 8081, systemd `wartab.service`).

### How to run / verify
```bash
# Backend + frontend together (no deps):
python3 server.py --port 8081
# JS test suite (vitest):
npm install && npm run test        # canonical verification command
# Python suite (unittest):
python3 -m unittest discover -s tests -p "test_*.py"
# Visual: open http://localhost:8081/ (a config.json exists or create from config.example.json)
```

---

## 2. File map (read these first)

**Backend (Python, ~1,600 LOC):**
- `server.py` — routes, static/SPA serving, CORS, security headers
- `server_config.py` — `ConfigStorage` (atomic writes + snapshots)
- `server_network.py` — proxy, ping, cert-check, docker, ARP scan
- `server_files.py` — image/icon processing, safe file identifiers
- `server_update.py` — self-update engine (git fetch/reset/rollback, token gate)
- `server_startup.py`, `server_defaults.py`, `stats.py`

**Frontend (root JS, ~7,200 LOC):**
- `app.js` — app init, DEFAULT_CONFIG, module registry, icon repo
- `core.js` — helpers, `registerModule`, base DOM utils, `CARD_MODULES`
- `render.js` — `renderAll`/`renderCard`/`renderSection`, layout driver
- `config-panel.js`, `edit-panel.js`, `section-editor.js`, `page-editor.js` — editing UIs
- `design-system.js` — shared components (`ds.icon`, etc.)
- `storage.js`, `config-model.js`, `card-model.js`, `config-store.js` — data access
- `theme.js`, `pages.js`, `icon-picker.js`, `dragdrop.js`, `arrange-mode.js`
- `http.js`, `modals.js`, `form-helpers.js`, `updates.js`
- `modules/*.js` — 18 module scripts (clock, weather, media, git, digital-pet, …)

**Styles:** `style.css` (~2,300 lines, ~130 KB), `static/fonts/inter.css`

**Docs:** `README.md`, `PLAN.md`, `HIERARCHY.md`, `docs/audits/*`, `module-expansion-report.md`

**Tests:** `tests/*.test.js` (vitest, 13 files / ~71 tests), `tests/test_*.py` (5 files / ~50 tests)

---

## 3. Existing audits — READ these before re-deriving findings

Two prior audits already exist and are largely **still open**. Your job is to
**validate, update, and extend** them — not start from a blank slate. Read both fully:

- `docs/audits/wartab-ui-ux-consistency-audit.md` (2026-07-13) — shell/panel/icon/
  focus/disabled consistency; many items already RESOLVED (verify they hold).
- `docs/audits/wartab-aura-bump-sizing-spacing-audit.md` (2026-07-13) — the big one.
  Contains P0/P1/P2/P3 findings (AURA-000A…G, AURA-001…017). **Confirm which are still
  true at current HEAD** and which were addressed. This is the authoritative backlog.
- `module-expansion-report.md` — per-module gap analysis + evolution proposals.

Also note: **a layout-fit attempt was just made and reverted** (commit `2e4a7ac`
reverted by `8383221`) because auto-spanning card widths violated the project's
core rule. See "Hard constraints" below — do not re-introduce auto-width.

---

## 4. Hard constraints (project rules — do not violate)

1. **Preserve existing layout/appearance unless a confirmed defect exists.** Never
   auto-resize, auto-span, or reflow cards based on content. Cards resize ONLY via
   explicit user width/height settings.
2. **Do not remove a CSS selector until proven unused.** Grep both HTML and all JS.
3. **No new dependencies, no build step, no framework.** Backend stays stdlib-only.
4. **Avoid increasing CSS specificity to fix conflicts.** Prefer fixing the source of
   the cascade conflict (usually JS writing inline styles vs. a `:root` media rule).
5. **No `!important` unless documented.** The file already has ~78–81; reducing them
   is a goal, not adding more.
6. **Consolidate repeated values into design tokens only when they are a genuine
   shared token** — do not over-abstract.
7. **Test responsive + interactive states after every change.** `npm run test` must
   stay green.
8. **Never post/commit secrets.** `config.json` and `data/` are gitignored runtime
   state — leave them alone unless explicitly asked.
9. **Favors conservative, low-risk, reversible changes.** When in doubt, propose
   rather than apply.

---

## 5. Confirmed issues to investigate (start here)

These are verified/strongly-suspected at the time of writing. Verify each against
current code and expand with line numbers:

### Layout & cascade (P0/P1)
- **L-1 / AURA-000A (CONFIRMED):** Tablet 2-column CSS rule is dead. `render.js`
  writes `--grid-cols` inline on `#card-grid`; an element-local custom property
  outranks the `:root` media rule, so 769–1199px still renders the desktop column
  count (e.g. 4 × ~200px). Same for `grid.style.gap` vs mobile/tablet gap rules.
  Fix direction: JS publishes preference inputs; one final CSS grid layer owns
  effective cols/gap; clamp card spans to the effective column count. **Verify the
  fix does NOT change desktop or mobile — only the tablet band.**
- **L-2 / AURA-003:** Four columns are too narrow at ordinary desktop widths.
  Investigate WITHOUT auto-resizing cards — consider fluid gap/spacing hierarchy and
  whether the *default* column config should change (a config default, not runtime
  auto-span).
- **L-3 / AURA-001:** Top-bar scaling (`--topbar-scale`) multiplies layout faster
  than available width; at high user scale the top bar overflows. Check the clamp
  logic in the top-bar scale block (`style.css` ~286–327) and mobile overlap
  (AURA-000C).
- **L-4 / AURA-002:** Grid rows convert module height differences into large dead
  zones (uneven column bottoms). Investigate `grid-auto-rows` / `grid-auto-flow`
  without auto-spanning cards.
- **L-5 / AURA-000B:** Highlighted cards (z-index 105) can paint above the edit
  panel (z-index 103). All dashboard content must stay below every panel/overlay.

### Spacing / typography (P1/P2)
- **L-6 / AURA-004:** Page and card spacing lack a fluid hierarchy (no consistent
  rhythm across breakpoints).
- **L-7 / AURA-000E / AURA-013:** Generated typography can become non-monotonic
  (at body 10px, `--text-sm` can exceed `--text-base`; at 28px, generated 3xl can
  exceed static 4xl). Secondary text is often both tiny and faint. JS sets user
  scale inputs; CSS should own a monotonic semantic type ramp.
- **L-8 / AURA-005/006/000F:** The module scale/density API exists but most modules
  bypass it — module scale and density are mostly dead controls. Decide a clear
  contract: does scale/density actually apply to all modules, or is it cosmetic?
- **L-9 / AURA-007/008/014:** Notes doesn't form compact visual groups; telemetry/data
  modules underuse hierarchy; card headers lack one geometry contract.

### Content / footer / responsive (P1/P2)
- **L-10 / AURA-000D:** Fixed footer lacks guaranteed content + safe-area clearance;
  final card can pass behind it. Mobile reduces app padding to 8px while footer stays
  fixed. Decide: footer in document flow, or a `--footer-clearance` token.
- **L-11 / AURA-009:** Responsive coverage has a tablet composition-quality gap.
- **L-12 / AURA-016:** Panels use a fixed desktop width instead of fluid constraints.
- **L-13 / AURA-000G:** Selector drift silently breaks advertised controls (a config
  option whose selector no longer matches). Find and fix.

### Accessibility / interaction (P1/P2)
- **L-14 / AURA-011:** Interactive target sizes don't match visual importance
  (44px touch targets).
- **L-15 / AURA-012/015:** Surface levels need a consistent luminance ladder;
  background contrast varies down the page.
- **L-16 / AURA-017:** Motion/aura should not depend on element translation.
- **L-17:** Verify focus-visible coverage, `prefers-reduced-motion`, coarse-pointer
  behavior, and disabled states still hold (re-check the ui-consistency audit).

### Code quality / maintainability
- **L-18:** `style.css` has ~78–81 `!important` and **five separate
  `@media (max-width:768px)` blocks** plus stacked polish/override layers
  (~1700–2300). Consolidate the duplicate 768px blocks and reduce `!important`
  WITHOUT changing rendered output. Map each `!important` to its reason.
- **L-19:** `loadIconRepo` (app.js ~195) now guards against non-array data — confirm
  the guard is correct and that the icon repo loads end-to-end (there was a live
  `data.forEach is not a function` crash before the guard).
- **L-20:** Documentation drift. `PLAN.md` documents a config schema (`pages` array,
  `layout.paddingX/paddingY`, "grayscale only", "no rounded corners") that does not
  match the live implementation (`pages` object keyed by page-id, `glow` accent,
  `cardRadius`, `topBarScale`). README may also drift. Reconcile docs with code.
- **L-21:** `style.cssText` inline assignments (~211 in the earlier baseline) —
  assess whether any cause real maintainability or CSP pain, but do NOT mass-migrate
  without a visible benefit.
- **L-22:** Check the self-update system (`server_update.py`, `updates.js`) for
  correctness: token gate fail-closed, rollback file handling, TTL status cache,
  no-downgrade guard, and that a post-update restart can't strand the service.

---

## 6. Method

For each finding:
1. **Read the actual source** (not just docs) — confirm the current line numbers.
2. **Reproduce live** where possible (serve locally, screenshot with the background
   disabled — set `#bg-canvas{display:none}` and `body{background:#0f0f0f}` for clean
   recognition).
3. **Propose a concrete fix** with exact file:line and low-risk reasoning.
4. **Assess regression risk** and state the validation steps.
5. **Classify severity:** P0 (blocking defect), P1 (major), P2 (aura/hierarchy),
   P3 (cleanup/polish).

Useful verification: `npm run test`, `python3 -m unittest discover -s tests
-p "test_*.py"`, `node --check <file>`, and manual breakpoint checks at
**1280 / 1024 / 900 / 768 / 480 / 390px** (compute via injected iframe if the
headless viewport can't be resized).

---

## 7. Required output format

Return a single markdown report:

```
# WarTab Audit Report

## Summary
<2-4 sentence overview + counts by severity, noting what is newly found vs
re-confirmed from the AURA/consistency audits>

## Prior-audit status table
| Finding | Prior severity | Still true at HEAD? | Current file:line | Note |

## New findings (severity-ranked)
### P0 — <title>
**Files:** path:line
<description, why it matters, concrete fix, fix risk, validation>

### P1 — <title>
...

### P2 / P3 — ...

## Confirmed-fixed / low-risk wins
<items that are safe to apply now>

## Hard-constraint compliance check
<confirm none of the 9 constraints were violated by your proposals>

## Recommended execution order
<ordered list of fixes, grouped into small reversible commits>
```

Be concrete and conservative. Favor small, reversible, low-risk changes. When a
finding needs a judgment call (e.g. "change the default column count"), state the
options and the recommended default, but do not apply it.

---

*Generated by Hermes for Cody — feed the completed report back to Hermes for
implementation. See `docs/audits/` for prior audit context.*

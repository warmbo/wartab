# WarTab — Architecture

This is the authoritative developer guide to how WarTab actually works today.
It maps each responsibility to its owning file so you know **where new code
belongs** without inspecting half the project first.

## Overview

WarTab is a self-hosted new-tab dashboard: a Python stdlib HTTP server serving a
vanilla-JS single-page app. Config lives server-side in `config.json`, shared
across all devices on the LAN. The frontend renders a card grid of bookmarks and
widgets; widgets are registered as **modules**.

- **Backend:** `http.server` (stdlib, zero pip deps)
- **Frontend:** vanilla JS, no build step, `<script defer>` module files
- **Config:** `config.json` on disk, snapshotted on every save
- **Serving:** systemd `wartab.service`, port 8081, LAN + Caddy → `tab.warho.me`

---

## Ownership map

| Concern | File(s) |
| --- | --- |
| HTTP entry, routes, static/SPA serving, CORS | `server.py` |
| Config load/save/backup (atomic, snapshots) | `server_config.py` |
| Network tools (ping, cert-check, proxy, docker, ARP) | `server_network.py` |
| File/image upload safety | `server_files.py` |
| Self-update engine (git, rollback, token) | `server_update.py` |
| System stats (CPU/RAM/disk/uptime) | `stats.py` |
| Server startup / defaults wiring | `server_startup.py`, `server_defaults.py` |
| App startup + orchestration | `app.js` |
| Framework-level shared primitives, module registry, event bus | `core.js` |
| Dashboard/page/section/card/module rendering | `render.js` |
| Config schema, defaults, normalization | `config-model.js`, `app.js` (`DEFAULT_CONFIG`) |
| In-memory config state | `config-store.js` |
| Backend persistence communication | `storage.js` |
| Frontend request behavior | `http.js` |
| Reusable visual components | `design-system.js` |
| Reusable form construction | `form-helpers.js` |
| Modal lifecycle | `modals.js` |
| Editing UIs (config, card, section, page) | `config-panel.js`, `edit-panel.js`, `section-editor.js`, `page-editor.js` |
| Theme application | `theme.js` |
| Pages navigation | `pages.js`, `page-drag.js` |
| Drag / arrange modes | `dragdrop.js`, `arrange-mode.js` |
| Icon picker / uploads | `icon-picker.js`, `uploads.js` |
| Self-update UI | `updates.js` |
| Widget-specific behavior | `modules/*.js` |

---

## Lifecycles

### Startup
```
server.py (python3, :8081)
  → serves index.html + <script> files
  → app.js DOMContentLoaded → init()
      → load config (localStorage → deepMerge over DEFAULT_CONFIG)
      → pageInit() (rebuild default cards if empty)
      → register modules (modules/*.js each call registerModule())
      → renderAll()
```
Two config sources exist (see Config below): the **browser** holds the working
config in localStorage and syncs to the server; `server_config.py` owns the
server-side copy. On first load there is no localStorage config, so
`DEFAULT_CONFIG` (from `config-model.js`/`app.js`) is used and immediately
persisted.

### Configuration lifecycle
```
DEFAULT_CONFIG
  → storage.js load (GET /api/config → merge into localStorage)
  → config-store.js / config-model.js (in-memory + normalization)
  → editors mutate the in-memory config
  → saveConfig() → POST /api/config → server_config.py writes config.json (atomic) + snapshot
```

### Render lifecycle
```
renderAll()            → whole dashboard (page tabs + card grid + top bar)
  renderPage()         → cards for the active page
    renderCard()       → one card (header + sections)
      renderSection()  → one section
        CARD_MODULES[type].render(section, card, contentEl)
```
Rendering is DOM-building (not virtual-DOM). The event bus (`core.js` `on`/`emit`)
supports targeted re-renders (`config:card:updated`) as an alternative to
`renderAll()`.

### Edit lifecycle
```
edit-panel.js / section-editor.js / config-panel.js
  → mutate in-memory config
  → saveConfig() → POST /api/config → server snapshot
  → emit('config:…:updated') → targeted re-render
```

### Update lifecycle (self-update)
```
updates.js UI → POST /api/update (or /api/update/rollback)
  → server_update.py: fetch → snapshot config → record pre-update HEAD
    → git reset --hard origin/<branch> → os._exit(0)
  → systemd Restart=always reboots on new build
  → status via GET /api/update/status (TTL-cached, ?refresh=1 bypass)
  → progress via GET /api/update/log?after=N
```

---

## Frontend/backend boundary

- Frontend talks to backend only through `/api/*` endpoints (`http.js`).
- All server response/error shapes are JSON; see `docs/api.md`.
- `server_network.py` tools (proxy, ping, cert-check) are only reachable via
  their endpoints; they never run on the frontend.
- Config is the single shared source of truth between the two layers.

---

## Module system (extension point)

Modules are the primary way WarTab grows. Each widget is `modules/<type>.js`
containing one `registerModule(type, { defaults, render, editor?, css?, … })`
call. `registerModule` (in `core.js`) stores the module in `CARD_MODULES` and
injects per-module CSS. See `docs/modules.md` for the full contract.

Registered types (18): `api-poller`, `ascii-anim`, `clock`, `digital-pet`,
`git`, `iframe`, `image`, `lan-scan`, `link-list`, `links`, `media`, `notes`,
`proxmox`, `quotes`, `resource-monitor`, `search`, `timer`, `weather`.

---

## Where should new code belong?

Quick decision guide:

- New **API endpoint** → `server.py` dispatch table (handler may live in the
  matching `server_*.py`).
- New **widget** → `modules/<type>.js` + register in the pickers in `app.js`
  + `<script>` in `index.html`.
- New **shared UI control** → `design-system.js` / `form-helpers.js`.
- New **frontend request** → `http.js` helper, not raw `fetch` inline.
- New **config field** → `DEFAULT_CONFIG` + `config-model.js` normalization;
  never invent a fallback elsewhere.
- New **dashboard/section/card logic** → `render.js`.
- New **app-wide state** → `config-store.js`.

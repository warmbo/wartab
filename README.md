# ⚔️ WarTab — Self-Hosted New Tab Page

A lean, self-hosted new tab page with **glassmorphic** + **skeuomorphic** styling.
Card-based layout with multi-page support, fully customizable from the UI.
Entirely self-contained — no external network required once loaded.

```
http://localhost:8081   or   http://<your-ip>:8081
```

---

## Features

### Multi-Page Dashboard
- Create, rename, and delete pages via the page bar
- Each page has its own set of cards, its own icon, and a custom title
- Keyboard-driven page switching with `Ctrl+Tab`
- Empty pages show a helpful placeholder with an add-card prompt

### Card Sections (10 types)

| Section | Description |
|---------|-------------|
| **Links** | Icon grid — auto-fill columns, per-link icons with Lucide/library/upload/emoji support |
| **Link List** | Single-column inline link rows |
| **Search** | Inline search bar with per-section engine selector (Google, DuckDuckGo, Bing, etc.) |
| **Clock** | Live time (12/24h) + date + optional calendar |
| **Weather** | OpenWeatherMap widget (free API key) — zip code + country code, °F/°C/K |
| **Iframe** | Embed any self-hosted app (Home Assistant, Jellyfin, Grafana) |
| **Notes** | Inline editing directly on the card (click to type, Esc to finish) |
| **Quotes** | User-defined quotes with author attribution. Click to cycle. |
| **Timer** | Hours/minutes dropdown-set countdown with Start/Reset |
| **API Poller** | Fetch JSON from any endpoint, extract a value via dot-path, auto-refresh |

### Icon System — 2,363 icons

- **Lucide SVG** — 2,000+ vector icons, all from the Lucide library, color-matched to your theme
- **Selfh.st service icons** — 350+ self-hosted app logos (Jellyfin, Home Assistant, Portainer, etc.) — organized in a searchable Services tab
- **Emoji** — 500+ system emoji in the Icons tab
- **Upload** — upload custom icon images (auto-resized to 256x256)
- **CDN Discovery** — preview icons from the selfh.st CDN before downloading locally
- Icons in card titles, link items, page tabs, and branding all use the same unified picker

### Drag & Drop Card Reordering

- Pointer-event-based drag with a floating ghost overlay (fixed-position, follows cursor)
- **simGrid preview** — CSS Grid auto-placement simulation shows each card's exact final position while dragging
- Cards displaced by a drag show vertical-only movement (clean row-wrap preview)
- Column-snap logic: dragged cards snap to the nearest column boundary
- **FLIP animation** on drop — all shifted cards animate smoothly to their new positions
- Gap cards — invisible spacer cells with hover controls (edit, drag, double-click to delete)
- Configurable gap card width and min-height in pixels

### Edit Panel (per-card)

A slide-out right panel for editing individual cards:
- **Title** — editable text field
- **Icon** — unified picker (Lucide + Services + Emoji + Upload), Change/Clear buttons with live preview
- **Color** — color picker + hex input, sets the card's accent bar
- **Width/Height** — slider controls, height up to 2 rows
- **Sections** — add, reorder (drag), delete. Each section has inline label + type selector
- **Module-specific editors** — tailored fields per section type (link table, clock checkboxes, weather API config, etc.)
- Save / Discard / Delete footer with confirmation modal and undo toast

### Config Panel (global)

A slide-out right panel organized into card-like sections:

| Section | Controls |
|---------|----------|
| **Page** | Title, icon |
| **Background** | Type (gradient/solid/image), value/URL, upload, previous images, random rotation toggle |
| **Appearance** | Card style (dark/light), card transparency, accent color, glass blur (px), animations toggle, accent bar toggle |
| **Typography** | Font color, font size (small/medium/large), font family — 30 Google Fonts, all pre-loaded |
| **Status Bar** | Enable/disable, source (local/Glances/custom URL), refresh interval, items selector (hostname/CPU/memory/disk/uptime) |
| **Layout** | Columns (1–6), card gap (px), page width (full/3/4/half), page height (full/compact) |
| **Data** | Export (download JSON), Import (file upload), Reset (with confirm + undo toast) |
| **API Keys** | Reference info for OpenWeatherMap and other services |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+L` or `Ctrl+K` | Focus first search bar |
| `Ctrl+Shift+C` | Toggle config panel |
| `Ctrl+N` | New card |
| `Ctrl+Shift+N` | New page |
| `Ctrl+Tab` | Cycle to next page |
| `Escape` | Close any open panel (config/edit/icon picker) |

### System Stats Endpoint

Built-in `/api/stats` endpoint — CPU, memory, disk, uptime, load — all from `/proc`
with zero Python dependencies (no psutil). Returns JSON for the status bar widget.

### Offline Capable

All assets ship with the repo:
- **Lucide icon library** — 602KB (`/static/lucide.min.js`)
- **Inter font** — weights 200–700 (`/static/fonts/`)
- **2,363 service icons** — SVG set from selfhst/icons (`/icons/`)
- **Quotes** — user-defined only, no network calls

Only the Font Family's non-Inter options require network (Google Fonts),
and OpenWeatherMap API — both degrade gracefully.

---

## Quick Start

### Option 1: Install Script (Debian)

```bash
curl -sL https://raw.githubusercontent.com/nousresearch/wartab/main/setup.sh | bash
# Or from the repo:
bash setup.sh
```

This installs WarTab as a systemd user service, enables linger (keeps running after logout),
and creates data directories for notes and uploads.

### Option 2: Docker

```bash
# Build and run
docker build -t wartab .
docker run -d \
  --name wartab \
  -p 8081:8081 \
  -v wartab-config:/app/config.json \
  -v wartab-notes:/app/notes \
  -v wartab-uploads:/app/uploads \
  wartab

# Or with Docker Compose
docker compose up -d
```

### Option 3: Manual (Python)

```bash
cd /home/cody/Projects/wartab
python3 server.py
# Opens on http://localhost:8081

# Custom port
python3 server.py --port 3000

# Open browser automatically
python3 server.py --port 8081 --open

# mDNS / ZeroConf discovery (install avahi-utils first)
python3 server.py --port 8081 --mdns
```

### Setting as Browser New Tab

**Firefox**: New Tab Override extension → `http://localhost:8081`
**Chrome/Edge/Brave**: New Tab Redirect extension → `http://localhost:8081`

### Systemd Auto-Start

```bash
systemctl --user daemon-reload
systemctl --user enable --now wartab.service
journalctl --user -u wartab.service -f    # Logs
```

---

## Configuration

Config is stored server-side in `config.json` via the `/api/config` endpoint.
Changes made in the UI are saved automatically with `navigator.sendBeacon`.
Export/import/reset available from the config panel's Data section.

Multi-device: point multiple browsers to the same WarTab server to share config.

---

## File Structure

```
wartab/
├── index.html         # App shell
├── style.css          # Glass + skeuomorphic styles
├── app.js             # All logic: render, pages, config, drag-drop, widgets
├── storage.js         # Storage adapter (server or browser extension)
├── server.py          # Python HTTP server (zero deps)
├── Dockerfile         # Container build
├── docker-compose.yml # Container orchestration
├── setup.sh           # Debian install script
├── manifest.json      # Chrome extension manifest
├── config.json        # Server-side config (auto-managed)
├── icons/             # 2,363 SVG service icons (selfhst/icons) + extension icons
├── static/
│   ├── lucide.min.js  # Lucide icon library (local copy, 602KB)
│   └── fonts/         # Inter font files + CSS
├── notes/             # Notes saved as .md files
├── uploads/           # User-uploaded background images
├── PLAN.md            # Design document
├── HIERARCHY.md       # Component tree & class naming reference
└── README.md          # This file
```

Single-page app — no framework, no build step, no node_modules. Just open and go.

---

## Architecture

- **Storage**: Server-side `config.json` via REST API (`/api/config`). No database.
  Fire-and-forget saves via `navigator.sendBeacon`. Config syncs across devices.
- **Server**: Python `http.server` — single file, no pip deps. Handles static files,
  config CRUD, image upload/resize (PIL optional), stats endpoint, and icon saving.
- **Icons**: Lucide SVGs (2,000+) + selfhst/icons SVGs (350+) + system emoji (500+).
  Dynamic `lucide.icons` detection — always uses the complete runtime set.
- **Card System**: `CARD_MODULES` registry — each section type owns
  `{ defaults, render, editor }`. Add new types without touching core rendering.
- **Pages**: Config is organized into `config.pages` with `config.pageOrder` and
  `config.currentPage`. Cards live per-page. Zero-touch repointing of `config.cards`.
- **Theming**: CSS custom properties for accent, glass blur, font, card style —
  all togglable from the UI. Dark/light modes with dynamic opacity blending.
- **Drag & Drop**: Pointer Events API, simGrid CSS Grid auto-placement simulation,
  FLIP animations, column-snap logic with grab-offset tracking.

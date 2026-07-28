# ⚔️ WarTab — Self-Hosted New Tab Page

A lean, self-hosted new tab page with **glassmorphic** + **skeuomorphic** styling.
Card-based dashboard with multi-page support, fully customizable from the UI.
Entirely self-contained — no external network required once loaded.

```
🌐 GitHub:  https://github.com/warmbo/wartab
🌐 Forgejo: http://10.0.0.253:3000/cody/wartab
```

```
http://localhost:8081   or   http://<your-ip>:8081
```

---

## Features

### Multi-Page Dashboard

- Create, rename, and delete pages via the page bar
- Each page has its own set of cards, icon, and custom title
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

### Icon System — 2,000+ Icons

- **Lucide SVG** — 2,000+ vector icons, color-matched to your theme
- **Selfh.st service icons** — 350+ self-hosted app logos (Jellyfin, Home Assistant, Portainer, etc.) — organized in a searchable Services tab
- **Emoji** — 500+ system emoji in the Icons tab
- **Upload** — upload custom icon images (auto-resized to 256×256)
- **CDN Discovery** — preview icons from the selfh.st CDN before downloading locally

All icons — card titles, link items, page tabs, and branding — use the same unified picker.

### Drag & Drop Card Reordering

- Pointer-event-based drag with a floating ghost overlay (follows cursor)
- **simGrid preview** — CSS Grid auto-placement simulation shows each card's exact position while dragging
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

### Offline Capable — After First Setup

All assets can be shipped with the repo or downloaded on demand:

- **Lucide icon library** — 602KB (`/static/lucide.min.js`), included in repo
- **Inter font** — weights 200–700 (`/static/fonts/`), included in repo
- **Service icons** — 350+ SVG icons downloaded from selfh.st CDN during setup (`python3 download_icons.sh`)
- **Quotes** — user-defined only, no network calls

Only the Font Family's non-Inter options require network (Google Fonts),
and OpenWeatherMap API — both degrade gracefully.

---

## Quick Start

### Option 1: One-Command Install (Debian)

Works on a clean Debian install — installs everything automatically:

```bash
curl -sL https://github.com/warmbo/wartab/raw/main/setup.sh | bash
```

This single command:

- Installs Python 3, git, Pillow, and Avahi/mDNS
- Clones WarTab to `/opt/wartab`
- Creates an initial `config.json` from defaults
- Downloads service icons from selfh.st
- Starts WarTab as a systemd user service with mDNS advertising
- Enables linger (keeps running after logout)

**Result:** WarTab is live at `http://localhost:8081`.

### Option 2: Docker

```bash
# Build and run
docker build -t wartab .
docker run -d \
  --name wartab \
  -p 8081:8081 \
  -v "$(pwd)/wartab-data/config.json:/app/config.json" \
  -v "$(pwd)/wartab-data/notes:/app/notes" \
  -v "$(pwd)/wartab-data/uploads:/app/uploads" \
  wartab

# Or with Docker Compose
docker compose up -d
```

Data files appear in `wartab-data/` for easy editing.

### Option 3: Manual (Python)

Zero dependencies beyond Python stdlib:

```bash
git clone https://github.com/warmbo/wartab.git
cd wartab
cp config.example.json config.json          # optional — server falls back to defaults
python3 server.py --port 8081 --open         # --open opens browser automatically
# python3 server.py --port 8081 --mdns       # advertise via mDNS (install avahi-utils)
```

The server works even without `config.json` — it serves built-in defaults on first run.

### Browser Extension

WarTab also ships as a browser extension for Chrome, Edge, and Firefox.
See [extension/INSTALL.md](extension/INSTALL.md) for installation instructions.

---

## Post-Install: Access & Setup

### From the Machine Itself

```
http://localhost:8081
```

### From Any Device on Your LAN

If you installed with **Option 1** (setup.sh), mDNS is already configured:

```
http://<hostname>.local:8081
```

If you installed manually, install Avahi and run the server with `--mdns`:

```bash
sudo apt install avahi-utils
python3 server.py --port 8081 --mdns
```

### Setting as Your Browser's New Tab

| Browser | Method |
|---------|--------|
| **Firefox** | Install "New Tab Override" → set URL to `http://<hostname>.local:8081` |
| **Chrome/Edge/Brave** | Install "New Tab Redirect" → set URL to `http://<hostname>.local:8081` |

### Run as a Systemd Service (persistent background)

```bash
systemctl --user daemon-reload
systemctl --user enable --now wartab.service
journalctl --user -u wartab.service -f    # follow logs
```

If you used Option 1, this is already done for you.

---

## Configuration

Config is stored server-side in `config.json` via the `/api/config` endpoint.
Changes made in the UI are saved automatically with `navigator.sendBeacon`.
Export, import, and reset are available from the config panel's Data section.

**Multi-device:** point multiple browsers to the same WarTab server to share config.

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
├── download_icons.sh  # Fetches service icons from selfh.st CDN
├── setup.sh           # Debian install script
├── manifest.json      # Chrome extension manifest
├── config.json        # Server-side config (auto-managed)
├── icons/             # 2,363 SVG service icons (selfhst/icons) + extension icons
├── static/
│   ├── lucide.min.js  # Lucide icon library (local copy, 602KB)
│   └── fonts/         # Inter font files + CSS
├── modules/           # Pluggable card section modules
├── notes/             # Notes saved as .md files
├── uploads/           # User-uploaded background images
├── extension/         # Browser extension build files and manifests
├── PLAN.md            # Architecture design document
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

For a deeper look at the component hierarchy and data model, see [`HIERARCHY.md`](HIERARCHY.md) and [`PLAN.md`](PLAN.md).

---

## Development

### Dual-Remote Push

Every commit must be pushed to **both** remotes:

```bash
git push github <branch>
git push origin <branch>   # Forgejo
```

| Alias | Target |
|-------|--------|
| `github` | `github.com/warmbo/wartab` |
| `origin` | `10.0.0.253:3000/cody/wartab` (self-hosted Forgejo) |

### Versioning & Cache Busting

All `<script src>` and `<link rel="stylesheet">` tags in `index.html` use `?v=BUILD` as
a placeholder. The server (`server.py`) automatically replaces `BUILD` with the current
`git describe --always --tags --dirty` output at serve time.

This means:

- Every deploy automatically gets a unique cache-busting version
- No manual version string updates needed
- Browsers always fetch fresh assets after a server restart
- The footer displays the same git hash as the build version

The server reads `GIT_VERSION` at startup from `git describe`. If git is unavailable,
the fallback is `'dev'`.

### Adding a Module

1. Create `modules/<type>.js` with a `registerModule('type', { defaults, render, editor })` call
2. Add the type to both picker lists in `app.js`:
   - Section editor type selector (around line 760)
   - New card modal (around line 2140)
3. Add a `<script src="modules/<type>.js?v=BUILD" defer>` to `index.html`
4. Commit and dual-push to both remotes

### Branches

| Branch | Purpose |
|--------|---------|
| `main` | Self-hosted server version (current) |
| `extension` | Browser extension variant — rewrites `storage.js` for `chrome.storage`, patches proxy-based fetches to direct fetch, stubs server-only features |

See [`extension/PLAN.md`](extension/PLAN.md) for the full extension implementation plan.

# ⚔️ WarTab — Self-Hosted New Tab Page

A lean, self-hosted new tab page with **glassmorphic** + **skeuomorphic** styling.
Card-based layout, fully customizable from the UI. Entirely self-contained — no
external network required once loaded.

```
http://wartab.local:8081   or   http://<your-ip>:8081
```

---

## Features

### Card Sections (9 types)

| Section | Description |
|---------|-------------|
| **Links** | Icon grid — auto-fill columns, searchable service icons |
| **Link List** | Single-column inline link rows |
| **Search** | Inline search bar with per-section engine selector |
| **Clock** | Live time (12/24h) + date + optional calendar |
| **Weather** | OpenWeatherMap widget (free API key) |
| **Iframe** | Embed any self-hosted app (Home Assistant, Jellyfin, Grafana) |
| **Notes** | Inline editing directly on the card |
| **Dropdown** | Collapsible link group |
| **API Poller** | Fetch JSON from any endpoint, render a value at a dot-path |
| **Status Bar** | Live CPU, memory, disk, uptime from local `/api/stats`, Glances, or custom URL |

### Icon System

- **Lucide SVG icons** — 200+ icons, change color with accent/font theme settings
- **Homarr service icons** — 124 self-hosted app logos (Jellyfin, Home Assistant, Portainer, etc.)
- **Emoji** — 100+ common emoji, render in native color (unaffected by theme)
- **Custom URL** — paste any image URL
- **Upload** — upload custom icon images via the server

### Drag & Drop

- Mouse-based drag with ghost preview and FLIP placement animation
- Gap cards — invisible spacer cells with hover controls (edit, drag, delete)
- Configurable gap card width and min-height in pixels

### Config Panel

- **Page** — title, icon
- **Background** — gradient, solid, image upload, random rotation
- **Appearance** — accent color, glass blur, card style, animations toggle, accent bar toggle
- **Font** — font color, font size, font family (30 Google Fonts, all preloaded)
- **Status Bar** — enable/disable, source selector (local/Glances/custom), refresh interval, items
- **Layout** — columns, card gap, page padding X/Y
- **Data** — export, import, reset config
- **API Keys** — references for where to get API keys

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+L` or `Ctrl+K` | Focus first search bar |
| `Ctrl+Shift+C` | Toggle config panel |
| `Escape` | Close config panel / icon picker |

### System Stats Endpoint

Built-in `/api/stats` endpoint — CPU, memory, disk, uptime, load — all from `/proc`
with zero Python dependencies (no psutil). Returns JSON for the status bar widget.

### Fully Offline-Capable

All assets ship with the repo:
- Lucide icon library (602KB) — `/static/lucide.min.js`
- Inter font (weights 200–700) — `/static/fonts/`
- 124 service icons — `/icons/`
- Quotes — 21 embedded programming quotes, no network call

Only the Font Size slider's non-Inter font options and OpenWeatherMap API
require internet — and both degrade gracefully (system fonts, error message).

---

## Quick Start

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

## File Structure

```
wartab/
├── index.html        # App shell
├── style.css         # Glass + skeuomorphic styles
├── app.js            # All logic: render, config, drag-drop, widgets
├── server.py         # Python HTTP server (zero deps)
├── icons/            # 124 self-hosted service icons (homarr-labs)
├── static/
│   ├── lucide.min.js # Lucide icon library (local copy)
│   └── fonts/        # Inter font files + CSS
├── uploads/          # User-uploaded background images
├── PLAN.md           # Design document
└── README.md         # This file
```

Single-page app — no framework, no build step, no node_modules. Just open and go.

---

## Architecture

- **Storage**: `localStorage` — no backend database. Export/import via JSON.
- **Server**: Python `http.server` — single file, no pip deps.
- **Icons**: Lucide SVGs (`currentColor`) + homarr dashboard PNGs (brand colors).
- **Card System**: `CARD_MODULES` registry — each section type owns `{ defaults, render, editor }`.
- **Theming**: CSS custom properties for accent, glass blur, font, card style — all togglable from UI.

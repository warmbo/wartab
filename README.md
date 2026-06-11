# ⚔️ WarTab — New Tab Page

A lean, self-hosted new tab page with **glassmorphic** + **skeuomorphic** styling. Card-based layout, fully customizable from the UI. Serves on your local network so every device on LAN can use it.

```
http://wartab.local:8081   or   http://<your-ip>:8081
```

## Features

- **Card grid** — add, remove, reorder cards via drag-and-drop
- **Section types** per card:
  - **Links / Link List** — bookmark grids and inline lists with icons
  - **Search** — inline search box (configurable engine: Google, DuckDuckGo, Brave, etc.)
  - **Clock** — live clock with 12/24h + date
  - **Weather** — OpenWeatherMap widget (add your free API key)
  - **Iframe** — embed any self-hosted app (Home Assistant, Jellyfin, Grafana, etc.)
  - **Notes** — editable sticky notes (persist to localStorage)
  - **Dropdown** — collapsible link groups
  - **API Poller** — hit any local API endpoint and render a JSON value (e.g. system stats, cryptocurrency prices)
- **Glass + Skeuomorphic** — frosted glass cards, beveled buttons, noise textures, accent glows
- **Full config UI** — inline drawer panel (⚙️ button or Ctrl+Shift+C)
- **Export/Import** — share your config across devices via JSON
- **Global search bar** — search the web or type a URL directly (Ctrl+L / Ctrl+K)
- **Dark mode** — built-in, always-on dark aesthetic
- **Local network** — serve on `0.0.0.0` so any device on LAN can set it as their new tab

## Quick Start

```bash
cd /home/cody/Projects/wartab
python3 server.py
# Opens on http://localhost:8081
```

### Custom port

```bash
python3 server.py --port 3000
```

### Open browser automatically

```bash
python3 server.py --port 8081 --open
```

### mDNS / ZeroConf (optional)

Install avahi-utils for `wartab.local` discovery:

```bash
sudo apt install avahi-utils
python3 server.py --port 8081 --mdns
```

## Auto-start via systemd (user service)

```bash
systemctl --user daemon-reload
systemctl --user enable --now wartab.service
```

To check logs:

```bash
journalctl --user -u wartab.service -f
```

## Setting as Browser New Tab

### Firefox
1. Install **New Tab Override** extension
2. Set URL to `http://localhost:8081`

### Chrome / Edge / Brave
1. Install **New Tab Redirect** or **Custom New Tab** extension
2. Set URL to `http://localhost:8081`

Or use **Tabliss** or **Infinity New Tab** and point it to the local URL via iframe.

## Configuration

All config lives in `localStorage` in your browser. Access the config panel:

- Click the ⚙️ button in the top bar
- Or press `Ctrl+Shift+C`
- Or press `Ctrl+L` / `Ctrl+K` to focus the search bar

From the config panel you can:
- Change background (gradient, solid color, or image URL)
- Adjust glass blur intensity
- Change accent color
- Add/remove/reorder cards
- Add/remove/reorder sections within cards
- Add/remove links in each section
- Change section types on the fly
- Export/import your full config as JSON

## Self-Hosted Integration Examples

**Home Assistant** via iframe:
```
Type: iframe | URL: http://homeassistant.local:8123
```

**System stats** via API poller:
```
Type: api-poller | URL: http://192.168.1.50:9090/api/status | Path: stats.cpu_usage
```

**Jellyfin** via iframe:
```
Type: iframe | URL: http://jellyfin.local:8096
```

**Pi-hole summary** via API:
```
Type: api-poller | URL: http://pi.hole/admin/api.php?summary | Path: queries_blocked_percentage
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+L` or `Ctrl+K` | Focus search bar |
| `Ctrl+Shift+C` | Open/close config panel |
| `Escape` | Close config panel (when open) |

## File Structure

```
wartab/
├── index.html    # Main tab page
├── style.css     # Glass + skeuomorphic styles
├── app.js        # Everything: render, config, drag-drop, widgets
├── server.py     # Python HTTP server (no deps needed)
├── PLAN.md       # Design doc
└── README.md     # This file
```

Single-page app — no framework, no build step, no node_modules. Just open and go.

# WarTab — New Tab Page

## Concept
A lean, self-hosted new tab page with glassmorphic + skeuomorphic styling. Cards are user-defined with titles, icons, dropdowns, sections, colors, and custom layout. Serves on the local network so every device on LAN can use it. Configuration is stored server-side in `config.json` so it syncs across all devices.

## Quick Start
```
python3 server.py          # starts on port 8081 (configurable with --port)
systemctl --user enable --now wartab   # optional: run as a service
```

## Architecture

### Files
```
index.html    — main tab page (static HTML shell)
style.css     — all styling (glass, skeuomorphic, drag/drop, config panels)
app.js        — all application logic (modules, render, config, drag-drop)
server.py     — HTTP server (serves static files, POST /api/config saves to config.json)
config.json   — user configuration (created on first save, editable by hand)
PLAN.md       — this file
HIERARCHY.md  — DOM component tree reference
icons/        — self-hosted service icons (downloaded from selfhst/icons CDN)
```

### Config Storage
- **config.json** — lives on the server, shared across all devices on LAN
- **POST /api/config** — browser sends config updates to the server
- **GET /api/config** — browser loads config on page load
- Editing `config.json` by hand is supported — the app reads it fresh on each request

### Data Model (config.json)
```json
{
  "version": "0.2.1",
  "branding": { "title": "WarTab", "icon": "sword" },
  "theme": {
    "bgType": "color|gradient|image",
    "bgValue": "css value or image path",
    "blur": 20,
    "glow": "#888888",
    "fontSize": "medium",
    "fontFamily": "Inter",
    "cardBg": "dark",
    "fontColor": "#cccccc",
    "cardOpacity": 1,
    "animations": true,
    "showAccentBar": true
  },
  "statusBar": { "enabled": true, "source": "local", ... },
  "layout": { "cols": 4, "gap": 16, "paddingX": 24, "paddingY": 24 },
  "search": { "selected": "Google", "engines": {...} },
  "cards": [
    { "id": "unique-id", "title": "Card Title", "icon": "lucide-name",
      "color": "#aaaaaa", "width": 1, "height": 1,
      "sections": [ ... ] }
  ]
}
```

### Card Section Types
| Type | Description | Editor fields |
|------|-------------|---------------|
| `links` | Bookmark grid with icons/labels | Label, URL, icon picker |
| `link-list` | Horizontal link rows (compact) | Same as links |
| `search` | Inline search bar (configurable engine) | Placeholder, engine |
| `clock` | Live clock + date + calendar | 24hr toggle, show date, show calendar |
| `weather` | Weather widget (OpenWeatherMap) | API key, location, units |
| `iframe` | Embed any URL | URL, height |
| `notes` | Inline editable text | (contentEditable directly on card) |
| `api-poller` | Display JSON from a local API | URL, JSON path, label, refresh interval |
| `quotes` | Random quote display | (built-in quote library) |
| `status-bar` | System stats (CPU, RAM, disk, uptime) | Source, items selection |

### Adding a New Section Type
Open `app.js` and add a new `registerModule()` call before the `DEFAULT_CONFIG` line:

```javascript
registerModule('my-type', {
  defaults: { myField: 'default value' },
  render: (section, card, contentWrapper) => {
    // section = this section's config data
    // card = the parent card config
    // contentWrapper = DOM element to append your content into
    const el = document.createElement('div');
    el.textContent = section.myField;
    contentWrapper.appendChild(el);
  },
  editor: (section, card, editorBody) => {
    // editorBody = DOM element to append form fields into
    // Use helper functions: cpLabel(), cpInput(), cpCheck(), etc.
    editorBody.appendChild(cpLabel('My Field'));
    editorBody.appendChild(cpInput('Default', section.myField,
      v => { section.myField = v; saveAndRefresh(); }));
  },
});
```

### Styling
- **Glass**: `backdrop-filter: blur()`, semi-transparent backgrounds, subtle borders
- **Skeuomorphic**: inner shadows, bevels, embossed text, noise textures
- **Grayscale only** — no accent color, all UI in shades of white/gray/black
- **No rounded corners** — all corners are square
- Dark mode default with light toggle

### Serving
- Standalone Python HTTP server (`server.py`)
- Optional: systemd user service for persistent serving
- Optional: mDNS (Avahi) for `wartab.local` discovery

## Extending

### Adding Links
Edit `config.json` directly and add to the `cards[].sections[].links` array:
```json
{ "label": "My Service", "url": "http://service.local", "icon": "lucide-name" }
```
Icons can be: Lucide icon names (`"globe"`), emoji (`"🔗"`), or image URLs (`"/icons/myapp.png"`).

### Custom Icons
Place PNG/SVG icons in the `icons/` directory and reference them as `/icons/filename.png` in your config.

# WarTab — Architecture & Design

This document describes WarTab's internal architecture, data model, and extension points.
It's intended for developers and contributors. For installation and usage, see [`README.md`](README.md).

---

## Concept

A lean, self-hosted new tab page with glassmorphic + skeuomorphic styling. Cards are
user-defined with titles, icons, sections, colors, and custom layout. Serves on the
local network so every device on LAN can use it. Configuration is stored server-side
in `config.json` so it syncs across all devices.

---

## Data Model (config.json)

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
  "pages": [
    { "title": "Home", "icon": "sword", "cards": [...] }
  ],
  "cards": [
    {
      "id": "unique-id",
      "title": "Card Title",
      "icon": "lucide-name",
      "color": "#aaaaaa",
      "width": 1,
      "height": 1,
      "page": 0,
      "sections": [
        { "type": "links", "label": "Dev Tools", "links": [...] }
      ]
    }
  ]
}
```

### Config Storage Flow

- **config.json** — lives on the server, shared across all devices on LAN
- **POST /api/config** — browser sends config updates to the server
- **GET /api/config** — browser loads config on page load
- Manual editing of `config.json` is supported — the app reads it fresh on each request

---

## Card Section Types

Each card can have one or more sections. Each section has a type that determines
its behavior and editor fields.

| Type | Description | Editor Fields |
|------|-------------|---------------|
| `links` | Bookmark grid with icons/labels | Label, URL, icon picker |
| `link-list` | Horizontal link rows (compact) | Same as links |
| `search` | Inline search bar (configurable engine) | Placeholder, engine |
| `clock` | Live clock + date + calendar | 24hr toggle, show date, show calendar |
| `weather` | Weather widget (OpenWeatherMap) | API key, location, units |
| `iframe` | Embed any URL | URL, height |
| `notes` | Inline editable text (contentEditable) | — |
| `api-poller` | Display JSON from a local API | URL, JSON path, label, refresh interval |
| `quotes` | Random quote display | — |
| `status-bar` | System stats (CPU, RAM, disk, uptime) | Source, items selection |

---

## Adding a New Section Type

All section types are registered via `registerModule()` before the `DEFAULT_CONFIG` line in `app.js`:

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

### Module Registration Checklist

1. Create `modules/<type>.js` with a `registerModule()` call
2. Add the type to both picker lists in `app.js`:
   - Section editor type selector (around line 760)
   - New card modal (around line 2140)
3. Add a `<script src="modules/<type>.js?v=BUILD" defer>` to `index.html`

---

## Styling

- **Glass**: `backdrop-filter: blur()`, semi-transparent backgrounds, subtle borders
- **Skeuomorphic**: inner shadows, bevels, embossed text, noise textures
- **Grayscale only** — no accent color, all UI in shades of white/gray/black
- **No rounded corners** — all corners are square
- Dark mode default with light toggle

---

## Adding Links Directly

Edit `config.json` directly and add to the `cards[].sections[].links` array:

```json
{ "label": "My Service", "url": "http://service.local", "icon": "lucide-name" }
```

Icons can be: Lucide icon names (`"globe"`), emoji (`"🔗"`), or image URLs (`"/icons/myapp.png"`).

## Custom Icons

Place PNG/SVG icons in the `icons/` directory and reference them as `/icons/filename.png` in your config.

---

## Serving Options

- **Standalone**: `python3 server.py` (zero pip deps, single file)
- **systemd user service**: persistent background serving
- **mDNS (Avahi)**: discover at `wartab.local` on your LAN
- **Docker**: containerized via `Dockerfile` / `docker-compose.yml`

See [`README.md`](README.md) for setup instructions.

---

## Browser Extension

WarTab also runs as a standalone browser extension (no server required).
The `extension` branch rewrites `storage.js` for `chrome.storage` and patches
proxy-dependent features. See [`extension/PLAN.md`](extension/PLAN.md) for the
full implementation plan and [`extension/INSTALL.md`](extension/INSTALL.md) for
installation instructions.

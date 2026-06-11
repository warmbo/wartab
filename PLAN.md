# WarTab — New Tab Page

## Concept
A lean, self-hosted new tab page with glassmorphic + skeuomorphic styling. Cards are user-defined with titles, icons, dropdowns, sections, colors, and custom layout. Serves on the local network so every device on LAN can use it.

## Architecture

### Pages
- **index.html** — main tab page with search bar + card grid
- **config.html** — separate config panel (WYSIWYG card editor, theme, layout)

### Config Storage
- **localStorage** — config lives in-browser so it's fast and offline-capable
- **Export/Import** — JSON dump/restore for backup and sharing across devices

### Data Model (config stored in localStorage key "wartab")
```json
{
  "theme": { "bgType": "color|gradient|image", "bgValue": "...", "blur": 20, "glow": "#6C63FF" },
  "layout": { "cols": 4, "gap": 16, "cardMinWidth": 200 },
  "cards": [ { id, title, icon, color, width, sections: [...] } ]
}
```

### Card Section Types
- **links** — bookmark grid with icons/labels
- **search** — inline search bar (configurable engine)
- **clock** — live clock/date widget
- **weather** — API-powered weather widget (OpenWeatherMap)
- **iframe** — embed any self-hosted app (radarr, sonarr, etc.)
- **api-poller** — hits a local API endpoint, renders JSON in a template
- **notes** — inline sticky-note text
- **dropdown** — collapsible group of links/widgets

### Styling
- Glass: `backdrop-filter: blur()`, semi-transparent backgrounds, subtle borders
- Skeuomorphic: inner shadows, bevels, embossed text, noise textures, leather/paper accents
- Dark mode default with light toggle

### Serving
- Simple Python HTTP server (`python3 -m http.server` or a tiny custom server)
- Optional: systemd user service for always-on serving
- Optional: mDNS (Avahi) so it's discoverable as `wartab.local`

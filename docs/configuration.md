# WarTab — Configuration

This is the **authoritative** configuration contract, derived from
`DEFAULT_CONFIG` in `app.js` and the live `config.json`. If documentation
elsewhere disagrees with this file, this file is correct.

## Where config lives

- **Browser:** the working config is held in `localStorage` and merged over
  `DEFAULT_CONFIG` at startup (`app.js` `init()` → `deepMerge`).
- **Server:** `config.json` in the app dir, written atomically and auto-
  snapshotted by `server_config.py` (`ConfigStorage`), synced via
  `GET/POST /api/config`. It is **gitignored** runtime state.
- `config.example.json` is a committed reference of a typical config.

## Top-level structure

```jsonc
{
  "version": "dev",                    // app version
  "branding": { "title": "WarTab", "icon": "sword" },
  "theme": { /* see below */ },
  "statusBar": { /* see below */ },
  "layout": { /* see below */ },
  "search": { /* see below */ },
  "currentPage": "page-…",             // id of active page
  "pageOrder": ["page-…", …],          // display order
  "pages": {                           // object keyed by page id
    "page-…": {
      "name": "Home",
      "icon": "sword",
      "cols": 4,                       // per-page column override
      "cards": [ /* array of card objects */ ]
    }
  }
}
```

> **Note on drift:** older docs / `PLAN.md` describe `pages` as an array and a
> flat `cards` array. The live implementation uses `pages` **as an object keyed
> by `page-<id>`**, each page owning its `cards`. `DEFAULT_CONFIG` still seeds a
> legacy `cards` array that the config loader migrates/normalizes on load
> (`config-model.js`). Treat the object-keyed `pages` model as authoritative.

## `theme`

```jsonc
{
  "bgType": "gradient",            // 'color' | 'gradient' | 'image'
  "bgValue": "#0a0a0a, #1a1a1a",  // color, gradient(), or image path
  "bgBlur": 0,                     // bg image blur 0-20
  "bgDim": 0,                      // bg image darkness 0-100
  "blur": 20,                      // card backdrop-filter blur (px)
  "glow": "#888888",               // accent (grayscale)
  "fontSizeText": 14,              // body px (10-28)
  "fontSizeHeading": 16,           // heading px (10-28)
  "fontFamily": "Inter",
  "cardBg": "dark",
  "fontColor": "#cccccc",
  "cardOpacity": 1,                // 0-1
  "cardRadius": 16,                // px
  "topBarScale": 1,                // 0.5-2.0
  "bgRotate": false,
  "animations": true,
  "showAccentBar": true
}
```

## `layout`

```jsonc
{
  "cols": 4,              // default grid columns (per-page override wins)
  "gap": 16,              // px between cards
  "pageWidth": 100,       // %  (50-100)
  "pagePadding": 2,       // top/bottom padding as % of container width (0-15)
  "pageWidthPadding": 2,  // left/right padding as % of container width (0-15)
}
```

## `statusBar`

```jsonc
{
  "enabled": true,
  "source": "local",               // 'local' | 'glances' | 'custom'
  "glancesUrl": "http://localhost:61209",
  "customUrl": "",
  "refreshInterval": 15,           // seconds
  "items": ["cpu", "memory", "disk", "uptime"],
  "hostname": true
}
```

## `search`

```jsonc
{
  "engine": "https://www.google.com/search?q=",
  "engines": { "Google": "…", "DuckDuckGo": "…", /* … */ },
  "selected": "Google",
  "openInNewTab": true
}
```

## Card model

```jsonc
{
  "id": "unique-id",
  "title": "Card Title",
  "icon": "lucide-name",            // Lucide name, emoji, or image path
  "color": "#888888",
  "width": 2,                       // grid span — MANUAL ONLY (see hard rule)
  "height": 1,                      // grid row span
  "sections": [
    {
      "id": "unique-section-id",
      "type": "links",              // module type (see modules.md)
      "label": "Resources",
      // module-specific fields follow, e.g. for links:
      "links": [ { "label": "GitHub", "url": "https://github.com", "icon": "/icons/github.svg" } ]
    }
  ]
}
```

**Hard rule (2026-08-11):** cards resize **only** via the user's explicit
`width`/`height`. WarTab never auto-resizes, auto-spans, or reflows cards based
on content. Do not re-introduce automatic card sizing.

## Section types / module defaults

Each module declares its own `defaults` and configurable fields. See
`docs/modules.md` and the `modules/*.js` files for per-type fields.

## Normalization & fallback rules

- `config-model.js` is the single normalization path. Fallback values live
  there / in `DEFAULT_CONFIG`.
- Do **not** invent per-module fallbacks elsewhere; if a normalized config
  guarantees a value, modules should rely on it.
- Add new fields to `DEFAULT_CONFIG` and the normalization path — never
  introduce a second, local default.

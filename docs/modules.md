# WarTab — Modules

Modules are WarTab's primary extension point. A module is a self-contained
widget script that registers itself with the framework. This document defines
the contract and gives a minimal example.

## How modules register

Each widget lives in `modules/<type>.js` and calls `registerModule(type, module)`
at load time. `registerModule` (defined in `core.js`) does two things:

1. Stores the module in the global `CARD_MODULES[type]` registry.
2. If the module has a `css` string, injects `<style id="mod-css-<type>">` into
   `<head>` (idempotent — only injected once).

A module file is loaded via `<script src="modules/<type>.js?v=BUILD" defer>`
in `index.html`.

## Module fields

| Field | Required | Type | Purpose |
| --- | --- | --- | --- |
| `defaults` | recommended | object | Default config for a section of this type |
| `render` | **required** | `(section, card, contentEl) => void` | Build the widget DOM into `contentEl` |
| `editor` | optional | `(section, card, editorBody) => void` | Build the config form fields |
| `settings` | optional | array | Declarative fields auto-rendered by `section-editor.js` |
| `css` | optional | string | Scoped per-module styles (auto-injected) |
| `onMount` | optional | `(section, card, contentEl) => cleanup?` | Start async work after DOM connection; return cleanup |

The `type` string must match the `section.type` value stored in config.

## Renderer contract

`render(section, card, contentEl)` receives:

- `section` — this section's config object (`{ id, type, label, ...module fields }`)
- `card` — the parent card config (for title, color, shared state)
- `contentEl` — the DOM element to append the widget's content into

The renderer must **append** content to `contentEl` (not replace the whole card).
It should be idempotent and rebuildable — `renderAll()` may call it again.

## Editor contract

`editor(section, card, editorBody)` appends form fields to `editorBody`. Use the
shared helpers from `form-helpers.js` / `config-panel.js` (`cpLabel`, `cpInput`,
`cpCheck`, etc.). Each control mutates the `section` object and calls the provided
save/refresh callback.

## Shared behavior (framework-owned, not per-module)

Modules should NOT reimplement these — the framework/core provides them:

- **Icon rendering** — `ds.icon()` in `design-system.js`
- **DOM element creation** — `el()` helper in `core.js`
- **Form controls** — `form-helpers.js`
- **HTTP requests** — `http.js`
- **Polling/lifecycle** — `WarTabHttp.createPoller({owner, ...})` and `WarTabLifecycle`
- **Reduced-motion / animation gating** — `core.js`

## Minimal example module

```js
// modules/greeting.js
registerModule('greeting', {
  defaults: { text: 'Hello!' },

  render(section, card, contentEl) {
    const el = document.createElement('div');
    el.className = 'greeting-widget';
    el.textContent = section.text || 'Hello!';
    contentEl.appendChild(el);
  },

  editor(section, card, body) {
    body.appendChild(cpInput('Text', section.text || 'Hello!', v => {
      section.text = v;
      saveAndRefresh();
    }));
  },

  css: '.greeting-widget { font-size: var(--text-xl); padding: 8px; }',
});
```

## Registered modules

| type | module | refresh/network |
| --- | --- | --- |
| `clock` | clock | timer, local time |
| `weather` | weather | external API (OpenWeatherMap) |
| `search` | search | — |
| `links` | links | — (bookmark grid) |
| `link-list` | link-list | — (compact rows) |
| `notes` | notes | server (`/api/notes/`) |
| `quotes` | quotes | — |
| `resource-monitor` | resource-monitor | server stats (`/api/stats`) |
| `api-poller` | api-poller | external/local JSON, interval |
| `media` | media | — |
| `git` | git | server / external |
| `iframe` | iframe | embed URL |
| `image` | image | — |
| `timer` | timer | timer |
| `digital-pet` | digital-pet | — |
| `lan-scan` | lan-scan | server ARP |
| `proxmox` | proxmox | server / external |
| `ascii-anim` | ascii-anim | — |
| `rss` | information | RSS/Atom through server proxy |
| `agenda` | information | public iCal through server proxy |
| `service-status` | information | HTTP service checks through server proxy |
| `markdown` | information | local static Markdown |

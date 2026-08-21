# WarTab Testing Guide

WarTab is opened constantly and stores user-authored dashboard state. Testing therefore covers data safety, interaction correctness, rendering consistency, accessibility, responsiveness, networking, and deployment.

## Automated suites

### Frontend

```bash
npm run test
npm run test:watch
```

The Vitest suite covers configuration normalization and replacement, ordered persistence, HTTP/poller behavior, render cleanup, card operations, section styling, module contracts, context menus, extension packaging, responsive UI contracts, and operational startpage behavior.

### Backend

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```

Backend tests cover static-file boundaries, CORS/CSP, upload validation, config handling, network helpers, notes, self-update behavior, and clean-distribution requirements.

### Syntax

```bash
for file in *.js modules/*.js; do node --check "$file"; done
python3 -m compileall -q server.py server_*.py
```

## Customer journey matrix

Exercise these journeys before release. Use a disposable configuration or snapshot first.

| Area | Required journeys |
| --- | --- |
| Shell | Command, Add, telemetry, overflow, pages, Undo, Redo, context menu |
| Command | Fuzzy result, `g query`, `yt query`, `@server name`, `> action`, URL/IP, keyboard selection, no-result fallback |
| Pages | Add, rename, icon, reorder, switch, delete, reload empty page |
| Cards | Add every type, rename, icon, role, duplicate, edit, delete, undo |
| Layout | Draft width/height, tablet/mobile preview, cancel, apply, undo, mobile hide/order |
| Links | Add, edit, icon, reorder, batch import, duplicate import, context actions, empty state |
| Settings | Every tab, every control, import invalid/valid config, export, reset/undo, snapshots |
| Integrations | configured, unconfigured, loading, healthy, degraded, offline, timeout, stale, retry |
| Notes | type, format, find, templates, image attachment, download, reload persistence |
| Media/iframe | invalid URL, unreachable target, sandbox behavior, constrained width |
| Update | status, no-update, apply guard, rollback guard, token-enabled and token-disabled modes |

## Module interaction pass

For every entry in `WarTabCardModel.typeDefinitions`:

1. Add the module from Card Gallery.
2. Verify its empty/default state explains the next action.
3. Open its editor and change every control once.
4. Test Apply/Cancel/Escape and focus restoration.
5. Trigger every safe in-card control.
6. Force loading, error, offline, and stale states when the module uses data.
7. Verify keyboard focus, accessible names, text status, and reduced motion.
8. Verify no console exception and no horizontal overflow.
9. Confirm changing the module never changes card geometry unless the user explicitly applies a Layout Studio draft.

## Required viewports

- 320 × 700
- 390 × 844
- 768 × 1024
- 900 × 900
- 1024 × 900
- 1400 × 1000
- 1920 × 1080

At every viewport check:

```js
document.body.scrollWidth - document.documentElement.clientWidth
```

The result must be `0`.

## Layering checks

Open each menu over:

- a normal card;
- a highlighted card;
- Notes/editor content;
- Config and Edit panels;
- Card Gallery and Layout Studio;
- a modal and toast.

Context and overflow menus use the browser top layer through the Popover API. They must never be clipped by card overflow or hidden by stacking contexts.

## Data-safety checks

- Reload an intentionally empty current page; other pages must remain intact.
- Rapidly change several settings; the final persisted state must be the newest state.
- Cancel Layout Studio; all geometry must remain byte-for-byte unchanged.
- Import malformed objects and prototype keys; sanitization must reject them.
- Simulate save failure; UI must report it without claiming success.

## Release evidence

Record:

- exact commands and pass counts;
- browser and viewport list;
- screenshots of changed surfaces;
- console/network errors;
- live commit and HTTP status;
- configuration backup or snapshot path;
- rollback commit.

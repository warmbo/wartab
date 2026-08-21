# Module UI Contract

This document is normative. It defines how every customer-facing WarTab module participates in one product UI while preserving unique content behavior.

## Principle

A module owns **data and semantic visualization**. The WarTab design system owns **shells, spacing, typography, controls, fields, rows, states, surfaces, badges, status, focus, and responsive behavior**.

Module-specific classes are legacy semantic hooks, not permission to invent a visual system. New modules should prefer `data-ui` and shared `ds.*` primitives. Existing semantic hooks may remain only where removing them would erase unique behavior such as a weather forecast, sparkline, calendar, pet body, or ASCII canvas.

## Rendered DOM contract

`renderSection()` wraps every module as:

```html
<div class="ui-module" data-ui="module" data-module="weather">
  <div class="ui-module-root" data-ui="module-root">…</div>
</div>
```

The renderer projects shared hooks onto descendants:

| Hook | Meaning |
| --- | --- |
| `data-ui="control"` | button/action |
| `data-ui="field"` | input/select/textarea |
| `data-ui="link"` | navigable destination |
| `data-ui="row"` | repeated row/item |
| `data-ui="value"` | primary numeric/text value |
| `data-ui="meta"` | label, hint, timestamp, supporting context |
| `data-ui="collection"` | list/grid/stats/actions container |
| `data-ui="state"` | loading, empty, error |
| `data-ui="media"` | image, canvas, iframe, preformatted visualization |
| `data-ui="disclosure"` | expandable detail region |
| `data-ui="disclosure-trigger"` | disclosure summary/control |

Modules may assign these explicitly. Automatic projection exists for legacy modules and is rerun after `onMount()`.

Shared `data-ui` defaults are authored with `:where()` so their specificity is zero: a module class, semantic class, or user `--mod-*` setting always wins over the shared default. The shared rule only applies to elements nothing else styles. Do not replace the `:where()` wrappers with bare `[data-ui=...]` selectors — that would raise specificity above module classes and silently override tuned module styling and per-section settings.

## Shared primitives

Use:

- `ds.card`
- `ds.statRow`
- `ds.statusRow`
- `ds.metricBar`
- `ds.badge`
- `ds.freshness` / `ds.timestamp`
- `ds.loading`
- `ds.empty`
- `ds.error`
- `ds.actionBtn`
- `ds.icon`

Do not recreate these with inline styles or module-local CSS.

## State contract

Data-backed modules must support:

1. **Loading** — stable skeleton; card dimensions do not collapse.
2. **Empty/unconfigured** — short explanation and useful configuration action.
3. **Healthy** — verified data plus checked/updated time.
4. **Warning/degraded** — text and color; explain what is impaired.
5. **Offline/error** — concise failure, last successful time if cached, Retry when useful.
6. **Unknown** — unavailable verification is not presented as offline or healthy.
7. **Stale** — cached data is labeled stale after the module-specific threshold.

One module failure must not disrupt navigation or another module.

## Styling contract

- Card background comes from `.card` and `--card-bg`; module roles may not replace it.
- Transparent cards are an explicit user choice.
- Spacing uses `--space-1` through `--space-6`.
- Radius uses `--radius-sm`, `--radius-md`, or `--radius-lg`.
- Borders use `--border-default` or another shared border token.
- Text uses `--text-primary`, `--text-secondary`, or `--text-muted`.
- State uses `--status-success`, `--status-warning`, `--status-error`, or `--status-unknown`.
- Controls use shared button/form classes or `data-ui` hooks.
- Essential metadata is at least 11px.
- Coarse-pointer actions are at least 44 × 44px.
- Motion stays within 100–200ms and respects reduced motion.
- No hard-coded card geometry, background color, border color, radius, shadow, or font family.

## IDs

IDs are reserved for real document associations:

- `aria-controls`/label relationships;
- datalist/input relationships;
- editor-only conditional-region targeting where a direct reference cannot be retained.

Do not use IDs for styling. Current modules use five or fewer functional IDs in total; tests enforce that ceiling.

## Module coverage

| Type | Role | Unique semantic content | Shared presentation expectation |
| --- | --- | --- | --- |
| Links | Launcher | bookmark tiles | shared links, controls, empty state |
| Link List | Launcher | compact destinations | shared rows/links |
| Search | Launcher | engine/query interaction | shared field/control/meta |
| Smart Links | Launcher | usage ranking | shared rows/links/meta |
| Clock | Ambient | time/calendar/world clocks | shared values/meta; calendar semantics remain |
| Weather | Ambient | condition/forecast | shared card/state/meta; forecast semantics remain |
| Timer | Metric | countdown/stopwatch | shared value/actions/fields |
| Quotes | Ambient | quote/author rotation | shared value/meta/action |
| Notes | Canvas | rich editable note | shared controls/field/meta; editor semantics remain |
| Markdown | Canvas | rendered document | shared typography/link tokens |
| Image | Ambient | image/media | shared media/empty/error/action |
| iframe | Canvas | sandboxed embed | shared media/empty/error |
| Resources | Metric | bars/sparklines | shared rows/values/meta; canvas remains semantic |
| Proxmox | Metric | cluster summary | shared status/stat rows and disclosure |
| Git | Metric | repository status | shared status/stat rows and freshness |
| API Poller | Feed | mapped JSON values | shared rows/values/state/freshness |
| Service Status | Metric | HTTP health | shared status rows/disclosure/freshness |
| Network | Metric | reachability/latency | shared status rows/disclosure/freshness |
| LAN Scan | Metric | device discovery | shared status/list rows |
| RSS | Feed | headlines | shared list/link/meta/state |
| Agenda | Feed | events | shared list/meta/state |
| Media | Feed | media-server content | shared rows/media/state/actions |
| Digital Pet | Ambient | interactive creature | shared actions/stats; creature anatomy remains semantic |
| ASCII Animation | Ambient | preformatted animation | shared media/state; canvas content remains semantic |

## Registration checklist

A new type is not complete until it has:

- Card Gallery metadata and semantic role;
- default configuration with no private data;
- render and editor/settings contract;
- loading/empty/error behavior;
- lifecycle-safe polling or cleanup;
- keyboard and pointer interaction;
- shared UI hooks;
- desktop/tablet/mobile verification;
- automated registry, syntax, and customer-journey coverage;
- README and module documentation.

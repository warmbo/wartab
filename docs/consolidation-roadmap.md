# WarTab Consolidation Roadmap

Ten concrete ideas to slim, clean, combine, and unify WarTab after the module-contract migration. Ordered by expected product and maintenance value.

## 1. Replace legacy module classes with explicit shared hooks

Migrate each module from automatic class-name inference to authored `data-ui` hooks, then delete obsolete visual classes and their CSS. Keep only unique semantic hooks for visualizations. This removes selector drift and makes the renderer's fallback normalizer temporary rather than permanent.

## 2. Combine Service Status and Network into a Health provider

Create one target model with adapters for HTTP, ping, TCP, and application APIs. A single Health module can group targets while shared providers deduplicate checks. Service and Network become presets over one engine instead of parallel systems.

## 3. Combine Links, Link List, and Smart Links

Use one bookmark module with display modes: Tiles, Rows, Recent, and Frequent. Keep one editor, deduplication pipeline, context menu, usage store, icon renderer, and responsive implementation.

## 4. Combine Notes and Markdown around one document model

Store one document with Edit and Preview modes. Templates, find, attachments, download, and Markdown rendering become one Canvas module instead of two partially overlapping modules.

## 5. Create one integration data cache

Introduce a keyed provider registry above `WarTabHttp.createPoller`. Modules subscribe to `{provider, endpoint, credentialRef}` and share cached results, retry state, freshness, visibility pause, and request deduplication. This prevents two cards from polling the same endpoint independently.

## 6. Replace module editors with declarative schemas

Expand the existing `settings` contract so every common editor uses shared fields, validation, help, requirements, and serialization. Reserve custom `editor()` functions for genuinely interactive cases. This removes repeated DOM construction and inline form styling.

## 7. Consolidate Metric modules

Resource Monitor, Git, Proxmox, API Poller, and health widgets all express summaries, stat rows, bars, statuses, freshness, and disclosure. Build one Metric composition API and migrate them, leaving only data adapters module-specific.

## 8. Consolidate Feed modules

RSS, Agenda, Media, and API list views share bounded rows, title/meta, empty/loading/error, refresh, and detail disclosure. A shared Feed renderer can receive normalized items and eliminate repeated list construction.

## 9. Split the monolithic stylesheet by ownership without adding a build step

Create ordered CSS files for tokens, shell, components, module semantics, and responsive rules, loaded directly from `index.html`. This makes cascade ownership reviewable while preserving WarTab's no-build deployment. Remove selectors only after automated DOM coverage proves them unused.

## 10. Replace source-string contract tests with behavior and visual contracts

Retain a few source guards for security boundaries, but migrate layout/module assertions to JSDOM behavior and deterministic browser screenshots. Add a generated matrix that instantiates every module and state at required viewports, clicks all safe controls, records console failures, and compares geometry/overflow/accessibility invariants.

## Suggested sequence

1. Declarative editor schema.
2. Shared integration cache.
3. Bookmark module merger.
4. Health provider merger.
5. Metric composition API.
6. Feed composition API.
7. Notes/Markdown merger.
8. Explicit `data-ui` migration and legacy selector removal.
9. Stylesheet ownership split.
10. Behavior/visual test migration.

Each merger must include a config migration, backward-compatibility fixture, export/import round trip, rollback path, and live test using a disposable configuration.

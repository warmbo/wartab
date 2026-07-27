# WarTab Logic and Clean-Code Audit Plan

> **For Hermes:** Implement this plan task-by-task. Load the `wartab`, `test-driven-development`, and `requesting-code-review` skills before execution. Do not commit unless the user explicitly requests it.

**Goal:** Improve WarTab’s correctness, reliability, testability, and code readability while preserving its current visuals, interaction model, configuration compatibility, and runtime behavior.

**Architecture:** Keep WarTab as framework-free vanilla JavaScript plus a small Python HTTP server. Consolidate duplicated domain logic into a few explicit helpers, make page/config state authoritative, give every rendered module a composable cleanup lifecycle, serialize persistence, and split server responsibilities without changing public endpoints or DOM/CSS contracts.

**Tech stack:** Browser JavaScript, DOM APIs, Vitest + jsdom, Python 3 standard library, `unittest`, `http.server`.

---

## Scope and invariants

### In scope

- Logic defects and race conditions.
- Duplicate or conflicting implementations.
- Dead code and stale compatibility paths that can be proven unused.
- Configuration normalization, migration, and persistence.
- Timer, observer, event-listener, and asynchronous-request lifecycle cleanup.
- Source-level testability and meaningful regression coverage.
- Server decomposition, atomic writes, path validation, and route consistency.
- Compact code whose intent is clear without compressed one-line functions.

### Explicitly out of scope

- No visual redesign.
- No CSS token, spacing, typography, color, animation, breakpoint, or layout changes.
- No alteration to labels, controls, shortcuts, panel behavior, card behavior, or module capabilities except to fix proven defects.
- No framework, bundler, TypeScript, or ES-module migration.
- No public endpoint or persisted configuration key rename.
- No broad “modern syntax” churn solely to replace `var` with `let`/`const`.
- No edits to user data in `config.json`, `uploads/`, `notes/`, or `snapshots/`.

### Behavior-preservation contract

Before refactoring, capture and retain these contracts:

1. The DOM element order, class names, `data-*` attributes, and visible strings for representative cards remain unchanged.
2. All existing keyboard shortcuts, page switching, edit-panel actions, add/delete/undo operations, and arrange-mode movements behave identically.
3. Existing self-hosted and extension configurations load without manual migration.
4. Existing REST paths and success/error response shapes remain stable.
5. `style.css` is not modified. `index.html` may only receive script includes required by extracted logic modules, in dependency order.
6. Current uncommitted work is preserved. At planning time the working tree has modifications in `app.js`, `arrange-mode.js`, `config-panel.js`, `dragdrop.js`, `index.html`, `render.js`, `style.css`, and `theme.js`, plus untracked `test-results/`.

---

## Preliminary audit findings that drive this plan

### High priority

1. **The JavaScript tests do not execute production code.** `tests/core.test.js:9-136` copies simplified implementations. Some copies already disagree with source behavior; for example, the test’s `timeAgo()` returns `just now` below five seconds while `core.js:1283` returns `2s ago`. A green suite can therefore coexist with broken production logic.
2. **Cleanup ownership is non-composable.** Several modules assign `card._cleanup` (`modules/clock.js`, `weather.js`, `timer.js`, `notes.js`, `digital-pet.js`, `ascii-anim.js`, `resource-monitor.js`). Multiple active sections on one card overwrite each other’s cleanup. `modules/api-poller.js:188-192` stores its interval on the widget but never connects it to `renderAll()` cleanup.
3. **Persistence is fire-and-forget and can race.** `app.js:254-269` does not return the storage promise or serialize saves. Rapid changes can complete out of order; callers cannot reliably await durable persistence.
4. **Page state has two mutable sources of truth.** `pages.js:9-23` aliases `config.cards` to `config.pages[currentPage].cards`. Code throughout the app mutates `config.cards`, while page data is intended to be authoritative. This invites stale aliases after imports, migration, resets, and page switches.
5. **The empty-state quick-add logic is structurally unsafe.** `render.js:67-71` calls `addNewCard()`, which opens a modal but does not synchronously add a card, then immediately mutates `config.cards[config.cards.length - 1]`. This can modify the wrong card instead of creating the requested card.
6. **The server accepts page shapes the client cannot safely consume.** `tests/test_server.py:81-89` explicitly accepts `pages` as a list, while `pages.js` expects an object plus `pageOrder` and `currentPage`.
7. **Server config writes are non-atomic under a threaded server.** `server.py:514-539` snapshots and writes `config.json` without a lock or atomic replace; same-second snapshot names can collide.

### Medium priority

8. **Card replacement logic is duplicated.** `edit-panel.js:122-160` repeats lookup, render, replace, highlight, title, icon, and scroll operations in two nearly identical branches.
9. **Card/section creation data is duplicated.** Type labels/icons in `app.js:341-360`, type choices in `section-editor.js:146-184`, and default section literals in `app.js`, `render.js`, and `edit-panel.js` can drift from registered module defaults.
10. **Shared utilities have competing implementations.** `getNested` exists in `core.js` and `modules/api-poller.js`; byte formatting exists in `uploads.js`, `modules/api-poller.js`, and `modules/resource-monitor.js`; `hexToRgba` exists in `theme.js` and `modules/resource-monitor.js`.
11. **Network behavior is inconsistent.** `storage.js`, `modules/api-poller.js`, `media.js`, `git.js`, `proxmox.js`, `weather.js`, and `resource-monitor.js` implement different status checks, timeout behavior, parsing, and error swallowing. Some fetches treat HTTP errors as successful data.
12. **Async work can update detached DOM.** Several modules launch fetches or delayed work without cancellation or a connected-element guard.
13. **Known dead/legacy render paths remain.** Searches show `renderApiWidget`, `renderApiFetch`, `fetchStatusWidget`, and `LOCAL_QUOTES` in `render.js` have no external callers; `setupClocks()` overlaps with the registered clock module lifecycle. Removal must be evidence-based and covered by characterization tests.
14. **The server handler is overloaded.** `server.py` combines configuration storage, uploads, notes, network probing, proxying, routing, static serving, and process startup in 674 lines.
15. **Read/write validation is inconsistent.** Note GET uses an unsanitized ID at `server.py:412-417`, while POST sanitizes it at `server.py:561-570`. Upload/icon/snapshot paths each use different ad-hoc sanitizers.
16. **Unknown GET API routes can fall through to `index.html`.** Static SPA fallback at `server.py:472-488` should not answer an unknown `/api/*` request with HTML.
17. **`renderIcons()` hides all Lucide warnings by temporarily replacing `console.warn`.** `core.js:1260` also swallows all exceptions, reducing observability.

### Current verification baseline

- `npm test`: 42 passing JavaScript tests.
- `python3 -m unittest tests/test_server.py -v`: 7 passing Python tests.
- `node --check` passes for all root and module JavaScript files.
- `python3 -m py_compile server.py stats.py` passes.

These passing counts are a baseline, not a quality target; the JavaScript suite’s copied implementations make its confidence low.

---

## Initiative 1: Build a real production-source test harness

**Objective:** Make tests execute the same functions and state transitions shipped to the browser before any refactor begins.

**Files:**
- Create: `tests/browser-harness.js`
- Rewrite: `tests/core.test.js`
- Create: `tests/config-model.test.js`
- Create: `tests/card-model.test.js`
- Modify: `vitest.config.js`
- Test without modifying: `core.js`, `app.js`, `pages.js`, `render.js`, `edit-panel.js`

### Steps

1. Add a jsdom harness that reads a production script from disk and evaluates it in an isolated window context with controlled globals (`lucide`, `storage`, timers, and required DOM nodes).
2. Expose only requested symbols from that context to each test. Do not copy function bodies into test files.
3. Rewrite the existing `escHtml`, `isLucideName`, `uid`, `cloneObj`, `timeAgo`, and `getNested` tests against `core.js` itself.
4. Move config-specific tests to `tests/config-model.test.js` when Initiative 2 extracts those pure functions. Until then, use characterization tests against current behavior rather than duplicated implementations.
5. Add explicit drift tests for current source behavior, including `timeAgo(Date.now() - 2000) === '2s ago'` unless a separate behavior change is approved.
6. Add a production-source test proving `registerModule()` stores module metadata/defaults and injects CSS only once.
7. Add focused DOM fixture tests that serialize representative card/section output. Normalize only unstable IDs and timestamps; retain class names, element order, visible text, and data attributes.
8. Keep Python tests dynamically importing production `server.py`; expand them in later initiatives rather than mocking copied server logic.

### Verification

Run:

```bash
npm test
```

Expected:
- All tests execute production scripts.
- No helper implementation remains duplicated in `tests/core.test.js`.
- The suite fails if a tested production function is changed without updating its contract.

---

## Initiative 2: Establish a canonical config and card domain model

**Objective:** Centralize configuration normalization, page ownership, card lookup, and card/section construction without changing persisted keys or UI output.

**Files:**
- Create: `config-model.js`
- Create: `card-model.js`
- Modify: `index.html` (script includes only)
- Modify: `app.js`
- Modify: `pages.js`
- Modify: `render.js`
- Modify: `edit-panel.js`
- Modify: `section-editor.js`
- Modify: `arrange-mode.js`
- Modify: `dragdrop.js`
- Modify: `page-editor.js`
- Modify: any module found by exhaustive `config.cards` search
- Test: `tests/config-model.test.js`
- Test: `tests/card-model.test.js`

### Config-model responsibilities

Keep these pure and compact:

- `deepMerge(defaults, override)`.
- `sanitizeImportConfig(raw)`.
- `normalizeConfig(raw, defaults)`.
- Legacy font-size, page-width, emoji, and page-shape migration.
- `getCurrentPage(config)` and `getCurrentCards(config)`.
- Page-list-to-page-map normalization using each legacy page’s `id`; generate an ID only when absent.
- Guarantee valid `pages`, `pageOrder`, `currentPage`, and `cards` arrays before rendering.

### Card-model responsibilities

- `getCardById(config, cardId)`.
- `getCardIndex(config, cardId)`.
- `createSection(type, overrides)` using `CARD_MODULES[type].defaults` plus universal section style defaults.
- `createCard(type, overrides)` using a single type definition and `createSection()`.
- `addCard(config, type, overrides)` returning the created card.
- `removeCard(config, cardId)` returning enough information for undo.
- `moveArrayItem()` or `swapArrayItems()` for the limited reorder operations that truly share semantics.

### Steps

1. Write failing tests for config normalization: no-pages legacy config, object pages, list pages, missing `pageOrder`, invalid `currentPage`, import with null entries, and import with embedded data URLs.
2. Extract existing migration/sanitization behavior from `app.js:233-317` into `config-model.js`; preserve warning strings and resulting values unless correcting a demonstrated defect.
3. Make `config.pages[currentPage].cards` authoritative. Replace direct reads/writes of `config.cards` with `getCurrentCards(config)` throughout production JavaScript.
4. Keep `config.cards` only as a migration input. Do not maintain it as a mutable runtime alias after normalization.
5. Add a single `CARD_TYPE_DEFS` registry containing stable `type`, `label`, and `icon` metadata. Use it in both the add-card picker and section type selector.
6. Use module `defaults` as the only type-specific section-default source.
7. Replace duplicate literal section creation in `app.js`, `render.js`, and both add-section handlers in `edit-panel.js` with `createSection()`/`createCard()`.
8. Fix empty-state Clock and Links actions to create their intended card directly rather than opening the generic picker and mutating the previous last card.
9. Search the entire project for remaining `config.cards`, type-list literals, and duplicated default section objects. Every remaining occurrence must have a documented migration-only reason.

### Verification

```bash
npm test
node --check config-model.js
node --check card-model.js
for f in *.js modules/*.js; do node --check "$f"; done
```

Expected:
- Page switching never leaves a stale card-array reference.
- Legacy configurations normalize to the canonical page map.
- Empty-state quick actions create new cards and never modify an existing card.
- Add-card and change-section paths use the same type metadata and module defaults.
- No visible DOM fixture changes.

---

## Initiative 3: Make persistence ordered, awaitable, and explicit

**Objective:** Prevent stale writes and remove repeated save/render/apply sequences while retaining the current save indicator and error feedback.

**Files:**
- Create: `config-store.js`
- Modify: `index.html` (script include only)
- Modify: `app.js`
- Modify: `edit-panel.js`
- Modify: `config-panel.js`
- Modify: `pages.js`
- Modify: `uploads.js`
- Modify: module editors that call `saveConfig()`
- Test: `tests/config-store.test.js`

### Design

Implement a small store, not a framework:

- `saveConfig()` returns a Promise.
- Save requests execute serially.
- Each request captures a clone of the intended config state.
- If many unsent requests accumulate, coalesce them so only the newest unsent snapshot is written; never reorder in-flight writes.
- A failed save rejects the relevant Promise, leaves the latest state eligible for retry, reports one actionable error, and does not emit `config:saved`.
- `config:saved` receives the exact persisted snapshot rather than a later mutable global object.

Separate persistence from rendering:

- `persistConfig()` performs I/O only.
- `replaceRenderedCard(cardId)` performs targeted card cleanup and replacement only.
- `refreshEditedCard({ rebuildEditor })` owns edit-panel refresh behavior.
- `applyThemeAndPersist()` is used only when both operations are genuinely required.

### Steps

1. Add fake-storage tests proving ordered writes under intentionally reversed network completion.
2. Add tests proving coalescing retains the latest snapshot and that returned Promises settle correctly.
3. Move save success animation, event emission, and error reporting behind the store’s settled result.
4. Refactor `edit-panel.js:122-167` into one card lookup/replacement path with an optional editor rebuild.
5. Replace repeated `saveConfig(); renderAll();`, `saveConfig(); applyTheme();`, and `saveConfig(); initStatusBar();` sequences with narrowly named operations only where the sequence is identical.
6. Keep structural and non-structural edit refresh semantics unchanged.
7. Ensure config import, snapshot restore, and reset await durable persistence before reporting success.

### Verification

```bash
npm test
```

Expected:
- A delayed earlier save cannot overwrite a newer state.
- All import/restore/reset success messages occur after persistence succeeds.
- Edit panel DOM fixtures and interaction behavior remain unchanged.

---

## Initiative 4: Introduce composable render lifecycle cleanup

**Objective:** Guarantee that every timer, observer, animation frame, global listener, delayed callback, and request belongs to the rendered section that created it and is stopped before replacement.

**Files:**
- Create: `render-lifecycle.js`
- Modify: `index.html` (script include only)
- Modify: `render.js`
- Modify: `edit-panel.js`
- Modify: `pages.js`
- Modify: `modules/api-poller.js`
- Modify: `modules/ascii-anim.js`
- Modify: `modules/clock.js`
- Modify: `modules/digital-pet.js`
- Modify: `modules/notes.js`
- Modify: `modules/resource-monitor.js`
- Modify: `modules/timer.js`
- Modify: `modules/weather.js`
- Inspect and modify as necessary: every file containing `setInterval`, `setTimeout`, `requestAnimationFrame`, `IntersectionObserver`, `ResizeObserver`, or document/window listeners
- Test: `tests/render-lifecycle.test.js`

### Design

Use cleanup composition at the rendered section/DOM level, not on the shared config card object:

- `addCleanup(ownerElement, cleanupFn)` appends an idempotent cleanup callback.
- `cleanupElement(ownerElement)` runs all callbacks once and clears them.
- `cleanupSubtree(root)` cleans child sections before their DOM is destroyed.
- `setManagedTimeout`, `setManagedInterval`, `requestManagedAnimationFrame`, and observer registration may be added only if they materially reduce repeated lifecycle code.

The module lifecycle contract becomes:

1. `render()` constructs DOM only.
2. `onMount()` starts work that requires connected DOM.
3. All work registers cleanup against `contentWrap`.
4. A targeted card replacement calls `cleanupSubtree(oldCard)` before `replaceWith()`.
5. `renderAll()` calls `cleanupSubtree(grid)` before clearing it.

### Steps

1. Write fake-timer tests with two timed sections on one card. Verify both cleanups run exactly once.
2. Add a test proving targeted card replacement cleans the old section before creating the new one.
3. Replace all `card._cleanup = ...` assignments with composable section-owned cleanup.
4. Register API poller intervals; currently `modules/api-poller.js:188-192` leaves them outside the global cleanup path.
5. Track and clear the digital pet’s unassigned `setInterval(updateAll, 5000)` and delayed fact timers.
6. Disconnect `ResizeObserver` instances created by page navigation before rebuilding tabs.
7. Cancel pending collapse timers, label-shrink timers, delayed quote starts, and animation starts when their owner is detached.
8. Add connected-element or generation guards to asynchronous completions so stale requests cannot modify replacement DOM.
9. Remove global `clockInterval`, `weatherIntervals`, and `apiPollTimers` only after every owner has migrated and tests prove equivalent updates.

### Verification

```bash
npm test
```

Expected:
- Repeated `renderAll()` and targeted card replacement leave no increasing timer/observer/listener count.
- Multiple dynamic sections in one card clean up independently.
- No module updates detached DOM.
- Module DOM fixtures remain unchanged.

---

## Initiative 5: Consolidate request and polling logic

**Objective:** Give every client request consistent HTTP validation, timeout, parsing, cancellation, and polling behavior without changing displayed success/error states.

**Files:**
- Create: `request.js`
- Modify: `index.html` (script include only)
- Modify: `storage.js`
- Modify: `stats.js`
- Modify: `modules/api-poller.js`
- Modify: `modules/git.js`
- Modify: `modules/media.js`
- Modify: `modules/proxmox.js`
- Modify: `modules/resource-monitor.js`
- Modify: `modules/weather.js`
- Remove after proof: `fetchWithTimeout` from `core.js`
- Test: `tests/request.test.js`
- Test: `tests/polling.test.js`

### Request contract

`request(url, options)` should:

- Reject non-2xx responses with a stable error containing status and status text.
- Support JSON, text, and auto response modes.
- Compose a caller-provided `AbortSignal` with a timeout.
- Clear timeout state in `finally`.
- Preserve method, headers, and body behavior required by API Poller and media modules.
- Never log credentials or full authorization headers.

`startPolling(task, interval, ownerElement)` should:

- Execute immediately when requested.
- Schedule the next run only after the previous run settles, preventing overlap.
- Stop when its owner is detached or cleaned.
- Keep the module’s existing minimum interval and visible status semantics.

### Steps

1. Add request tests for 2xx JSON, 2xx text, non-2xx JSON errors, malformed JSON, timeout, and explicit abort.
2. Replace `storage.js:30-50` server API handling first and verify all storage tests.
3. Migrate polling modules one at a time; run the suite after each module.
4. Replace silent `.catch(() => ...)` branches with explicit fallback helpers that retain current placeholder output and optionally log a sanitized diagnostic.
5. Do not expose API keys in DOM, exceptions, or logs.
6. Remove duplicated `apiFetch`, `mediaFetch`, `directFetch`, and similar wrappers only after every caller uses the shared request contract.

### Verification

```bash
npm test
```

Expected:
- HTTP errors are not parsed as successful payloads.
- Pollers cannot overlap themselves.
- Cleanup aborts or invalidates in-flight work.
- Existing module loading/error text remains unchanged.

---

## Initiative 6: Consolidate shared pure utilities and remove proven dead code

**Objective:** Reduce repetition without creating a generic dumping ground or changing output formatting.

**Files:**
- Modify: `core.js`
- Modify: `render.js`
- Modify: `uploads.js`
- Modify: `modules/api-poller.js`
- Modify: `modules/resource-monitor.js`
- Modify: `theme.js`
- Modify as proven: `modules/git.js`, `modules/media.js`, `modules/proxmox.js`
- Test: `tests/core.test.js`
- Test: relevant module tests

### Steps

1. Make `getNested()` in `core.js` the single implementation. Define and test its exact empty-path, array-index, falsy-value, and missing-property behavior before migration.
2. Introduce one parameterized byte formatter only if it can preserve each caller’s current units, spacing, precision, suffix, and maximum unit. Otherwise keep intentionally different formatters with distinct names (`formatFileSize`, `formatTransferRate`) rather than forcing false reuse.
3. Share color conversion only if the accepted input formats and fallback behavior are identical; add tests for 3-digit/6-digit/invalid colors before consolidation.
4. Extract exact duplicate stat-row/group-header construction from `media.js`, `proxmox.js`, and `git.js` only when DOM fixtures prove identical output. Place feature-neutral module rendering helpers in a focused `module-ui.js`, not `core.js`.
5. Prove no runtime references exist for `renderApiWidget`, `renderApiFetch`, `fetchStatusWidget`, `LOCAL_QUOTES`, and any overlapping global clock path using exhaustive symbol search and tests.
6. Remove only proven dead functions/constants and their obsolete global timer arrays.
7. Replace `renderIcons()` console monkey-patching with targeted missing-icon handling. Preserve initialization if Lucide is unavailable, but report unexpected failures once.
8. Reformat touched compressed one-line functions into compact multi-line code where branching or side effects are hidden. Do not reformat untouched files wholesale.

### Verification

```bash
npm test
for f in *.js modules/*.js; do node --check "$f"; done
```

Expected:
- Each shared utility has one production implementation and direct source tests.
- No false abstraction changes caller output.
- Removed symbols have zero references.
- No DOM fixture changes.

---

## Initiative 7: Make server storage safe and deterministic

**Objective:** Prevent data corruption and inconsistent path behavior while preserving endpoint paths and normal response bodies.

**Files:**
- Create: `server_config.py`
- Create: `server_files.py`
- Modify: `server.py`
- Modify: `tests/test_server.py`
- Create: `tests/test_server_http.py`

### Server config responsibilities

- Config schema validation and canonical page-shape validation.
- Atomic JSON writes using a temporary file in the same directory, flush/fsync as appropriate, then `os.replace()`.
- A process-local lock around snapshot-and-replace.
- Collision-free snapshot names using microseconds or an incrementing suffix.
- Snapshot pruning after a successful atomic write.
- Restore through the same validation and atomic-write path.

### Server file responsibilities

- One reusable safe-name/ID validator for notes, uploads, icons, and snapshots, parameterized only where allowed character sets genuinely differ.
- Upload/icon processing and listing.
- Note read/write with identical validation.
- Explicit file-size limits before reading request bodies.

### Steps

1. Write tests using temporary directories; never touch real `config.json`, `notes/`, `uploads/`, or `snapshots/`.
2. Add concurrent-save tests that issue multiple writes and assert the final file is valid complete JSON, never a partial mixture.
3. Add snapshot-collision and prune-order tests.
4. Add path tests for `..`, encoded separators, empty IDs, Unicode edge cases, and valid existing IDs.
5. Normalize or reject list-form pages consistently with the client’s canonicalization rules. Prefer accepting legacy input only if it is normalized before persistence.
6. Make unknown `/api/*` GET routes return the existing JSON not-found shape and 404 instead of serving `index.html`.
7. Make malformed stored config and malformed snapshots return controlled JSON errors rather than terminating the request thread.
8. Keep normal API paths and success bodies stable.

### Verification

```bash
python3 -m unittest tests/test_server.py tests/test_server_http.py -v
python3 -m py_compile server.py server_config.py server_files.py stats.py
```

Expected:
- Concurrent writes remain valid and ordered under the chosen lock contract.
- Reads and writes apply the same path rules.
- Unknown API GET routes return JSON 404.
- Existing valid API calls retain their response shape.

---

## Initiative 8: Decompose routing and network tools without changing APIs

**Objective:** Reduce `server.py` to entry point, handler orchestration, and static serving while keeping dependencies shallow.

**Files:**
- Create: `server_network.py`
- Move from: `server.py:196-404` network/proxy/cert/ping/docker logic
- Modify: `server.py`
- Modify: `tests/test_server_http.py`
- Create: `tests/test_server_network.py`

### Steps

1. Move ARP scanning, proxying, certificate checks, ping, Docker status, and local-IP discovery into `server_network.py` with no request-handler dependency.
2. Replace the long method-specific `if` chains with small private route dispatch methods grouped by GET/POST/DELETE. Do not introduce a generic router framework.
3. Keep static-file and SPA fallback logic isolated and last; explicitly exclude `/api/` from SPA fallback.
4. Preserve CORS and CSP header behavior in this cleanup. Any policy change requires a separate security decision because it can alter deployment behavior.
5. Preserve proxy TLS behavior during the pure refactor. Record insecure certificate verification as a follow-up decision rather than silently changing self-signed-LAN compatibility.
6. Add direct unit tests for pure network parameter validation and mocked subprocess/URL operations.
7. Keep `server.py` comfortably below 350 lines and each extracted server module focused on one responsibility.

### Verification

```bash
python3 -m unittest discover -s tests -p 'test_server*.py' -v
python3 -m py_compile server.py server_config.py server_files.py server_network.py stats.py
```

Expected:
- Every existing endpoint is registered exactly once.
- Public paths and normal response shapes are unchanged.
- No extracted module imports the HTTP handler.

---

## Initiative 9: Final exhaustive audit and behavior-neutral quality gate

**Objective:** Prove that the cleanup reduced duplication and lifecycle risk without visual or usability regression.

**Files:**
- Modify only files required by findings from the checks below.
- Update: `README.md` only if architecture/file-map or test commands became stale.

### Static and structural checks

1. Search all production JavaScript for:
   - copied `getNested`, byte/color formatting, card lookup, type arrays, and section defaults;
   - `card._cleanup` assignments;
   - unmanaged `setInterval`, `requestAnimationFrame`, observers, and document/window listeners;
   - direct `config.cards` use outside legacy normalization;
   - direct `fetch(` outside `request.js` and deliberate low-level adapters;
   - empty catches and `.catch(() => {})`;
   - duplicate save/apply/render chains;
   - unreferenced compatibility functions.
2. Every remaining occurrence must be either removed, migrated, or documented with a specific reason.
3. Verify extracted script order in `index.html`: low-level utilities → config/card/store/lifecycle/request → rendering/editing → app/bootstrap → modules.
4. Verify extension packaging includes every new runtime file by inspecting and running `extension/build.sh`.

### Full verification commands

```bash
npm test
python3 -m unittest discover -s tests -v
for f in *.js modules/*.js; do node --check "$f"; done
python3 -m py_compile server.py server_config.py server_files.py server_network.py stats.py
bash extension/build.sh chrome
bash extension/build.sh firefox
```

Expected:
- All tests pass.
- Both extension builds include all new scripts and produce no missing-file errors.
- No source syntax errors.

### Live smoke verification

1. Start `python3 server.py --bind 127.0.0.1 --port 8081` against a temporary config/data root supported by the extracted storage services or a test fixture.
2. Verify with HTTP requests:
   - `/` returns HTML.
   - `/api/config` returns canonical valid config.
   - config save/load round trip preserves values.
   - note save/load round trip preserves content.
   - unknown `/api/...` returns JSON 404.
   - upload oversize request returns 413.
3. Load the dashboard in a browser and check the console for errors while performing:
   - page switch;
   - add card and add section;
   - soft edit and structural edit;
   - arrange move;
   - snapshot create/restore/delete;
   - config export/import;
   - repeated full renders with timer-based modules.
4. Compare representative pre/post DOM fixture output. Since `style.css` is untouched, any unexplained structural/class/text difference is a blocker.
5. Inspect timer/observer counts across repeated card replacements. Counts must return to baseline after cleanup.

### Final report format

At implementation completion, report:

- Logic defects fixed.
- Duplicate implementations removed.
- Dead code removed, with evidence of zero references.
- Source/test line-count changes by file.
- Tests added and final passing counts.
- Remaining intentional duplication and why it remains.
- Any behavior/security decision deferred because it could affect deployment usability.
- Confirmation that `style.css` and visual contracts were unchanged.

---

## Implementation order and stop conditions

Implement strictly in this order:

1. Real source tests.
2. Config/card model.
3. Persistence ordering.
4. Lifecycle cleanup.
5. Request/polling consolidation.
6. Utility/dead-code cleanup.
7. Server storage integrity.
8. Server decomposition.
9. Exhaustive verification.

After each initiative:

1. Run its targeted tests.
2. Run the full JavaScript and Python suites.
3. Run syntax checks for every touched source file.
4. Inspect `git diff --stat` and `git diff --check`.
5. Stop and revert the initiative’s last refactor if behavior fixtures change without an approved defect fix.

Do not combine initiatives into one broad rewrite. Do not commit or push unless explicitly requested. Preserve the current uncommitted working tree throughout execution.

---

## Success criteria

The audit/improvement work is complete when all of the following are true:

- Tests execute production JavaScript rather than copied equivalents.
- Config has one canonical page/card ownership model.
- Card and section construction comes from one registry/factory path.
- Persistence is ordered and awaitable.
- Every timer, observer, animation, listener, and asynchronous poll has composable cleanup.
- Shared request behavior validates status, times out, and avoids overlapping polls.
- Duplicate helpers are consolidated only where semantics match.
- Proven dead render paths are removed.
- Server writes are atomic and path validation is consistent.
- `server.py` has a focused orchestration role.
- Existing configuration files and API paths remain compatible.
- `style.css` is unchanged and DOM/interaction contracts pass regression checks.
- Full tests, syntax checks, extension builds, and live smoke checks pass.

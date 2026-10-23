# WarTab quality refinement

## Scope

Refine the existing startpage rather than replace its layout system. Preserve user-authored card dimensions, order, mobile visibility and content. No new runtime or development dependencies.

## Implemented

- Gallery filtering now removes cards from the rendered layout; category buttons expose their selected state, searches announce result counts, and unrelated starting templates disappear while filtering.
- Layout Studio reads the actual current page, survives reopening/replacing another surface, clamps spans to preview columns, retains keyboard focus after a step, and leaves saved geometry untouched on Cancel.
- Gallery/layout/preset dialogs contain keyboard navigation and return focus to their trigger. Nested confirmations own Escape independently.
- Launcher labels stay readable instead of shrinking to 8–9px; two lines and native titles preserve longer names.
- Ornament and readable accent foreground are separate. Black/bright user accents no longer erase note links, weather badges, focus rings or primary actions. Foreground generation uses linearized sRGB luminance.
- Floating interfaces have dedicated light-mode surfaces. Touch-only controls receive larger hit targets and card editing remains discoverable without hover.
- Config saves retain the newest state through one transient retry. Regression tests also pin the non-serialized page-card accessor contract. Extension and server note-loading shapes now match, avoiding an empty-content overwrite.
- Notes rich-text paste rebuilds allowed elements and strips executable markup, unsafe URL schemes, event handlers and inline styles. Linkification excludes trailing prose punctuation.
- HTTP helpers accept successful empty JSON bodies and report malformed JSON clearly.
- Static serving normalizes request paths and confines resolved files to the application root; regression tests exercise private-file boundaries.
- Network discovery derives the actual host gateway rather than assuming the author's subnet.
- Clean installs and the example config start with an empty New Tab and opt-in telemetry. Existing saved configurations are not replaced. Helper scripts derive their repository path instead of embedding a personal home directory.

## Verification

- Frontend Vitest and backend unittest suites.
- JavaScript syntax and shell syntax checks; whitespace/diff checks.
- Native Node 22+ browser smoke, without adding Playwright/Puppeteer dependencies.
- Every configured page at 320, 390, 768, 900, 1024, 1400 and 1920px, dark and light modes.
- Populated dashboard and empty first-run cases; no horizontal overflow or browser runtime exceptions.
- Gallery no-match filtering, Layout Studio reopening and all three preview modes, cancellation preserving geometry.
- Coarse-pointer emulation asserts the changed gallery touch-target dimensions.
- Cache and service-worker bypass; reduced-motion screenshots; background rotation disabled only in the QA response, with outgoing writes blocked.
- Independent UI/backend/persistence reviews before release. Findings fixed rather than waived.

## Deliberately not changed

- No automatic card resizing/reordering or unsolicited replacement dashboard.
- No new state framework, UI library, module catalog, or speculative settings layer.
- No reverse-proxy, network ACL or authentication-gateway changes. The existing trusted-user deployment boundary still applies; same-origin CORS is not authentication.

## Follow-up priorities

1. An explicitly approved authentication boundary for any instance reachable by untrusted users.
2. Broader module-by-module interaction coverage beyond this release's rendering and core-journey sweep.
3. A future static-asset allowlist, replacing the legacy denylist, with compatibility coverage for uploaded assets and extension packaging.

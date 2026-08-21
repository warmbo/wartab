# Customer Release Checklist

WarTab is pre-1.0. Use this gate for any release intended for people outside the development environment.

## Product

- [ ] Release scope and user-visible behavior documented
- [ ] No unfinished or dead controls
- [ ] Empty states teach the next action
- [ ] Labels are concise and operational
- [ ] Existing configuration migrates without loss
- [ ] Export/import round trip succeeds
- [ ] Rollback commit and configuration snapshot recorded

## UI and accessibility

- [ ] All module types comply with `docs/module-ui-contract.md`
- [ ] Card backgrounds, headers, spacing, borders, controls, and states are consistent
- [ ] Context and overflow menus appear in the browser top layer
- [ ] Keyboard-only pass completed
- [ ] Visible focus and accessible names verified
- [ ] Status is text plus color
- [ ] Reduced-motion pass completed
- [ ] No horizontal overflow at required viewports
- [ ] No unexpected layout movement during loading
- [ ] Manual card geometry remains unchanged unless explicitly applied

## Functional journeys

- [ ] Every item in `TESTING.md` exercised
- [ ] Every module added, configured, edited, and interacted with
- [ ] Invalid and boundary input tested
- [ ] Offline, timeout, stale, retry, and recovery tested
- [ ] Rapid/repeated clicks do not duplicate actions
- [ ] Escape and outside-click behavior verified for every overlay
- [ ] Undo/redo behavior verified after destructive actions

## Security and privacy

- [ ] No secret/private data in tracked files or screenshots
- [ ] Static denylist and SPA allowlist tested
- [ ] Same-origin CORS and CSP verified
- [ ] Proxy/network input validation tested
- [ ] Upload validation and bounds tested
- [ ] Update authorization modes tested
- [ ] Dependency and license review completed

## Engineering

- [ ] Frontend tests pass
- [ ] Backend tests pass
- [ ] JavaScript syntax checks pass
- [ ] Python compile checks pass
- [ ] Extension package test passes
- [ ] Independent code review reports no blocking issue
- [ ] No unexplained console errors or failed core assets
- [ ] Pollers/listeners/timers clean up when cards rerender
- [ ] Documentation matches current UI and APIs

## Deployment

- [ ] Both official remotes point to the release commit
- [ ] Configuration snapshot created before deploy
- [ ] Service restart succeeds
- [ ] Live HTML and changed assets return HTTP 200
- [ ] Live desktop/tablet/mobile browser checks pass
- [ ] Live commit/version displayed correctly
- [ ] Rollback procedure tested or rehearsed

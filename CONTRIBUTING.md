# Contributing to WarTab

Thank you for helping improve WarTab. This project is intended to become a dependable customer-facing startpage, so changes must preserve user data, remain reversible, and pass both automated and human-style interaction checks.

## Before you start

1. Read `docs/architecture.md`, `docs/configuration.md`, and `docs/module-ui-contract.md`.
2. Search existing modules and shared `ds.*` components before creating UI.
3. Preserve the configuration schema and all existing migrations.
4. Never automatically resize, span, reorder, or move a user's cards.
5. Never commit `config.json`, snapshots, uploads, tokens, private addresses, or credentials.

## Local setup

```bash
npm install
python3 server.py --port 8081
```

Open <http://localhost:8081>.

WarTab has no production build step and no runtime package dependencies. Python server code must remain standard-library-only unless a project decision explicitly changes that constraint.

## Branch and commit workflow

- Branch from `main`.
- Keep commits focused and reversible.
- Use conventional commit subjects: `feat(area):`, `fix(area):`, `refactor(area):`, `test(area):`, `docs(area):`.
- Do not rewrite public history.
- Keep GitHub and Forgejo branches synchronized when maintaining an official mirror.

## Module requirements

Every registered module must:

- implement `render(section, card, surface)`;
- use shared state components (`ds.loading`, `ds.empty`, `ds.error`);
- expose common UI through shared `data-ui` hooks;
- use `WarTabHttp.request` and `WarTabHttp.createPoller` for network work;
- return lifecycle cleanup for timers, observers, or listeners;
- use design tokens, not literal colors, radii, spacing, or shadows;
- communicate status with text as well as color;
- provide a useful configured, empty, loading, error, offline, and stale state where applicable;
- avoid IDs unless an actual label/list/ARIA association requires one;
- avoid module-owned shell, field, button, row, badge, state, or surface styling;
- keep module-specific selectors only for unique semantic visualizations (for example a sparkline canvas or digital-pet body part).

See `docs/module-ui-contract.md` for the complete contract.

## Required checks

```bash
npm run test
node --check path/to/changed.js
python3 -m unittest discover -s tests -p 'test_*.py'
```

Then perform the relevant scenarios in `TESTING.md` at desktop, tablet, and mobile widths. A passing unit suite is necessary but not sufficient for UI work.

## Pull requests

A pull request must explain:

- the user problem;
- what changed;
- configuration or migration impact;
- rollback path;
- tests added or updated;
- viewports and interactions manually verified;
- screenshots for visible changes;
- known limitations.

Reviewers should reject changes that silently mutate card geometry, invent unavailable status data, expose secrets, bypass shared UI/network/lifecycle primitives, or add a second implementation of an existing component.

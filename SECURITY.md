# Security Policy

## Supported versions

WarTab is currently pre-1.0. Security fixes are applied to the latest `main` release. Deployments should update to the newest published commit before reporting a fixed issue.

## Reporting a vulnerability

Do not open a public issue for vulnerabilities involving authentication, path traversal, data exposure, update authorization, request proxying, uploads, or configuration disclosure.

Report privately to the repository owner through the hosting platform's private security channel. Include:

- affected commit;
- deployment mode (server or extension);
- reproduction steps;
- impact;
- proof of concept with secrets removed;
- suggested mitigation if known.

Do not test against systems you do not own or have permission to assess.

## Security boundaries

WarTab's server intentionally blocks direct access to configuration, snapshots, source, tests, repository metadata, update tokens, and private data directories. CORS is same-origin. Content Security Policy is enabled. Uploads are validated by file signature and bounded before processing.

The proxy and network endpoints are powerful because self-hosted dashboards commonly reach private services. Operators should expose WarTab only to trusted users, configure update authentication when required, use HTTPS at the reverse proxy, and avoid placing privileged service credentials in configurations shared with untrusted clients.

## Secrets

Never commit:

- `config.json`;
- `.env` files;
- API tokens or passwords;
- update-token files;
- snapshots;
- uploaded private media;
- customer hostnames, IP inventories, or credentials in examples/tests.

Use placeholders and localhost/documentation addresses in committed examples.

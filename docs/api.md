# WarTab — API Reference

All endpoints are served by `server.py` (stdlib `http.server`) and return JSON.
Routes live in the `do_GET` / `do_POST` dispatch tables.

## Conventions

- **Base:** the server root, e.g. `http://localhost:8081` or the LAN host.
- **Content-Type:** all `/api/*` responses are `application/json`.
- **Errors:** a JSON object `{ "error": "<machine-readable>" }` with a 4xx/5xx
  status. Frontend callers should rely on `http.js` for consistent handling.
- **No auth by default** — self-hosted LAN model. The self-update endpoints are
  the exception (see below).

## GET endpoints

| Path | Purpose | Response | Caller |
| --- | --- | --- | --- |
| `/api/config` | Current config | `{ ...config }` | `storage.js` |
| `/api/config/backups` | List snapshots | `{ backups: [...] }` | config panel |
| `/api/stats` | System stats (CPU/RAM/disk/uptime) | `{ ... }` | `resource-monitor`, status bar |
| `/api/uploads` | List uploaded images | `{ images: [...] }` | background picker |
| `/api/arp` | ARP scan of LAN | `{ hosts: [...] }` | `lan-scan` module |
| `/api/docker` | Docker containers | `{ ... }` | proxmox/docker UI |
| `/api/icons/list` | Icon library list | `{ icons: [...] }` | icon picker |
| `/api/icons/check` | Icon availability check | `{ ... }` | icon picker |
| `/api/ping?host=…` | Ping a host | `{ ok, ms, ... }` | `lan-scan` |
| `/api/cert-check?url=…` | TLS cert status | `{ ... }` | network UI |
| `/api/update/status` | Update status (TTL-cached) | `{ update_available, current_commit, repo_url, ... }` | `updates.js` |
| `/api/update/log?after=N` | Update terminal log from offset N | `{ entries, last, active }` | `updates.js` |
| `/api/notes/<id>` | Note content | `{ id, content }` | `notes` module |

## POST endpoints

| Path | Purpose | Request | Response |
| --- | --- | --- | --- |
| `/api/config` | Save config | JSON config body | `{ ok: true }` |
| `/api/upload` | Upload an image | multipart/form-data | `{ url }` |
| `/api/upload-icon` | Upload an icon | multipart/form-data | `{ url }` |
| `/api/save-icon` | Save an icon | JSON | `{ ok: true }` |
| `/api/proxy` | Server-side URL proxy | `{ url }` | proxied body |
| `/api/update` | Trigger self-update | — | `{ status: "started" }` |
| `/api/update/rollback` | Roll back to last-good build | — | `{ status: "started" }` |
| `/api/notes/<id>` | Save note | `{ content }` | `{ ok: true }` |
| `/api/icons/delete/<name>` | Delete an icon | — | `{ ok: true }` |
| `/api/config/restore/<id>` | Restore a config snapshot | — | `{ ok: true }` |
| `/api/config/delete-snapshot/<id>` | Delete a snapshot | — | `{ ok: true }` |

## DELETE endpoints

| Path | Purpose |
| --- | --- |
| `/api/upload/<name>` | Delete an uploaded image/icon |

## Self-update auth (opt-in token)

The self-update endpoints (`/api/update`, `/api/update/rollback`,
`/api/update/log`) are **open by default** — no token required (since
2026-08-11). A token is enforced **only** when `WARTAB_UPDATE_TOKEN` is set in
the environment, or a `data/.update_token` file exists; in that case the
mutating + log endpoints require the `X-WarTab-Update-Token` header to match.
`GET /api/update/status` is always public.

## Notes

- `/api/ping`, `/api/cert-check`, `/api/proxy` reach into the network via
  `server_network.py` — they may be slow or fail if the target is unreachable;
  the frontend should degrade gracefully.
- Config endpoints snapshot before writing (see `server_config.py`); restore is
  available via `/api/config/restore/<id>`.

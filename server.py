#!/usr/bin/env python3
"""WarTab HTTP entry point, route orchestration, and static serving."""

import glob
import http.server
import json
import logging
import urllib.parse
from pathlib import Path

from server_config import ConfigStorage, validate_config
from server_defaults import build_minimal_config
from server_files import (IMAGE_EXTENSIONS, list_images, process_icon,
                          process_image, safe_file_identifier)
from server_network import (handle_cert_check, handle_docker, handle_ping,
                            handle_proxy, scan_arp)
from server_startup import detect_git_version, run
import server_update
from stats import build_stats

log = logging.getLogger("wartab")
log.setLevel(logging.DEBUG)
if not log.handlers:
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    log.addHandler(stream_handler)

HERE = Path(__file__).parent.resolve()
UPLOADS = HERE / "uploads"
ICONS = HERE / "icons"
STATIC = HERE / "static"
ICONS_DIR = UPLOADS / "icons"
NOTES = HERE / "notes"
for directory in (UPLOADS, ICONS, STATIC / "fonts", ICONS_DIR, NOTES):
    directory.mkdir(parents=True, exist_ok=True)
CONFIG_STORAGE = ConfigStorage(HERE / "config.json", HERE / "snapshots")
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Filename,X-WarTab-Update-Token",
}
MAX_W, MAX_H, MAX_BYTES = 99999, 99999, 20 * 1024 * 1024

GIT_VERSION = detect_git_version(HERE)
MINIMAL_CONFIG = build_minimal_config(GIT_VERSION)


class WarTabHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self._dispatch_get():
            return
        if urllib.parse.urlparse(self.path).path.startswith("/api/"):
            return self._json({"error": "not_found"}, 404)
        return self._serve_static_or_spa()

    def _dispatch_get(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        exact = {
            "/api/stats": lambda: self._json(build_stats()),
            "/api/uploads": lambda: self._json(list_images(UPLOADS, "/uploads")),
            "/api/config/backups": self._get_backups,
            "/api/config": self._get_config,
            "/api/arp": lambda: self._json(scan_arp()),
            "/api/docker": lambda: self._network_response(handle_docker()),
            "/api/icons/list": self._get_icons,
            "/api/icons/check": self._get_icon_status,
            "/api/update/status": self._get_update_status,
            "/api/update/log": self._get_update_log,
        }
        if path in exact:
            exact[path]()
            return True
        if path.startswith("/api/notes/"):
            self._get_note(path)
            return True
        network = {"/api/ping": handle_ping, "/api/cert-check": handle_cert_check}
        if path in network:
            params = {key: values[0] for key, values in urllib.parse.parse_qs(parsed.query).items()}
            self._network_response(network[path](params))
            return True
        return False

    def do_POST(self):
        if not self._dispatch_post():
            self._json({"error": "not_found"}, 404)

    def _dispatch_post(self):
        path = urllib.parse.urlparse(self.path).path
        exact = {
            "/api/upload": self._post_upload, "/api/upload-icon": self._post_upload_icon,
            "/api/config": self._post_config, "/api/proxy": self._post_proxy,
            "/api/save-icon": self._post_save_icon,
            "/api/update": self._post_update,
            "/api/update/rollback": self._post_rollback,
        }
        if path in exact:
            exact[path]()
            return True
        prefixes = (
            ("/api/upload/", lambda: self._handle_delete(self.path)),
            ("/api/icons/delete/", self._post_delete_icon),
            ("/api/config/restore/", self._post_restore),
            ("/api/config/delete-snapshot/", self._post_delete_snapshot),
            ("/api/notes/", self._post_note),
        )
        for prefix, action in prefixes:
            if path.startswith(prefix):
                action()
                return True
        return False

    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path
        if path.startswith("/api/upload/"):
            return self._handle_delete(self.path)
        self._json({"error": "not_found"}, 404)

    def _get_note(self, path):
        try:
            note_id = safe_file_identifier(path.split("/api/notes/", 1)[1])
        except ValueError:
            return self._json({"error": "invalid id"}, 400)
        note_path = NOTES / f"{note_id}.md"
        return self._json({"id": note_id, "content": note_path.read_text() if note_path.exists() else ""})

    def _get_backups(self):
        CONFIG_STORAGE.snapshot_dir.mkdir(exist_ok=True)
        result = [{"name": item.stem.replace("config_", ""), "size": item.stat().st_size,
                   "file": item.name} for item in sorted(
                       CONFIG_STORAGE.snapshot_dir.glob("config_*.json"), reverse=True)]
        self._json(result)

    def _get_config(self):
        path = CONFIG_STORAGE.config_path
        if path.exists():
            try:
                data = json.loads(path.read_text())
            except (OSError, json.JSONDecodeError) as error:
                return self._json({"error": str(error)}, 500)
            data["_version"] = GIT_VERSION
            return self._json(data)
        data = dict(MINIMAL_CONFIG)
        data["_version"] = GIT_VERSION
        return self._json(data)

    def _get_icons(self):
        files = list_images(ICONS_DIR, "/uploads/icons")
        self._json([{key: value for key, value in item.items() if key != "mtime"} for item in files])

    def _get_icon_status(self):
        index_path = ICONS / "selfhst-index.json"
        info = {"exists": False, "svg_count": 0, "index_entries": 0, "svgs_with_flag": 0}
        if index_path.exists():
            info["exists"] = True
            try:
                data = json.loads(index_path.read_text())
                info.update(index_entries=len(data), svgs_with_flag=sum(item.get("SVG") == "Yes" for item in data),
                            svg_count=len(glob.glob(str(ICONS / "*.svg"))))
            except Exception as error:
                info["error"] = str(error)
        self._json(info)

    def _get_update_status(self):
        params = {key: values[0] for key, values in urllib.parse.parse_qs(
            urllib.parse.urlparse(self.path).query).items()}
        refresh = params.get("refresh", "").lower() in ("1", "true", "yes")
        self._json(server_update.status(refresh=refresh))

    def _get_update_log(self):
        if not self._require_update_token():
            return
        params = {key: values[0] for key, values in urllib.parse.parse_qs(
            urllib.parse.urlparse(self.path).query).items()}
        try:
            after = int(params.get("after", "0"))
        except (TypeError, ValueError):
            after = 0
        self._json(server_update.get_update_log(after=after))

    def _require_update_token(self):
        """Return True if the request carries a valid update token."""
        supplied = self.headers.get("X-WarTab-Update-Token")
        if server_update.token_matches(supplied):
            return True
        self._json({"error": "unauthorized"}, 401)
        return False

    def _post_update(self):
        if not self._require_update_token():
            return
        self._json({"status": "started"})
        server_update.apply_async()

    def _post_rollback(self):
        if not self._require_update_token():
            return
        self._json({"status": "started"})
        server_update.rollback_async()

    def _post_upload(self):
        body = self._read_body(MAX_BYTES)
        if body is None:
            return
        result = process_image(
            body,
            self.headers.get("X-Filename", "image.png"), UPLOADS,
            max_bytes=MAX_BYTES, max_width=MAX_W, max_height=MAX_H,
        )
        self._json(result, 400 if "error" in result else 200)

    def _post_upload_icon(self):
        body = self._read_body(2 * 1024 * 1024)
        if body is None:
            return
        result = process_icon(body, ICONS_DIR)
        self._json(result, 400 if "error" in result else 200)

    def _post_delete_icon(self):
        try:
            name = safe_file_identifier(self.path.split("/api/icons/delete/", 1)[1], allow_extension=True)
        except ValueError:
            return self._json({"error": "invalid file"}, 400)
        path = ICONS_DIR / name
        if path.exists() and path.is_file():
            path.unlink()
            return self._json({"status": "deleted", "file": name})
        self._json({"error": "not found"}, 404)

    def _post_config(self):
        body = self._read_body(5 * 1024 * 1024)
        if body is None:
            return
        try:
            data = json.loads(body if body else b"{}")
            valid, message = validate_config(data)
            if not valid:
                return self._json({"error": "invalid config: " + message}, 400)
            CONFIG_STORAGE.save(data)
            self._json({"status": "saved"})
        except Exception as error:
            self._json({"error": str(error)}, 400)

    def _post_restore(self):
        try:
            name = safe_file_identifier(self.path.split("/api/config/restore/", 1)[1])
        except ValueError:
            return self._json({"error": "invalid snapshot"}, 400)
        if not (CONFIG_STORAGE.snapshot_dir / f"config_{name}.json").exists():
            return self._json({"error": "snapshot not found"}, 404)
        try:
            CONFIG_STORAGE.restore(name, validate_config)
        except ValueError as error:
            return self._json({"error": "invalid config: " + str(error)}, 400)
        except (OSError, json.JSONDecodeError) as error:
            return self._json({"error": str(error)}, 400)
        self._json({"status": "restored", "snapshot": name})

    def _post_delete_snapshot(self):
        try:
            name = safe_file_identifier(self.path.split("/api/config/delete-snapshot/", 1)[1])
        except ValueError:
            return self._json({"error": "invalid snapshot"}, 400)
        path = CONFIG_STORAGE.snapshot_dir / f"config_{name}.json"
        if not path.exists():
            return self._json({"error": "snapshot not found"}, 404)
        path.unlink()
        self._json({"status": "deleted", "snapshot": name})

    def _post_note(self):
        try:
            note_id = safe_file_identifier(urllib.parse.urlparse(self.path).path.split("/api/notes/", 1)[1])
        except ValueError:
            return self._json({"error": "invalid id"}, 400)
        body = self._read_body(1024 * 1024)
        if body is None:
            return
        (NOTES / f"{note_id}.md").write_text(body.decode() if body else "")
        self._json({"status": "saved", "id": note_id})

    def _post_proxy(self):
        body = self._read_body(1024 * 1024)
        if body is None:
            return
        try:
            data = json.loads(body if body else b"{}")
        except json.JSONDecodeError:
            return self._json({"error": "invalid json"}, 400)
        self._network_response(handle_proxy(data))

    def _post_save_icon(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = (params.get("name") or [""])[0]
        if not name:
            return self._json({"error": "missing name"}, 400)
        try:
            safe_name = safe_file_identifier(name.lower())
        except ValueError:
            return self._json({"error": "invalid name"}, 400)
        body = self._read_body(512 * 1024)
        if body is None:
            return
        (ICONS / f"{safe_name}.svg").write_bytes(body)
        self._json({"status": "saved", "file": f"{safe_name}.svg", "path": f"/icons/{safe_name}.svg"})

    def _handle_delete(self, request_path):
        parts = urllib.parse.urlparse(request_path).path.strip("/").split("/", 2)
        if len(parts) < 3:
            return self._json({"error": "bad path"}, 400)
        try:
            filename = safe_file_identifier(parts[2], allow_extension=True)
        except ValueError:
            return self._json({"error": "bad path"}, 400)
        path = UPLOADS / filename
        if not path.exists() or not path.is_file():
            return self._json({"error": "not_found"}, 404)
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            return self._json({"error": "not allowed"}, 403)
        path.unlink()
        thumbnail = UPLOADS / f"thumb_{filename}"
        if thumbnail.exists():
            thumbnail.unlink()
        self._json({"status": "deleted", "file": filename})

    def _serve_static_or_spa(self):
        translated = Path(self.translate_path(self.path))
        if not translated.is_file() or self.path == "/":
            self.path = "/index.html"
            index = HERE / "index.html"
            if index.exists():
                html = index.read_text()
                if GIT_VERSION:
                    html = html.replace("?v=BUILD", "?v=" + GIT_VERSION)
                encoded = html.encode()
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "text/html")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
                return
        super().do_GET()

    def _network_response(self, response):
        payload, status = response
        self._json(payload, status)

    def _read_body(self, max_bytes):
        try:
            length = int(self.headers.get("Content-Length", 0))
        except (TypeError, ValueError):
            self._json({"error": "invalid content length"}, 400)
            return None
        if length < 0:
            self._json({"error": "invalid content length"}, 400)
            return None
        if length > max_bytes:
            self._json({"error": "too large"}, 413)
            return None
        return self.rfile.read(length) if length else b""

    def _cors(self):
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; "
            "connect-src 'self' http: https:; frame-src *;")
        super().end_headers()

    def _json(self, data, status=200):
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, fmt, *args):
        prefix = {"200": "OK", "304": "--", "404": "NF", "413": "TL", "500": "ER"}.get(args[0], "?")
        print(f"  {prefix} {args[0]} {self.path}")


if __name__ == "__main__":
    run(WarTabHandler, ICONS)

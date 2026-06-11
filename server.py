#!/usr/bin/env python3
"""
WarTab Server — new tab page + /api/stats + image upload/management.
"""

import argparse
import http.server
import io
import json
import os
import re
import socket
import subprocess
import sys
import time
import uuid
import webbrowser
from pathlib import Path

HERE = Path(__file__).parent.resolve()
UPLOADS = HERE / "uploads"
UPLOADS.mkdir(exist_ok=True)

MIME_TYPES = {
    ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
    ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
    ".ico": "image/x-icon", ".webp": "image/webp",
}
CORS_HEADERS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Filename"}

# ── Image handling ──
try:
    from PIL import Image, ImageOps
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False

MAX_W, MAX_H = 1920, 1080
MAX_BYTES = 5 * 1024 * 1024  # 5MB

def process_image(raw_bytes: bytes, filename: str) -> dict:
    """Resize/compress image, save to uploads/. Returns {url, path, size, name}."""
    if not raw_bytes:
        return {"error": "Empty file"}
    if len(raw_bytes) > MAX_BYTES:
        return {"error": f"File too large ({len(raw_bytes)//1024}KB, max {MAX_BYTES//1024}KB)"}

    ext = Path(filename).suffix.lower()
    # Determine output format
    fmt = "JPEG"
    fmt_ext = ".jpg"
    if ext in (".png",):
        fmt = "PNG"
        fmt_ext = ".png"
    elif ext in (".webp",):
        fmt = "WEBP"
        fmt_ext = ".webp"
    elif ext in (".gif",):
        fmt = "GIF"
        fmt_ext = ".gif"

    out_name = f"{uuid.uuid4().hex}{fmt_ext}"
    out_path = UPLOADS / out_name

    if HAVE_PIL:
        try:
            img = Image.open(io.BytesIO(raw_bytes))
            # Convert RGBA/P to RGB for JPEG
            if fmt == "JPEG" and img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")

            # Resize if needed
            orig_w, orig_h = img.size
            if orig_w > MAX_W or orig_h > MAX_H:
                img.thumbnail((MAX_W, MAX_H), Image.LANCZOS)

            # Strip EXIF orientation
            try:
                img = ImageOps.exif_transpose(img) or img
            except Exception:
                pass

            save_kwargs = {"format": fmt}
            if fmt == "JPEG":
                save_kwargs["quality"] = 85
                save_kwargs["optimize"] = True
            elif fmt == "PNG":
                save_kwargs["optimize"] = True
            elif fmt == "WEBP":
                save_kwargs["quality"] = 85

            img.save(out_path, **save_kwargs)
            final_size = out_path.stat().st_size

            return {
                "url": f"/uploads/{out_name}",
                "path": str(out_path),
                "size": final_size,
                "name": filename,
                "width": img.width,
                "height": img.height,
            }
        except Exception as e:
            return {"error": str(e)}
    else:
        # No Pillow — save raw file
        with open(out_path, "wb") as f:
            f.write(raw_bytes)
        return {
            "url": f"/uploads/{out_name}",
            "path": str(out_path),
            "size": len(raw_bytes),
            "name": filename,
        }


# ── System Stats ──
_last_cpu = None
def get_cpu_percent():
    global _last_cpu
    try:
        with open("/proc/stat") as f:
            line = f.readline()
        parts = line.strip().split()
        vals = [int(v) for v in parts[1:]]
        total, idle = sum(vals), vals[3]
        now = time.monotonic()
        if _last_cpu:
            lt, li, lts = _last_cpu
            dt = now - lts
            if dt > 0:
                used = ((total - lt) - (idle - li)) / (total - lt) * 100 if (total - lt) > 0 else 0
                _last_cpu = (total, idle, now)
                return round(used, 1)
        _last_cpu = (total, idle, now)
        return 0.0
    except Exception:
        return -1

def get_memory():
    try:
        with open("/proc/meminfo") as f:
            data = f.read()
        total = int(re.search(r"MemTotal:\s+(\d+)", data).group(1)) * 1024
        avail = int(re.search(r"MemAvailable:\s+(\d+)", data).group(1)) * 1024
        used = total - avail
        return {"total": total, "used": used, "available": avail, "percent": round((used / total) * 100, 1) if total else 0}
    except Exception:
        return {"total": 0, "used": 0, "available": 0, "percent": -1}

def get_disks():
    disks = []
    try:
        r = subprocess.run(["df", "-B1", "--exclude-type=tmpfs", "--exclude-type=devtmpfs",
                            "--exclude-type=squashfs", "--exclude-type=overlay"],
                           capture_output=True, text=True, timeout=5)
        for line in r.stdout.strip().split("\n")[1:]:
            p = line.split()
            if len(p) >= 6:
                disks.append({"device": p[0], "mount": p[5], "total": int(p[1]), "used": int(p[2]),
                              "free": int(p[3]), "percent": float(p[4].replace("%", ""))})
    except Exception:
        pass
    return disks

def get_uptime():
    try:
        with open("/proc/uptime") as f:
            s = float(f.read().split()[0])
        d, r = divmod(s, 86400)
        h, m = divmod(r, 3600)
        return {"seconds": round(s, 0), "days": int(d), "hours": int(h), "minutes": int(m // 60),
                "string": f"{int(d)}d {int(h)}h {int(m//60)}m"}
    except Exception:
        return {"seconds": 0, "days": 0, "hours": 0, "minutes": 0, "string": "unknown"}

def get_load():
    try:
        with open("/proc/loadavg") as f:
            p = f.read().strip().split()
        return {"1m": float(p[0]), "5m": float(p[1]), "15m": float(p[2])}
    except Exception:
        return {"1m": -1, "5m": -1, "15m": -1}

def build_stats():
    return {"hostname": socket.gethostname(), "cpu": get_cpu_percent(), "memory": get_memory(),
            "disks": get_disks(), "uptime": get_uptime(), "load": get_load(), "timestamp": time.time()}

def list_uploads():
    files = []
    for f in sorted(UPLOADS.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if f.is_file() and f.suffix.lower() in ('.png','.jpg','.jpeg','.gif','.webp','.svg'):
            files.append({"name": f.name, "url": f"/uploads/{f.name}", "size": f.stat().st_size,
                          "mtime": f.stat().st_mtime})
    return files


# ── HTTP Handler ──
class WarTabHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/stats":
            return self._json(build_stats())
        if self.path == "/api/uploads":
            return self._json(list_uploads())
        path = self.translate_path(self.path)
        if not os.path.isfile(path) or self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/upload":
            cl = int(self.headers.get("Content-Length", 0))
            if cl > MAX_BYTES:
                return self._json({"error": f"File too large ({cl//1024}KB, max {MAX_BYTES//1024}KB)"}, 413)
            raw = self.rfile.read(cl) if cl else b""
            filename = self.headers.get("X-Filename", "image.png")
            result = process_image(raw, filename)
            if "error" in result:
                return self._json(result, 400)
            return self._json(result)
        elif self.path.startswith("/api/upload/"):
            # Actually a DELETE but arriving as POST with _method=DELETE
            return self._handle_delete(self.path)
        return self._json({"error": "not_found"}, 404)

    def do_DELETE(self):
        return self._handle_delete(self.path)

    def _handle_delete(self, path):
        # Path: /api/uploads/filename.ext  or  /api/upload/filename.ext
        parts = path.strip("/").split("/")
        if len(parts) < 3:
            return self._json({"error": "bad path"}, 400)
        filename = parts[-1]
        filepath = UPLOADS / filename
        if not filepath.exists() or not filepath.is_file():
            return self._json({"error": "not_found"}, 404)
        # Only delete image files
        if filepath.suffix.lower() not in ('.png','.jpg','.jpeg','.gif','.webp','.svg'):
            return self._json({"error": "not allowed"}, 403)
        filepath.unlink()
        # Also delete thumbnail
        thumb = UPLOADS / f"thumb_{filename}"
        if thumb.exists():
            thumb.unlink()
        return self._json({"status": "deleted", "file": filename})

    def _cors(self):
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)

    def _json(self, data, status=200):
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, fmt, *args):
        prefix = {"200": "✓", "304": "·", "404": "✗", "413": "⚠", "500": "⚠"}.get(args[0], "?")
        print(f"  {prefix} {args[0]} {self.path}")


def get_local_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1); s.connect(("10.254.254.254", 1))
        ips.append(s.getsockname()[0]); s.close()
    except: pass
    try:
        ips.extend(a for a in socket.gethostbyname_ex(socket.gethostname())[2] if a not in ips)
    except: pass
    return ips or ["127.0.0.1"]

def main():
    ap = argparse.ArgumentParser(description="WarTab Server")
    ap.add_argument("--port", "-p", type=int, default=8080)
    ap.add_argument("--bind", "-b", default="0.0.0.0")
    ap.add_argument("--open", "-o", action="store_true")
    ap.add_argument("--mdns", action="store_true")
    a = ap.parse_args()
    server = http.server.HTTPServer((a.bind, a.port), WarTabHandler)
    server.server_name = "WarTab"
    print(f"\n  ⚔️  WarTab Server\n  ─────────────────────────────────────")
    print(f"  Local:    http://localhost:{a.port}")
    print(f"  Stats:    http://localhost:{a.port}/api/stats")
    print(f"  Uploads:  http://localhost:{a.port}/api/uploads")
    for ip in get_local_ips():
        print(f"  Network:  http://{ip}:{a.port}")
    if a.mdns:
        try:
            subprocess.run(["avahi-publish-service", "WarTab", "_http._tcp", str(a.port)],
                           start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"  mDNS:     http://wartab.local:{a.port}")
        except: pass
    print("  ─────────────────────────────────────\n  Ctrl+C to stop\n")
    if a.open:
        webbrowser.open(f"http://localhost:{a.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopping..."); server.server_close(); sys.exit(0)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
WarTab Server — serve your new tab page on the local network.
Includes /api/stats for local system monitoring (CPU, RAM, disk, uptime).
"""

import argparse
import http.server
import json
import os
import re
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

HERE = Path(__file__).parent.resolve()

MIME_TYPES = {
    ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
    ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
    ".ico": "image/x-icon", ".webp": "image/webp",
}

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

# ── System Stats ──
_last_cpu = None  # (total, idle, timestamp)


def get_cpu_percent():
    """Read CPU usage from /proc/stat."""
    global _last_cpu
    try:
        with open("/proc/stat") as f:
            line = f.readline()
        parts = line.strip().split()
        # user, nice, system, idle, iowait, irq, softirq, steal
        vals = [int(v) for v in parts[1:]]
        total = sum(vals)
        idle = vals[3]  # idle
        now = time.monotonic()

        if _last_cpu:
            last_total, last_idle, last_ts = _last_cpu
            dt = now - last_ts
            if dt > 0:
                dtotal = total - last_total
                didle = idle - last_idle
                used = ((dtotal - didle) / dtotal) * 100.0 if dtotal > 0 else 0.0
                _last_cpu = (total, idle, now)
                return round(used, 1)

        _last_cpu = (total, idle, now)
        return 0.0
    except Exception:
        return -1


def get_memory():
    """Read memory from /proc/meminfo."""
    try:
        with open("/proc/meminfo") as f:
            data = f.read()
        total = int(re.search(r"MemTotal:\s+(\d+)", data).group(1)) * 1024
        available = int(re.search(r"MemAvailable:\s+(\d+)", data).group(1)) * 1024
        used = total - available
        percent = round((used / total) * 100, 1) if total > 0 else 0
        return {"total": total, "used": used, "available": available, "percent": percent}
    except Exception:
        return {"total": 0, "used": 0, "available": 0, "percent": -1}


def get_swap():
    """Read swap from /proc/meminfo."""
    try:
        with open("/proc/meminfo") as f:
            data = f.read()
        total = int(re.search(r"SwapTotal:\s+(\d+)", data).group(1)) * 1024
        free = int(re.search(r"SwapFree:\s+(\d+)", data).group(1)) * 1024
        used = total - free
        percent = round((used / total) * 100, 1) if total > 0 else 0
        return {"total": total, "used": used, "free": free, "percent": percent}
    except Exception:
        return {"total": 0, "used": 0, "free": 0, "percent": 0}


def get_disks():
    """Read disk usage via df."""
    disks = []
    try:
        result = subprocess.run(
            ["df", "-B1", "--exclude-type=tmpfs", "--exclude-type=devtmpfs",
             "--exclude-type=squashfs", "--exclude-type=overlay"],
            capture_output=True, text=True, timeout=5
        )
        lines = result.stdout.strip().split("\n")[1:]
        for line in lines:
            parts = line.split()
            if len(parts) >= 6:
                device, total, used, free, pct, mnt = parts[0], int(parts[1]), int(parts[2]), int(parts[3]), parts[4], parts[5]
                percent = float(pct.replace("%", ""))
                disks.append({
                    "device": device, "mount": mnt,
                    "total": total, "used": used, "free": free,
                    "percent": percent,
                })
    except Exception:
        pass
    return disks


def get_uptime():
    """Read uptime from /proc/uptime."""
    try:
        with open("/proc/uptime") as f:
            uptime_seconds = float(f.read().split()[0])
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        return {"seconds": round(uptime_seconds, 0), "days": days, "hours": hours, "minutes": minutes,
                "string": f"{days}d {hours}h {minutes}m"}
    except Exception:
        return {"seconds": 0, "days": 0, "hours": 0, "minutes": 0, "string": "unknown"}


def get_load():
    """Read load average."""
    try:
        with open("/proc/loadavg") as f:
            parts = f.read().strip().split()
        return {"1m": float(parts[0]), "5m": float(parts[1]), "15m": float(parts[2])}
    except Exception:
        return {"1m": -1, "5m": -1, "15m": -1}


def get_hostname():
    try:
        return socket.gethostname()
    except Exception:
        return "unknown"


def build_stats():
    return {
        "hostname": get_hostname(),
        "cpu": get_cpu_percent(),
        "memory": get_memory(),
        "swap": get_swap(),
        "disks": get_disks(),
        "uptime": get_uptime(),
        "load": get_load(),
        "timestamp": time.time(),
    }


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
            self._json(build_stats())
            return
        path = self.translate_path(self.path)
        if not os.path.isfile(path) or self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/config":
            cl = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(cl) if cl else b"{}"
            try:
                data = json.loads(body)
                cp = HERE / "wartab-config.json"
                with open(cp, "w") as f:
                    json.dump(data, f, indent=2)
                self._json({"status": "ok"})
            except Exception as e:
                self._json({"status": "error", "message": str(e)}, 400)
        else:
            self._json({"status": "not_found"}, 404)

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
        prefix = {"200": "✓", "304": "·", "404": "✗", "500": "⚠"}.get(args[0], "?")
        print(f"  {prefix} {args[0]} {self.path}")


def get_local_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(("10.254.254.254", 1))
        ips.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        hn = socket.gethostname()
        ips.extend(a for a in socket.gethostbyname_ex(hn)[2] if a not in ips)
    except Exception:
        pass
    if not ips:
        ips.append("127.0.0.1")
    return ips


def main():
    parser = argparse.ArgumentParser(description="WarTab Server")
    parser.add_argument("--port", "-p", type=int, default=8080, help="Port (default: 8080)")
    parser.add_argument("--bind", "-b", default="0.0.0.0", help="Bind address (default: 0.0.0.0)")
    parser.add_argument("--open", "-o", action="store_true", help="Open in browser")
    parser.add_argument("--mdns", action="store_true", help="Register via mDNS")
    args = parser.parse_args()

    server = http.server.HTTPServer((args.bind, args.port), WarTabHandler)
    server.server_name = "WarTab"
    server.server_version = "WarTab/1.0"

    print()
    print("  ⚔️  WarTab Server")
    print("  ─────────────────────────────────────")
    print(f"  Local:    http://localhost:{args.port}")
    print(f"  Stats:    http://localhost:{args.port}/api/stats")
    for ip in get_local_ips():
        print(f"  Network:  http://{ip}:{args.port}")
    if args.mdns:
        try:
            subprocess.run(["avahi-publish-service", "WarTab", "_http._tcp", str(args.port)],
                           start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"  mDNS:     http://wartab.local:{args.port}")
        except FileNotFoundError:
            print("  mDNS:     avahi-utils not installed")
    print("  ─────────────────────────────────────")
    print("  Ctrl+C to stop")
    print()

    if args.open:
        webbrowser.open(f"http://localhost:{args.port}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopping WarTab...")
        server.server_close()
        sys.exit(0)


if __name__ == "__main__":
    main()

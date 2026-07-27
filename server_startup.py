"""Command-line startup for the WarTab HTTP server."""

import argparse
import glob
import http.server
import json
import logging
import socket
import subprocess
import webbrowser

from server_network import get_local_ips

log = logging.getLogger("wartab")


def detect_git_version(directory):
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], capture_output=True,
            text=True, timeout=2, cwd=directory,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception as error:
        log.debug("git version detection failed: %s", error)
        return ""


def run(handler, icons_dir):
    parser = argparse.ArgumentParser(description="WarTab Server")
    parser.add_argument("--port", "-p", type=int, default=8081)
    parser.add_argument("--bind", "-b", default="0.0.0.0")
    parser.add_argument("--open", "-o", action="store_true")
    parser.add_argument("--mdns", action="store_true")
    args = parser.parse_args()
    http.server.HTTPServer.allow_reuse_address = True
    server = http.server.ThreadingHTTPServer((args.bind, args.port), handler)
    server.server_name = "WarTab"
    hostname = socket.gethostname()
    print("\n  WarTab Server\n  ----")
    print(f"  Local:    http://localhost:{args.port}")
    for address in get_local_ips():
        print(f"  Network:  http://{address}:{args.port}")
    index_path = icons_dir / "selfhst-index.json"
    if index_path.exists():
        try:
            index_data = json.loads(index_path.read_text())
            print(f"  Icons:    {len(glob.glob(str(icons_dir / '*.svg')))} SVGs, {len(index_data)} index entries")
        except Exception as error:
            print(f"  Icons:    index read failed ({error})")
    else:
        print("  Icons:    selfhst-index.json not found")
    mdns_process = None
    if args.mdns:
        try:
            mdns_process = subprocess.Popen(
                ["avahi-publish-service", "WarTab", "_http._tcp", str(args.port), "path=/"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            log.info("mDNS published — http://%s.local:%s", hostname, args.port)
        except FileNotFoundError:
            log.warning("--mdns: avahi-publish-service not found. Install: sudo apt install avahi-utils")
        except Exception as error:
            log.warning("--mdns: failed to publish: %s", error)
    print("  ----\n  Ctrl+C to stop\n")
    if args.open:
        webbrowser.open(f"http://localhost:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopping...")
    finally:
        if mdns_process:
            mdns_process.terminate()
            mdns_process.wait(timeout=3)
        server.server_close()

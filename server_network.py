"""Network diagnostics and proxy helpers for the WarTab server.

This module deliberately has no dependency on the HTTP request handler.  Each
operation accepts plain values and returns the existing ``(payload, status)``
contract used by the handler.
"""

import csv
import io
import json
import logging
import os
import re
import socket
import ssl
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime
from threading import Lock

log = logging.getLogger("wartab")

PROXY_TIMEOUT = 15
PROXY_MAX_RESPONSE = 5 * 1024 * 1024

_OUI = {
    "38:F7:CD": "Ubiquiti", "F0:2F:74": "Ubiquiti", "02:8B:32": "Local",
    "56:D1:D1": "Local", "BC:24:11": "Raspberry Pi", "B0:DC:EF": "Apple",
    "8C:55:4A": "Intel", "8C:86:DD": "Apple", "00:00:0C": "Cisco",
    "00:00:5E": "IANA", "00:50:56": "VMware", "08:00:27": "Oracle/VB",
    "B8:27:EB": "Raspberry Pi", "00:50:F2": "Microsoft",
    "00:53:00": "Microsoft", "00:60:08": "HP", "0C:47:C9": "TP-Link",
    "14:58:D0": "TP-Link", "1C:5C:F2": "TP-Link", "1C:B7:2C": "Netgear",
    "20:47:47": "Synology", "24:4B:FE": "Samsung", "24:65:11": "Google",
    "30:3A:64": "Apple", "30:85:A9": "Google", "34:02:86": "Netgear",
    "38:59:F9": "Apple", "3C:52:82": "ASUS", "40:B0:76": "Netgear",
    "44:23:5C": "TP-Link", "44:38:39": "Cisco", "44:6D:57": "ASUS",
    "48:4D:7E": "Samsung", "48:71:96": "Synology", "48:B0:2D": "TP-Link",
    "48:D7:05": "Google", "64:A2:F9": "Synology", "64:BC:0C": "ASUS",
    "6C:1F:F2": "ASUS", "6C:88:14": "TP-Link", "70:5A:B6": "Apple",
    "74:75:4A": "Google", "78:31:C1": "Apple", "7C:2A:31": "ASUS",
    "80:3F:5D": "Google", "84:3A:4B": "TP-Link", "84:A6:38": "Synology",
    "84:B2:61": "ASUS", "88:4A:EA": "TP-Link", "88:A2:5E": "Google",
    "8C:2D:AA": "Apple", "8C:3C:07": "TP-Link", "90:09:3F": "ASUS",
    "90:0C:27": "TP-Link", "90:78:41": "Synology", "90:E6:BA": "TP-Link",
    "98:B8:E3": "TP-Link", "A0:20:66": "Apple", "A8:86:DD": "Apple",
    "B0:E1:7E": "TP-Link", "B4:B6:86": "Apple", "B8:76:3F": "Apple",
    "BC:5F:F4": "TP-Link", "C0:25:A5": "Google", "C0:BD:D1": "Apple",
    "C0:FE:75": "ASUS", "C4:85:E8": "Synology", "D0:23:DB": "Apple",
    "D0:BF:9C": "Synology", "D4:9A:20": "Apple", "DC:7B:94": "ASUS",
    "E0:DC:FF": "Apple", "E4:B9:7A": "Synology", "EC:08:6B": "Apple",
    "EC:8C:A2": "Apple", "EC:F4:BB": "ASUS", "F4:6D:04": "ASUS",
    "F4:96:34": "TP-Link", "F4:B7:E2": "Google", "F4:D4:88": "TP-Link",
    "FC:01:CD": "Netgear",
}
_arp_cache = None
_arp_cache_ts = 0
_arp_lock = Lock()


def validate_ping_params(params):
    host = params.get("host", "")
    if not host:
        raise ValueError("missing host")
    try:
        count = min(int(params.get("count", 3)), 10)
    except (TypeError, ValueError) as error:
        raise ValueError("invalid count") from error
    return host, count


def validate_cert_params(params):
    host = params.get("host", "")
    if not host:
        raise ValueError("missing host")
    try:
        port = int(params.get("port", 443))
    except (TypeError, ValueError) as error:
        raise ValueError("invalid port") from error
    if not 1 <= port <= 65535:
        raise ValueError("invalid port")
    return host, port


def validate_proxy_request(body):
    url = body.get("url", "").strip()
    if not url:
        raise ValueError("missing url")
    if not url.startswith(("http://", "https://")):
        raise ValueError("invalid protocol")
    try:
        timeout = min(body.get("timeout", PROXY_TIMEOUT), PROXY_TIMEOUT)
    except TypeError as error:
        raise ValueError("invalid timeout") from error
    return {
        "url": url,
        "method": body.get("method", "GET").upper(),
        "headers": body.get("headers", {}) or {},
        "body": body.get("body"),
        "timeout": timeout,
    }


def handle_proxy(body):
    try:
        options = validate_proxy_request(body)
    except ValueError as error:
        return {"error": str(error)}, 400
    try:
        request = urllib.request.Request(options["url"], method=options["method"])
        for key, value in options["headers"].items():
            request.add_header(key, str(value))
        request_body = options["body"]
        if request_body is not None:
            if isinstance(request_body, (dict, list)):
                request_body = json.dumps(request_body).encode()
                if "Content-Type" not in options["headers"]:
                    request.add_header("Content-Type", "application/json")
            elif isinstance(request_body, str):
                request_body = request_body.encode()
            request.data = request_body
        context = ssl.create_default_context()
        # Preserve support for self-signed services on trusted LANs.
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(
            request, timeout=options["timeout"], context=context
        ) as response:
            raw = response.read(PROXY_MAX_RESPONSE)
            content_type = response.headers.get("Content-Type", "")
            response_body = raw.decode("utf-8", "replace")
            if "json" in content_type:
                response_body = json.loads(response_body)
            return {
                "status": response.status,
                "headers": dict(response.headers),
                "body": response_body,
                "content_type": content_type,
            }, 200
    except urllib.error.HTTPError as error:
        raw = error.read(PROXY_MAX_RESPONSE)
        return {"status": error.code, "error": str(error),
                "body": raw.decode("utf-8", "replace")}, 502
    except urllib.error.URLError as error:
        return {"error": f"connection failed: {error.reason}"}, 502
    except Exception as error:
        return {"error": str(error)}, 502


def handle_cert_check(params):
    try:
        host, port = validate_cert_params(params)
    except ValueError as error:
        return {"error": str(error)}, 400
    context = ssl.create_default_context()
    context.check_hostname = True
    context.verify_mode = ssl.CERT_REQUIRED
    try:
        with socket.create_connection((host, port), timeout=8) as sock:
            with context.wrap_socket(sock, server_hostname=host) as secure_socket:
                cert = secure_socket.getpeercert()
                expiry = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
                days_left = (expiry - datetime.now()).days
                issuer = dict(item[0] for item in cert.get("issuer", []))
                subject = dict(item[0] for item in cert.get("subject", []))
                return {"host": host, "port": port, "expires": cert["notAfter"],
                        "days_left": days_left, "issuer": issuer,
                        "subject": subject.get("CN", ""),
                        "valid": days_left > 0}, 200
    except Exception as error:
        return {"host": host, "port": port, "error": str(error),
                "days_left": -1, "valid": False}, 200


def handle_ping(params):
    try:
        host, count = validate_ping_params(params)
    except ValueError as error:
        return {"error": str(error)}, 400
    try:
        output = subprocess.run(
            ["ping", "-c", str(count), "-W", "3", host],
            capture_output=True, text=True, timeout=15,
        )
        if output.returncode != 0:
            return {"host": host, "alive": False,
                    "error": output.stderr.strip() or "no reply"}, 200
        match = re.search(
            r"min/avg/max/(?:stddev|mdev) = ([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)",
            output.stdout,
        )
        if match:
            return {"host": host, "alive": True, "min_ms": float(match.group(1)),
                    "avg_ms": float(match.group(2)), "max_ms": float(match.group(3)),
                    "mdev_ms": float(match.group(4)), "packets": count}, 200
        times = [float(value) for value in re.findall(
            r"time[<=](\d+(?:\.\d+)?)\s*ms", output.stdout
        )]
        if times:
            return {"host": host, "alive": True, "min_ms": min(times),
                    "avg_ms": sum(times) / len(times), "max_ms": max(times),
                    "packets": len(times)}, 200
        return {"host": host, "alive": True, "packets": count}, 200
    except subprocess.TimeoutExpired:
        return {"host": host, "alive": False, "error": "timeout"}, 200
    except Exception as error:
        return {"host": host, "alive": False, "error": str(error)}, 200


def handle_docker():
    if not os.path.exists("/var/run/docker.sock"):
        return {"error": "Docker socket not found", "containers": []}, 200
    try:
        request = urllib.request.Request("http://localhost/containers/json?all=true")
        with urllib.request.urlopen(request, timeout=5) as response:
            data = json.loads(response.read())
        containers = []
        for item in data:
            name = (item.get("Names", [""])[0].lstrip("/") if item.get("Names")
                    else item.get("Id", "")[:12])
            containers.append({
                "id": item.get("Id", "")[:12], "name": name,
                "image": item.get("Image", ""), "state": item.get("State", "unknown"),
                "status": item.get("Status", ""), "ports": item.get("Ports", []),
                "created": item.get("Created", 0),
            })
        running = sum(item["state"] == "running" for item in containers)
        return {"containers": containers, "total": len(containers), "running": running,
                "stopped": len(containers) - running}, 200
    except Exception as error:
        return {"error": str(error), "containers": []}, 200


def scan_arp():
    global _arp_cache, _arp_cache_ts
    if _arp_cache and time.time() - _arp_cache_ts < 30:
        return _arp_cache
    with _arp_lock:
        if _arp_cache and time.time() - _arp_cache_ts < 30:
            return _arp_cache
        _refresh_arp_cache()
        devices = _read_arp_devices()
        _arp_cache = {"devices": devices, "timestamp": time.time(), "count": len(devices)}
        _arp_cache_ts = time.time()
        return _arp_cache


def _refresh_arp_cache():
    try:
        seen = set()
        with open("/proc/net/arp", encoding="utf-8") as arp_file:
            for line in arp_file:
                fields = line.strip().split()
                if fields and fields[0].count(".") == 3:
                    seen.add(fields[0])
        subnets = []
        for address in [*get_local_ips(), *sorted(seen)]:
            fields = address.split(".")
            if len(fields) != 4 or fields[0] == "127":
                continue
            subnet = ".".join(fields[:3]) + "."
            if subnet not in subnets:
                subnets.append(subnet)

        targets = []
        for subnet in subnets:
            for suffix in (1, 50, 100, 150, 200, 250, 254):
                address = subnet + str(suffix)
                if address not in seen and address not in targets:
                    targets.append(address)
                if len(targets) >= 8:
                    break
            if len(targets) >= 8:
                break
        for address in targets:
            try:
                subprocess.run(["ping", "-c1", "-W1", address],
                               capture_output=True, timeout=2)
            except Exception as error:
                log.debug("arp ping %s failed: %s", address, error)
    except Exception as error:
        log.debug("arp ping batch failed: %s", error)


def _read_arp_devices():
    devices = []
    try:
        with open("/proc/net/arp", encoding="utf-8") as arp_file:
            reader = csv.reader(io.StringIO(arp_file.read()), delimiter=" ", skipinitialspace=True)
        next(reader, None)
        for row in reader:
            row = [column for column in row if column]
            if len(row) < 4:
                continue
            ip, mac = row[0], row[3]
            if not mac or mac == "(incomplete)" or ":" not in mac:
                continue
            try:
                resolved = socket.gethostbyaddr(ip)
                hostname = resolved[0] if resolved and resolved[0] else ""
            except Exception as error:
                log.debug("hostname lookup failed: %s", error)
                hostname = ""
            devices.append({"ip": ip, "mac": mac,
                            "vendor": _OUI.get(":".join(mac.split(":")[:3]).upper(), "Unknown"),
                            "hostname": hostname, "iface": row[5] if len(row) > 5 else ""})
    except Exception as error:
        log.debug("arp result reading failed: %s", error)
    return devices


def get_local_ips():
    ips = []
    try:
        udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        udp_socket.settimeout(0.1)
        # TEST-NET-1 is non-routable and used only to ask the OS which source
        # address it would select; connect() on a UDP socket sends no packet.
        udp_socket.connect(("192.0.2.1", 1))
        ips.append(udp_socket.getsockname()[0])
        udp_socket.close()
    except Exception as error:
        log.debug("get_local_ips failed: %s", error)
    try:
        ips.extend(address for address in socket.gethostbyname_ex(socket.gethostname())[2]
                   if address not in ips)
    except Exception as error:
        log.debug("get_local_ips failed: %s", error)
    return ips or ["127.0.0.1"]

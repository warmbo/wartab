#!/usr/bin/env python3
"""WarTab — System Stats Collection
Collects CPU, memory, disk, uptime, GPU, network, and process stats
from /proc filesystem and system commands. Used by server.py /api/stats.
Zero pip dependencies — pure Python stdlib only."""

import json as _json, logging, re, subprocess, socket, time

log = logging.getLogger("wartab.stats")

_last_cpu = None

def get_cpu_percent():
    global _last_cpu
    try:
        with open("/proc/stat") as f: line = f.readline()
        parts = line.strip().split(); vals = [int(v) for v in parts[1:]]; total, idle = sum(vals), vals[3]; now = time.monotonic()
        if _last_cpu:
            lt, li, lts = _last_cpu; dt = now - lts
            if dt > 0: used = ((total-lt)-(idle-li))/(total-lt)*100 if (total-lt) > 0 else 0; _last_cpu = (total, idle, now); return round(used, 1)
        _last_cpu = (total, idle, now); return 0.0
    except Exception as e: log.warning("get_cpu_percent failed: %s", e); return -1

def get_memory():
    try:
        with open("/proc/meminfo") as f: data = f.read()
        total = int(re.search(r"MemTotal:\s+(\d+)", data).group(1)) * 1024
        avail = int(re.search(r"MemAvailable:\s+(\d+)", data).group(1)) * 1024
        active = int(re.search(r"Active:\s+(\d+)", data).group(1)) * 1024
        used = total - avail
        return {"total": total, "used": used, "available": avail, "active": active, "percent": round(active/total*100, 1) if total else 0}
    except Exception as e: log.warning("get_memory failed: %s", e); return {"total": 0, "used": 0, "available": 0, "active": 0, "percent": -1}

def get_disks():
    disks = []
    try:
        r = subprocess.run(["df", "-B1", "--exclude-type=tmpfs", "--exclude-type=devtmpfs", "--exclude-type=squashfs", "--exclude-type=overlay"], capture_output=True, text=True, timeout=5)
        for line in r.stdout.strip().split("\n")[1:]:
            p = line.split()
            if len(p) >= 6: disks.append({"device": p[0], "mount": p[5], "total": int(p[1]), "used": int(p[2]), "free": int(p[3]), "percent": float(p[4].replace("%", ""))})
    except Exception as e: log.warning("get_disks failed: %s", e)
    return disks

def get_uptime():
    try:
        with open("/proc/uptime") as f: s = float(f.read().split()[0])
        d, r = divmod(s, 86400); h, m = divmod(r, 3600)
        return {"seconds": round(s, 0), "days": int(d), "hours": int(h), "minutes": int(m//60), "string": f"{int(d)}d {int(h)}h {int(m//60)}m"}
    except Exception as e: log.warning("get_uptime failed: %s", e); return {"seconds": 0, "days": 0, "hours": 0, "minutes": 0, "string": "unknown"}

def get_disk_io():
    try:
        with open("/proc/diskstats") as f:
            for line in f:
                p = line.strip().split()
                if len(p) >= 14 and p[2] == 'nvme0n1' and not p[2].endswith(('p1', 'p2', 'p3')):
                    return {"device": p[2], "readsectors": int(p[5]), "writesectors": int(p[9])}
        return {"device": "", "readsectors": 0, "writesectors": 0}
    except Exception as e: log.warning("get_disk_io failed: %s", e); return {"device": "", "readsectors": 0, "writesectors": 0}

def get_load():
    try:
        with open("/proc/loadavg") as f: p = f.read().strip().split()
        return {"1m": float(p[0]), "5m": float(p[1]), "15m": float(p[2])}
    except Exception as e: log.warning("get_load failed: %s", e); return {"1m": -1, "5m": -1, "15m": -1}

def get_network():
    try:
        with open("/proc/net/dev") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 10 and parts[0].endswith(':') and parts[0] != 'lo:':
                    rx = int(parts[1]); tx = int(parts[9])
                    return {"rx_bytes": rx, "tx_bytes": tx, "interface": parts[0].rstrip(':')}
        return {"rx_bytes": 0, "tx_bytes": 0, "interface": "unknown"}
    except Exception as e: log.warning("get_network failed: %s", e); return {"rx_bytes": 0, "tx_bytes": 0, "interface": "unknown"}

def get_gpu():
    result = {"percent": 0, "vram_total": 0, "vram_used": 0, "temp_c": 0}
    try:
        out = subprocess.run(["rocm-smi", "--showuse", "--showtemp", "--showpower", "--showmeminfo", "vram", "--json"],
                             capture_output=True, text=True, timeout=5)
        if out.returncode == 0:
            data = _json.loads(out.stdout)
            card = data.get("card0", {})
            pct_str = card.get("GPU use (%)", "0").replace("%", "").strip()
            result["percent"] = float(pct_str) if pct_str else 0
            result["vram_total"] = int(card.get("VRAM Total Memory (B)", "0"))
            result["vram_used"] = int(card.get("VRAM Total Used Memory (B)", "0"))
            temp_str = card.get("Temperature (Sensor edge) (C)", "0")
            result["temp_c"] = float(temp_str) if temp_str else 0
    except Exception as e:
        log.warning("get_gpu (rocm-smi) failed: %s", e)
        try:
            with open("/sys/class/drm/card0/device/gpu_busy_percent") as f:
                result["percent"] = int(f.read().strip())
        except Exception as e2: log.debug("gpu_busy_percent fallback failed: %s", e2)
        try:
            with open("/sys/class/drm/card0/device/mem_info_vram_total") as f:
                result["vram_total"] = int(f.read().strip())
        except Exception as e2: log.debug("mem_info_vram_total fallback failed: %s", e2)
    return result

def get_cpu_temp():
    try:
        out = subprocess.run(["sensors", "-u"], capture_output=True, text=True, timeout=3)
        if out.returncode == 0:
            temps = re.findall(r"temp(\d+)_input:\s+([\d.]+)", out.stdout)
            if temps:
                vals = [float(v) for _, v in temps]
                return {"celsius": round(sum(vals)/len(vals), 1), "max": round(max(vals), 1)}
        return {"celsius": 0, "max": 0}
    except Exception as e: log.warning("get_cpu_temp failed: %s", e); return {"celsius": 0, "max": 0}

def get_process_count():
    try:
        with open("/proc/loadavg") as f:
            return int(f.read().strip().split("/")[1].split()[0])
    except Exception as e: log.warning("get_process_count failed: %s", e); return 0

def build_stats():
    return {"hostname": socket.gethostname(), "cpu": get_cpu_percent(), "memory": get_memory(), "disks": get_disks(),
            "uptime": get_uptime(), "load": get_load(), "network": get_network(), "gpu": get_gpu(),
            "cpu_temp": get_cpu_temp(), "processes": get_process_count(), "disk_io": get_disk_io(), "timestamp": time.time()}

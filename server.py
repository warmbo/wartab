#!/usr/bin/env python3
"""WarTab Server — new tab page + /api/stats + image upload + icon save."""
import argparse, glob, http.server, io, json, logging, os, re, socket, subprocess, sys, time, uuid, webbrowser, urllib.request, urllib.error, urllib.parse, ssl
from pathlib import Path
from threading import Lock

log = logging.getLogger("wartab")
log.setLevel(logging.DEBUG)
if not log.handlers:
    sh = logging.StreamHandler()
    sh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    log.addHandler(sh)
HERE = Path(__file__).parent.resolve()
UPLOADS = HERE / "uploads"
ICONS = HERE / "icons"
STATIC = HERE / "static"
UPLOADS.mkdir(exist_ok=True)
ICONS_DIR = HERE / "uploads" / "icons"
ICONS_DIR.mkdir(parents=True, exist_ok=True)
ICONS.mkdir(exist_ok=True)
NOTES = HERE / "notes"
NOTES.mkdir(exist_ok=True)
(STATIC / "fonts").mkdir(parents=True, exist_ok=True)
MIME_TYPES = {".html":"text/html",".css":"text/css",".js":"application/javascript",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",".svg":"image/svg+xml",".ico":"image/x-icon",".webp":"image/webp"}
CORS_HEADERS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,DELETE,OPTIONS","Access-Control-Allow-Headers":"Content-Type,X-Filename"}
try: from PIL import Image, ImageOps; HAVE_PIL=True
except ImportError: HAVE_PIL=False
MAX_W,MAX_H,MAX_BYTES=99999,99999,20*1024*1024

def validate_config(data):
    """Basic schema validation before writing config.json."""
    if not isinstance(data, dict):
        return False, "config must be a JSON object"
    has_pages = "pages" in data and isinstance(data["pages"], (dict, list)) and len(data["pages"]) > 0
    has_cards = "cards" in data and isinstance(data["cards"], list)
    if not has_pages and not has_cards:
        return False, "missing 'pages' or 'cards' array"
    if "theme" not in data or not isinstance(data["theme"], dict):
        return False, "missing 'theme' object"
    theme = data["theme"]
    if "bgType" not in theme or "bgValue" not in theme or "glow" not in theme:
        return False, "theme missing required fields (bgType, bgValue, glow)"
    if "layout" not in data or not isinstance(data["layout"], dict):
        return False, "missing 'layout' object"
    layout = data["layout"]
    if "cols" not in layout or not isinstance(layout.get("cols"), (int, float)):
        return False, "layout missing valid 'cols'"
    return True, "ok"

def process_image(raw_bytes,filename):
    if not raw_bytes: return {"error":"Empty file"}
    if len(raw_bytes)>MAX_BYTES: return {"error":f"File too large ({len(raw_bytes)//1024}KB, max {MAX_BYTES//1024}KB)"}
    ext=Path(filename).suffix.lower(); fmt="JPEG"; fmt_ext=".jpg"
    if ext in(".png",): fmt="PNG"; fmt_ext=".png"
    elif ext in(".webp",): fmt="WEBP"; fmt_ext=".webp"
    elif ext in(".gif",): fmt="GIF"; fmt_ext=".gif"
    out_name=f"{uuid.uuid4().hex}{fmt_ext}"; out_path=UPLOADS/out_name
    if HAVE_PIL:
        try:
            img=Image.open(io.BytesIO(raw_bytes))
            if fmt=="JPEG" and img.mode in("RGBA","P","LA"): img=img.convert("RGB")
            ow,oh=img.size
            if ow>MAX_W or oh>MAX_H: img.thumbnail((MAX_W,MAX_H),Image.LANCZOS)
            try: img=ImageOps.exif_transpose(img) or img
            except Exception as e: log.debug("exif_transpose failed: %s", e)
            kw={"format":fmt}
            if fmt=="JPEG": kw["quality"]=80; kw["optimize"]=True
            elif fmt=="PNG": kw["optimize"]=True
            elif fmt=="WEBP": kw["quality"]=85
            img.save(out_path,**kw)
            return {"url":f"/uploads/{out_name}","path":str(out_path),"size":out_path.stat().st_size,"name":filename,"width":img.width,"height":img.height}
        except Exception as e: return {"error":str(e)}
    else:
        with open(out_path,"wb") as f: f.write(raw_bytes)
        return {"url":f"/uploads/{out_name}","path":str(out_path),"size":len(raw_bytes),"name":filename}
def process_icon(raw_bytes,filename):
    """Resize to 48x48 and save to uploads/icons/."""
    if not raw_bytes: return {"error":"Empty file"}
    if len(raw_bytes)>2*1024*1024: return {"error":"File too large"}
    from PIL import Image, ImageOps
    try:
        img=Image.open(io.BytesIO(raw_bytes))
        if img.mode in("RGBA","P","LA"): img=img.convert("RGBA")
        else: img=img.convert("RGB")
        img.thumbnail((48,48),Image.LANCZOS)
        out_name=f"{uuid.uuid4().hex}.png"
        out_path=ICONS_DIR/out_name
        img.save(out_path,format="PNG",optimize=True)
        return {"url":f"/uploads/icons/{out_name}","size":out_path.stat().st_size}
    except Exception as e: return {"error":str(e)}
_last_cpu=None
def get_cpu_percent():
    global _last_cpu
    try:
        with open("/proc/stat") as f: line=f.readline()
        parts=line.strip().split(); vals=[int(v) for v in parts[1:]]; total,idle=sum(vals),vals[3]; now=time.monotonic()
        if _last_cpu:
            lt,li,lts=_last_cpu; dt=now-lts
            if dt>0: used=((total-lt)-(idle-li))/(total-lt)*100 if (total-lt)>0 else 0; _last_cpu=(total,idle,now); return round(used,1)
        _last_cpu=(total,idle,now); return 0.0
    except Exception as e: log.warning("get_cpu_percent failed: %s", e); return -1
def get_memory():
    try:
        with open("/proc/meminfo") as f: data=f.read()
        total=int(re.search(r"MemTotal:\s+(\d+)",data).group(1))*1024
        avail=int(re.search(r"MemAvailable:\s+(\d+)",data).group(1))*1024
        active=int(re.search(r"Active:\s+(\d+)",data).group(1))*1024
        used=total-avail
        return {"total":total,"used":used,"available":avail,"active":active,"percent":round(active/total*100,1) if total else 0}
    except Exception as e: log.warning("get_memory failed: %s", e); return {"total":0,"used":0,"available":0,"active":0,"percent":-1}
def get_disks():
    disks=[]
    try:
        r=subprocess.run(["df","-B1","--exclude-type=tmpfs","--exclude-type=devtmpfs","--exclude-type=squashfs","--exclude-type=overlay"],capture_output=True,text=True,timeout=5)
        for line in r.stdout.strip().split("\n")[1:]:
            p=line.split()
            if len(p)>=6: disks.append({"device":p[0],"mount":p[5],"total":int(p[1]),"used":int(p[2]),"free":int(p[3]),"percent":float(p[4].replace("%",""))})
    except Exception as e: log.warning("get_disks failed: %s", e)
    return disks
def get_uptime():
    try:
        with open("/proc/uptime") as f: s=float(f.read().split()[0])
        d,r=divmod(s,86400); h,m=divmod(r,3600)
        return {"seconds":round(s,0),"days":int(d),"hours":int(h),"minutes":int(m//60),"string":f"{int(d)}d {int(h)}h {int(m//60)}m"}
    except Exception as e: log.warning("get_uptime failed: %s", e); return {"seconds":0,"days":0,"hours":0,"minutes":0,"string":"unknown"}
def get_disk_io():
    try:
        with open("/proc/diskstats") as f:
            for line in f:
                p=line.strip().split()
                if len(p)>=14 and p[2]=='nvme0n1' and not p[2].endswith(('p1','p2','p3')):
                    return {"device":p[2],"readsectors":int(p[5]),"writesectors":int(p[9])}
        return {"device":"","readsectors":0,"writesectors":0}
    except Exception as e: log.warning("get_disk_io failed: %s", e); return {"device":"","readsectors":0,"writesectors":0}
def get_load():
    try:
        with open("/proc/loadavg") as f: p=f.read().strip().split()
        return {"1m":float(p[0]),"5m":float(p[1]),"15m":float(p[2])}
    except Exception as e: log.warning("get_load failed: %s", e); return {"1m":-1,"5m":-1,"15m":-1}
def get_network():
    try:
        with open("/proc/net/dev") as f:
            for line in f:
                parts=line.strip().split()
                if len(parts)>=10 and parts[0].endswith(':') and parts[0]!='lo:':
                    rx=int(parts[1]); tx=int(parts[9])
                    return {"rx_bytes":rx,"tx_bytes":tx,"interface":parts[0].rstrip(':')}
        return {"rx_bytes":0,"tx_bytes":0,"interface":"unknown"}
    except Exception as e: log.warning("get_network failed: %s", e); return {"rx_bytes":0,"tx_bytes":0,"interface":"unknown"}
def get_gpu():
    import subprocess, json as _json
    result = {"percent":0,"vram_total":0,"vram_used":0,"temp_c":0}
    try:
        out = subprocess.run(["rocm-smi","--showuse","--showtemp","--showpower","--showmeminfo","vram","--json"],
                             capture_output=True,text=True,timeout=5)
        if out.returncode==0:
            data = _json.loads(out.stdout)
            card = data.get("card0",{})
            pct_str = card.get("GPU use (%)","0").replace("%","").strip()
            result["percent"] = float(pct_str) if pct_str else 0
            result["vram_total"] = int(card.get("VRAM Total Memory (B)","0"))
            result["vram_used"] = int(card.get("VRAM Total Used Memory (B)","0"))
            temp_str = card.get("Temperature (Sensor edge) (C)","0")
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
        out = subprocess.run(["sensors","-u"],capture_output=True,text=True,timeout=3)
        if out.returncode==0:
            temps = re.findall(r"temp(\d+)_input:\s+([\d.]+)", out.stdout)
            if temps:
                vals = [float(v) for _,v in temps]
                return {"celsius":round(sum(vals)/len(vals),1),"max":round(max(vals),1)}
        return {"celsius":0,"max":0}
    except Exception as e: log.warning("get_cpu_temp failed: %s", e); return {"celsius":0,"max":0}
def get_process_count():
    try:
        with open("/proc/loadavg") as f:
            return int(f.read().strip().split("/")[1].split()[0])
    except Exception as e: log.warning("get_process_count failed: %s", e); return 0
def build_stats():
    return {"hostname":socket.gethostname(),"cpu":get_cpu_percent(),"memory":get_memory(),"disks":get_disks(),
            "uptime":get_uptime(),"load":get_load(),"network":get_network(),"gpu":get_gpu(),
            "cpu_temp":get_cpu_temp(),"processes":get_process_count(),"disk_io":get_disk_io(),"timestamp":time.time()}
def list_uploads():
    files=[]
    for f in sorted(UPLOADS.iterdir(),key=lambda p:p.stat().st_mtime,reverse=True):
        if f.is_file() and f.suffix.lower() in('.png','.jpg','.jpeg','.gif','.webp','.svg'):
            files.append({"name":f.name,"url":f"/uploads/{f.name}","size":f.stat().st_size,"mtime":f.stat().st_mtime})
    return files
_arp_cache = None
_arp_cache_ts = 0
_arp_lock = Lock()

GIT_VERSION = ''
try:
    out = subprocess.run(['git','describe','--always','--tags','--dirty'],
        capture_output=True,text=True,timeout=2,cwd=HERE)
    if out.returncode==0:
        GIT_VERSION = out.stdout.strip()
except Exception as e: log.debug('git version detection failed: %s', e)

# ── Minimal config for first-run / missing config.json ──
# Served when config.json doesn't exist so the page works immediately.
MINIMAL_CONFIG = {
    "version": GIT_VERSION or "dev",
    "branding": {"title": "WarTab", "icon": "sword"},
    "theme": {
        "bgType": "gradient", "bgValue": "#0a0a0a, #1a1a1a, #0d0d0d",
        "bgBlur": 0, "bgDim": 0, "blur": 20, "glow": "#888888",
        "fontSizeText": 14, "fontSizeHeading": 16, "fontFamily": "Inter",
        "cardBg": "dark", "fontColor": "#cccccc", "cardOpacity": 1,
        "bgRotate": False, "animations": True, "showAccentBar": True,
    },
    "statusBar": {
        "enabled": True, "source": "local",
        "glancesUrl": "http://localhost:61209", "customUrl": "",
        "refreshInterval": 15,
        "items": ["cpu", "memory", "disk", "uptime"], "hostname": True,
    },
    "layout": {
        "cols": 4, "gap": 16, "pageWidth": 100,
        "pagePadding": 2, "pageWidthPadding": 2,
    },
    "search": {
        "engine": "https://www.google.com/search?q=",
        "engines": {
            "Google": "https://www.google.com/search?q=",
            "DuckDuckGo": "https://duckduckgo.com/?q=",
            "Brave": "https://search.brave.com/search?q=",
            "Bing": "https://www.bing.com/search?q=",
            "YouTube": "https://www.youtube.com/results?search_query=",
            "Reddit": "https://www.reddit.com/search/?q=",
            "Wikipedia": "https://en.wikipedia.org/w/index.php?search=",
        },
        "selected": "Google", "openInNewTab": True,
    },
    "cards": [
        {
            "id": "welcome-card", "title": "Welcome to WarTab",
            "icon": "sword", "color": "#888888", "width": 2, "height": 2,
            "sections": [{"id": "welcome-intro", "type": "notes", "label": "Your Dashboard",
                "content": "Welcome to your self-hosted command centre.\n\nThis page is yours to customise \u2014 add cards, rearrange them, and connect your services.\n\nClick the + button above to add a new card, or the \u2699 gear icon to configure the look and feel.\n\nDouble-click any card title to rename it."}],
        },
        {
            "id": "search-card", "title": "Quick Search",
            "icon": "search", "color": "#999999", "width": 1, "height": 1,
            "sections": [{"id": "search-main", "type": "search", "engine": "Google",
                "placeholder": "Search anything...", "label": "Web Search"}],
        },
        {
            "id": "clock-card", "title": "Time & Date",
            "icon": "clock", "color": "#aaaaaa", "width": 1, "height": 1,
            "sections": [{"id": "clock-main", "type": "clock",
                "format24h": False, "showDate": True}],
        },
        {
            "id": "mods-card", "title": "Card Modules",
            "icon": "grid", "color": "#9a9a9a", "width": 2, "height": 1,
            "sections": [{"id": "mods-list", "type": "link-list", "label": "Available Modules",
                "links": [
                    {"label": "Links & Bookmarks", "url": "", "icon": "link"},
                    {"label": "Search Bar", "url": "", "icon": "search"},
                    {"label": "Clock & Calendar", "url": "", "icon": "clock"},
                    {"label": "Weather", "url": "", "icon": "cloud-sun"},
                    {"label": "Notes", "url": "", "icon": "edit-3"},
                    {"label": "API Poller", "url": "", "icon": "activity"},
                    {"label": "Resource Monitor", "url": "", "icon": "bar-chart-3"},
                    {"label": "Media Card", "url": "", "icon": "film"},
                    {"label": "Proxmox", "url": "", "icon": "server"},
                    {"label": "LAN Scan", "url": "", "icon": "radio"},
                ]}],
        },
        {
            "id": "system-card", "title": "System",
            "icon": "cpu", "color": "#999999", "width": 1, "height": 1,
            "sections": [{"id": "sys-resources", "type": "resource-monitor",
                "source": "local", "glancesUrl": "http://localhost:61209",
                "refreshInterval": 3, "graphMode": False}],
        },
    ],
}

def scan_arp():
    import csv, io, socket, subprocess
    global _arp_cache, _arp_cache_ts
    if _arp_cache and (time.time() - _arp_cache_ts) < 30:
        return _arp_cache
    with _arp_lock:
        # Double-check inside lock
        if _arp_cache and (time.time() - _arp_cache_ts) < 30:
            return _arp_cache
        OUI = {
        "38:F7:CD":"Ubiquiti","F0:2F:74":"Ubiquiti","02:8B:32":"Local",
        "56:D1:D1":"Local","BC:24:11":"Raspberry Pi","B0:DC:EF":"Apple",
        "8C:55:4A":"Intel","8C:86:DD":"Apple",
    }
    # Known OUI prefixes (first 3 bytes) from major manufacturers
    OUI.update({
        "00:00:0C":"Cisco","00:00:5E":"IANA","00:50:56":"VMware",
        "08:00:27":"Oracle/VB","B8:27:EB":"Raspberry Pi",
        "00:50:F2":"Microsoft","00:53:00":"Microsoft",
        "00:60:08":"HP","0C:47:C9":"TP-Link","14:58:D0":"TP-Link",
        "1C:5C:F2":"TP-Link","1C:B7:2C":"Netgear","20:47:47":"Synology",
        "24:4B:FE":"Samsung","24:65:11":"Google","30:3A:64":"Apple",
        "30:85:A9":"Google","34:02:86":"Netgear","38:59:F9":"Apple",
        "3C:52:82":"ASUS","40:B0:76":"Netgear","44:23:5C":"TP-Link",
        "44:38:39":"Cisco","44:6D:57":"ASUS","48:4D:7E":"Samsung",
        "48:71:96":"Synology","48:B0:2D":"TP-Link","48:D7:05":"Google",
        "64:A2:F9":"Synology","64:BC:0C":"ASUS","6C:1F:F2":"ASUS",
        "6C:88:14":"TP-Link","70:5A:B6":"Apple","74:75:4A":"Google",
        "78:31:C1":"Apple","7C:2A:31":"ASUS","80:3F:5D":"Google",
        "84:3A:4B":"TP-Link","84:A6:38":"Synology","84:B2:61":"ASUS",
        "88:4A:EA":"TP-Link","88:A2:5E":"Google","8C:2D:AA":"Apple",
        "8C:3C:07":"TP-Link","90:09:3F":"ASUS","90:0C:27":"TP-Link",
        "90:78:41":"Synology","90:E6:BA":"TP-Link","98:B8:E3":"TP-Link",
        "A0:20:66":"Apple","A8:86:DD":"Apple","B0:DC:EF":"Apple",
        "B0:E1:7E":"TP-Link","B4:B6:86":"Apple","B8:27:EB":"Raspberry Pi",
        "B8:76:3F":"Apple","BC:24:11":"Raspberry Pi","BC:5F:F4":"TP-Link",
        "C0:25:A5":"Google","C0:BD:D1":"Apple","C0:FE:75":"ASUS",
        "C4:85:E8":"Synology","D0:23:DB":"Apple","D0:BF:9C":"Synology",
        "D4:9A:20":"Apple","DC:7B:94":"ASUS","E0:DC:FF":"Apple",
        "E4:B9:7A":"Synology","EC:08:6B":"Apple","EC:8C:A2":"Apple",
        "EC:F4:BB":"ASUS","F4:6D:04":"ASUS","F4:96:34":"TP-Link",
        "F4:B7:E2":"Google","F4:D4:88":"TP-Link","FC:01:CD":"Netgear",
    })
    result = []
    # Trigger a quick ping to gateway + a few IPs to refresh ARP cache
    try:
        seen = set()
        with open("/proc/net/arp") as f:
            for line in f:
                p = line.strip().split()
                if len(p) >= 1 and p[0].count(".") == 4:
                    seen.add(p[0])
        gw = "10.0.0.1"
        subnet = ".".join(gw.split(".")[:3]) + "."
        targets = [gw]
        for i in [1, 50, 100, 150, 200, 250, 254]:
            ip = subnet + str(i)
            if ip not in seen: targets.append(ip)
            if len(targets) >= 8: break
        for ip in targets:
            try: subprocess.run(['ping', '-c1', '-W1', ip], capture_output=True, timeout=2)
            except Exception as e: log.debug('arp ping %s failed: %s', ip, e)
    except Exception as e: log.debug('arp ping batch failed: %s', e)
    # Read refreshed ARP table
    try:
        with open("/proc/net/arp") as f:
            reader = csv.reader(io.StringIO(f.read()), delimiter=" ", skipinitialspace=True)
            next(reader, None)
            for row in reader:
                row = [c for c in row if c]
                if len(row) >= 4:
                    ip = row[0]; hw = row[3]; iface = row[5] if len(row) > 5 else ""
                    if hw and hw != "(incomplete)" and ":" in hw:
                        prefix = ":".join(hw.split(":")[:3]).upper()
                        vendor = OUI.get(prefix, "Unknown")
                        hostname = ""
                        try:
                            hn = socket.gethostbyaddr(ip)
                            hostname = hn[0] if hn and hn[0] else ""
                        except Exception as e: log.debug('hostname lookup failed: %s', e)
                        result.append({"ip": ip, "mac": hw, "vendor": vendor, "hostname": hostname, "iface": iface})
    except Exception as e: log.debug('arp result reading failed: %s', e)
    _arp_cache = {"devices": result, "timestamp": time.time(), "count": len(result)}
    _arp_cache_ts = time.time()
    return _arp_cache

# ═══════════════════════════════════════════
# Proxy & Utility API Handlers
# ═══════════════════════════════════════════

PROXY_TIMEOUT = 15
PROXY_MAX_RESPONSE = 5 * 1024 * 1024  # 5MB

def handle_proxy(body):
    """Generic HTTP proxy. POST /api/proxy with {url, method?, headers?, body?, timeout?}
    Returns the proxied response. Bypasses CORS — designed for LAN use."""
    url = body.get("url", "").strip()
    if not url:
        return {"error": "missing url"}, 400
    if not url.startswith(("http://", "https://")):
        return {"error": "invalid protocol"}, 400
    method = body.get("method", "GET").upper()
    req_headers = body.get("headers", {}) or {}
    req_body = body.get("body", None)
    timeout = min(body.get("timeout", PROXY_TIMEOUT), PROXY_TIMEOUT)
    try:
        req = urllib.request.Request(url, method=method)
        for k, v in req_headers.items():
            req.add_header(k, str(v))
        if req_body is not None:
            if isinstance(req_body, (dict, list)):
                req_body = json.dumps(req_body).encode()
                if "Content-Type" not in req_headers:
                    req.add_header("Content-Type", "application/json")
            elif isinstance(req_body, str):
                req_body = req_body.encode()
            req.data = req_body
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read(PROXY_MAX_RESPONSE)
            ct = resp.headers.get("Content-Type", "")
            is_json = "json" in ct
            result = {
                "status": resp.status,
                "headers": dict(resp.headers),
                "body": json.loads(raw.decode("utf-8", "replace")) if is_json else raw.decode("utf-8", "replace"),
                "content_type": ct,
            }
            return result, 200
    except urllib.error.HTTPError as e:
        raw = e.read()
        return {"status": e.code, "error": str(e), "body": raw.decode("utf-8", "replace")}, 502
    except urllib.error.URLError as e:
        return {"error": f"connection failed: {e.reason}"}, 502
    except Exception as e:
        return {"error": str(e)}, 502

def handle_cert_check(params):
    host = params.get("host", "")
    if not host: return {"error": "missing host"}, 400
    port = int(params.get("port", 443))
    ctx = ssl.create_default_context()
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED
    try:
        with socket.create_connection((host, port), timeout=8) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                from datetime import datetime
                expiry = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                days_left = (expiry - datetime.now()).days
                issuer = dict(x[0] for x in cert.get('issuer', []))
                subject = dict(x[0] for x in cert.get('subject', []))
                return {"host": host, "port": port, "expires": cert['notAfter'],
                        "days_left": days_left, "issuer": issuer,
                        "subject": subject.get("CN", ""), "valid": days_left > 0}, 200
    except Exception as e:
        return {"host": host, "port": port, "error": str(e), "days_left": -1, "valid": False}, 200

def handle_ping(params):
    host = params.get("host", "")
    count = min(int(params.get("count", 3)), 10)
    if not host: return {"error": "missing host"}, 400
    try:
        out = subprocess.run(["ping", "-c", str(count), "-W", "3", host],
                             capture_output=True, text=True, timeout=15)
        if out.returncode != 0:
            return {"host": host, "alive": False, "error": out.stderr.strip() or "no reply"}, 200
        m = re.search(r"min/avg/max/(?:stddev|mdev) = ([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)", out.stdout)
        if m:
            return {"host": host, "alive": True, "min_ms": float(m.group(1)),
                    "avg_ms": float(m.group(2)), "max_ms": float(m.group(3)),
                    "mdev_ms": float(m.group(4)), "packets": count}, 200
        times = [float(x) for x in re.findall(r"time[<=](\d+(?:\.\d+)?)\s*ms", out.stdout)]
        if times:
            return {"host": host, "alive": True, "min_ms": min(times),
                    "avg_ms": sum(times)/len(times), "max_ms": max(times), "packets": len(times)}, 200
        return {"host": host, "alive": True, "packets": count}, 200
    except subprocess.TimeoutExpired:
        return {"host": host, "alive": False, "error": "timeout"}, 200
    except Exception as e:
        return {"host": host, "alive": False, "error": str(e)}, 200

def handle_docker():
    socket_path = "/var/run/docker.sock"
    if not os.path.exists(socket_path):
        return {"error": "Docker socket not found", "containers": []}, 200
    try:
        req = urllib.request.Request("http://localhost/containers/json?all=true")
        with urllib.request.urlopen(req, timeout=5) as r:
            data = json.loads(r.read())
        containers = []
        for c in data:
            name = c.get("Names", [""])[0].lstrip("/") if c.get("Names") else c.get("Id", "")[:12]
            state = c.get("State", "unknown")
            containers.append({
                "id": c.get("Id", "")[:12], "name": name,
                "image": c.get("Image", ""), "state": state,
                "status": c.get("Status", ""),
                "ports": c.get("Ports", []),
                "created": c.get("Created", 0)
            })
        running = sum(1 for c in containers if c["state"] == "running")
        return {"containers": containers, "total": len(containers),
                "running": running, "stopped": len(containers) - running}, 200
    except Exception as e:
        return {"error": str(e), "containers": []}, 200

class WarTabHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(HERE),**kw)
    def do_OPTIONS(self): self.send_response(204); self._cors(); self.end_headers()
    def do_GET(self):
        if self.path=="/api/stats": return self._json(build_stats())
        if self.path=="/api/uploads": return self._json(list_uploads())
        if self.path.startswith("/api/notes/"):
            note_id = self.path.split("/api/notes/")[1].split("?")[0]
            note_path = NOTES / f"{note_id}.md"
            if note_path.exists():
                return self._json({"id": note_id, "content": note_path.read_text()})
            return self._json({"id": note_id, "content": ""})
        if self.path == "/api/config/backups":
            snap_dir = HERE / "snapshots"
            snap_dir.mkdir(exist_ok=True)
            snaps = sorted(snap_dir.glob("config_*.json"), reverse=True)
            result = []
            for s in snaps:
                ts = s.stem.replace("config_", "")
                size = s.stat().st_size
                result.append({"name": ts, "size": size, "file": s.name})
            return self._json(result)
        if self.path == "/api/config":
            cfg_path = HERE / "config.json"
            if cfg_path.exists():
                with open(cfg_path) as f:
                    data = json.load(f)
                    data["_version"] = GIT_VERSION
                    return self._json(data)
            # First run: serve minimal config so the page works immediately
            result = dict(MINIMAL_CONFIG)
            result["_version"] = GIT_VERSION
            return self._json(result)
        if self.path == "/api/arp":
            return self._json(scan_arp())
        if self.path.startswith("/api/ping"):
            params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            result, status = handle_ping({k: v[0] for k, v in params.items()})
            return self._json(result, status)
        if self.path.startswith("/api/cert-check"):
            params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            result, status = handle_cert_check({k: v[0] for k, v in params.items()})
            return self._json(result, status)
        if self.path == "/api/docker":
            result, status = handle_docker()
            return self._json(result, status)
        if self.path == "/api/icons/list":
            files=[]
            for f in sorted(ICONS_DIR.iterdir(), key=lambda p:p.stat().st_mtime, reverse=True):
                if f.is_file() and f.suffix.lower() in('.png','.jpg','.jpeg','.gif','.webp','.svg'):
                    files.append({"name":f.name,"url":f"/uploads/icons/{f.name}","size":f.stat().st_size})
            return self._json(files)
        if self.path == "/api/icons/check":
            idx_path = HERE / "icons" / "selfhst-index.json"
            info = {"exists": False, "svg_count": 0, "index_entries": 0, "svgs_with_flag": 0}
            if idx_path.exists():
                info["exists"] = True
                try:
                    data = json.loads(idx_path.read_text())
                    info["index_entries"] = len(data)
                    info["svgs_with_flag"] = sum(1 for x in data if x.get("SVG") == "Yes")
                    import glob
                    info["svg_count"] = len(glob.glob(str(HERE / "icons" / "*.svg")))
                except Exception as e:
                    info["error"] = str(e)
            return self._json(info)
        path = self.translate_path(self.path)
        if not Path(path).is_file() or self.path=="/":
            self.path="/index.html"
            path = HERE / "index.html"
            if path.exists():
                html = path.read_text()
                # Inject git version as cache-busting param on all script/link tags
                if GIT_VERSION:
                    html = html.replace('?v=BUILD', '?v=' + GIT_VERSION)
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "text/html")
                self.send_header("Content-Length", str(len(html.encode())))
                self.end_headers()
                self.wfile.write(html.encode())
                return
        return super().do_GET()
    def do_POST(self):
        if self.path=="/api/upload":
            cl=int(self.headers.get("Content-Length",0))
            if cl>MAX_BYTES: return self._json({"error":f"File too large ({cl//1024}KB, max {MAX_BYTES//1024}KB)"},413)
            raw=self.rfile.read(cl) if cl else b""
            filename=self.headers.get("X-Filename","image.png")
            result=process_image(raw,filename)
            if "error" in result: return self._json(result,400)
            return self._json(result)
        if self.path.startswith("/api/upload/"): return self._handle_delete(self.path)
        if self.path=="/api/upload-icon":
            cl=int(self.headers.get("Content-Length",0))
            if cl>2*1024*1024: return self._json({"error":"too large"},413)
            raw=self.rfile.read(cl) if cl else b""
            result=process_icon(raw,"icon.png")
            if "error" in result: return self._json(result,400)
            return self._json(result)
        if self.path.startswith("/api/icons/delete/"):
            name=self.path.split("/api/icons/delete/")[1]
            safe=re.sub(r"[^a-zA-Z0-9_.-]","",name)
            fpath=ICONS_DIR/safe
            if fpath.exists() and fpath.is_file():
                fpath.unlink()
                return self._json({"status":"deleted","file":safe})
            return self._json({"error":"not found"},404)
        if self.path == "/api/config":
            cl = int(self.headers.get("Content-Length", 0))
            if cl > 1024*1024: return self._json({"error":"too large"},413)
            body = self.rfile.read(cl) if cl else b"{}"
            try:
                data = json.loads(body)
                valid, msg = validate_config(data)
                if not valid:
                    return self._json({"error":"invalid config: "+msg},400)
                cfg_path = HERE / "config.json"
                # Save a timestamped snapshot before overwriting
                snap_dir = HERE / "snapshots"
                snap_dir.mkdir(exist_ok=True)
                if cfg_path.exists():
                    from datetime import datetime
                    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                    snap_path = snap_dir / f"config_{ts}.json"
                    import shutil
                    shutil.copy2(cfg_path, snap_path)
                    # Prune to last 20 snapshots
                    snaps = sorted(snap_dir.glob("config_*.json"), reverse=True)
                    for old in snaps[20:]:
                        old.unlink()
                with open(cfg_path, "w") as f:
                    json.dump(data, f, indent=2)
                return self._json({"status":"saved"})
            except Exception as e:
                return self._json({"error":str(e)},400)
        if self.path.startswith("/api/config/restore/"):
            name = self.path.split("/api/config/restore/")[1]
            safe = re.sub(r"[^a-zA-Z0-9_-]", "", name)
            snap_path = HERE / "snapshots" / f"config_{safe}.json"
            if not snap_path.exists():
                return self._json({"error":"snapshot not found"},404)
            data = json.loads(snap_path.read_text())
            cfg_path = HERE / "config.json"
            with open(cfg_path, "w") as f:
                json.dump(data, f, indent=2)
            return self._json({"status":"restored","snapshot":safe})
        if self.path.startswith("/api/notes/"):
            note_id = self.path.split("/api/notes/")[1].split("?")[0]
            if not note_id: return self._json({"error":"missing id"},400)
            cl = int(self.headers.get("Content-Length",0))
            body = self.rfile.read(cl).decode() if cl else ""
            safe = re.sub(r"[^a-zA-Z0-9_-]", "", note_id)
            if not safe: return self._json({"error":"invalid id"},400)
            note_path = NOTES / f"{safe}.md"
            note_path.write_text(body)
            return self._json({"status":"saved","id":safe})
        if self.path == "/api/proxy":
            cl = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(cl) if cl else b"{}"
            try:
                data = json.loads(body)
                result, status = handle_proxy(data)
                return self._json(result, status)
            except json.JSONDecodeError:
                return self._json({"error": "invalid json"}, 400)
        if self.path.startswith("/api/save-icon"):
            qs=urllib.parse.urlparse(self.path).query
            params=urllib.parse.parse_qs(qs)
            name=(params.get("name") or [""])[0]
            if not name: return self._json({"error":"missing name"},400)
            safe=re.sub(r"[^a-z0-9-]","",name.lower())
            if not safe: return self._json({"error":"invalid name"},400)
            cl=int(self.headers.get("Content-Length",0))
            if cl>512*1024: return self._json({"error":"too large"},413)
            body=self.rfile.read(cl) if cl else b""
            out_path=ICONS/f"{safe}.svg"
            with open(out_path,"wb") as f: f.write(body)
            return self._json({"status":"saved","file":f"{safe}.svg","path":f"/icons/{safe}.svg"})
        return self._json({"error":"not_found"},404)
    def do_DELETE(self): return self._handle_delete(self.path)
    def _handle_delete(self,path):
        parts=path.strip("/").split("/")
        if len(parts)<3: return self._json({"error":"bad path"},400)
        filename=parts[-1]; filepath=UPLOADS/filename
        if not filepath.exists() or not filepath.is_file(): return self._json({"error":"not_found"},404)
        if filepath.suffix.lower() not in('.png','.jpg','.jpeg','.gif','.webp','.svg'): return self._json({"error":"not allowed"},403)
        filepath.unlink(); thumb=UPLOADS/f"thumb_{filename}"
        if thumb.exists(): thumb.unlink()
        return self._json({"status":"deleted","file":filename})
    def _cors(self):
        for k,v in CORS_HEADERS.items(): self.send_header(k,v)
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        # Content-Security-Policy: block inline scripts, allow external connects (API poller), fonts, images
        self.send_header("Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' http: https:; "
            "frame-src *;")
        super().end_headers()
    def _json(self,data,status=200):
        self.send_response(status); self._cors(); self.send_header("Content-Type","application/json"); self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    def log_message(self,fmt,*a):
        prefix={"200":"OK","304":"--","404":"NF","413":"TL","500":"ER"}.get(a[0],"?")
        print(f"  {prefix} {a[0]} {self.path}")
def get_local_ips():
    ips=[]
    try: s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.settimeout(0.1); s.connect(('10.254.254.254',1)); ips.append(s.getsockname()[0]); s.close()
    except Exception as e: log.debug('get_local_ips failed: %s', e)
    try: ips.extend(a for a in socket.gethostbyname_ex(socket.gethostname())[2] if a not in ips)
    except Exception as e: log.debug('get_local_ips failed: %s', e)
    return ips or ["127.0.0.1"]
def main():
    ap=argparse.ArgumentParser(description="WarTab Server")
    ap.add_argument("--port","-p",type=int,default=8081); ap.add_argument("--bind","-b",default="0.0.0.0"); ap.add_argument("--open","-o",action="store_true"); ap.add_argument("--mdns",action="store_true")
    a=ap.parse_args()
    http.server.HTTPServer.allow_reuse_address=True
    server=http.server.ThreadingHTTPServer((a.bind,a.port),WarTabHandler); server.server_name="WarTab"
    hostname=socket.gethostname()
    print(f"\n  WarTab Server\n  ----")
    print(f"  Local:    http://localhost:{a.port}")
    for ip in get_local_ips(): print(f"  Network:  http://{ip}:{a.port}")
    # Show icon status on startup
    idx_path = HERE / "icons" / "selfhst-index.json"
    if idx_path.exists():
        try:
            idx_data = json.loads(idx_path.read_text())
            svg_files = len(glob.glob(str(HERE / "icons" / "*.svg")))
            print(f"  Icons:    {svg_files} SVGs, {len(idx_data)} index entries")
        except Exception as e:
            print(f"  Icons:    index read failed ({e})")
    else:
        print(f"  Icons:    selfhst-index.json not found")
    mDNS_proc = None
    if a.mdns:
        try:
            mDNS_proc = subprocess.Popen(
                ["avahi-publish-service", "WarTab", "_http._tcp", str(a.port),
                 "path=/"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            log.info("mDNS published — http://%s.local:%s", hostname, a.port)
        except FileNotFoundError:
            log.warning("--mdns: avahi-publish-service not found. Install: sudo apt install avahi-utils")
        except Exception as e:
            log.warning("--mdns: failed to publish: %s", e)
    print("  ----\n  Ctrl+C to stop\n")
    if a.open: webbrowser.open(f"http://localhost:{a.port}")
    try: server.serve_forever()
    except KeyboardInterrupt: print("\n  Stopping...")
    finally:
        if mDNS_proc:
            mDNS_proc.terminate()
            mDNS_proc.wait(timeout=3)
        server.server_close()
        sys.exit(0)
if __name__=="__main__": main()

#!/usr/bin/env python3
"""WarTab Server — new tab page + /api/stats + image upload + icon save."""
import argparse, http.server, io, json, os, re, socket, subprocess, sys, time, uuid, webbrowser
from pathlib import Path
HERE = Path(__file__).parent.resolve()
UPLOADS = HERE / "uploads"
ICONS = HERE / "icons"
STATIC = HERE / "static"
UPLOADS.mkdir(exist_ok=True)
ICONS.mkdir(exist_ok=True)
NOTES = HERE / "notes"
NOTES.mkdir(exist_ok=True)
(STATIC / "fonts").mkdir(parents=True, exist_ok=True)
MIME_TYPES = {".html":"text/html",".css":"text/css",".js":"application/javascript",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",".svg":"image/svg+xml",".ico":"image/x-icon",".webp":"image/webp"}
CORS_HEADERS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,DELETE,OPTIONS","Access-Control-Allow-Headers":"Content-Type,X-Filename"}
try: from PIL import Image, ImageOps; HAVE_PIL=True
except ImportError: HAVE_PIL=False
MAX_W,MAX_H,MAX_BYTES=1920,1080,5*1024*1024
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
            except: pass
            kw={"format":fmt}
            if fmt=="JPEG": kw["quality"]=85; kw["optimize"]=True
            elif fmt=="PNG": kw["optimize"]=True
            elif fmt=="WEBP": kw["quality"]=85
            img.save(out_path,**kw)
            return {"url":f"/uploads/{out_name}","path":str(out_path),"size":out_path.stat().st_size,"name":filename,"width":img.width,"height":img.height}
        except Exception as e: return {"error":str(e)}
    else:
        with open(out_path,"wb") as f: f.write(raw_bytes)
        return {"url":f"/uploads/{out_name}","path":str(out_path),"size":len(raw_bytes),"name":filename}
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
    except: return -1
def get_memory():
    try:
        with open("/proc/meminfo") as f: data=f.read()
        total=int(re.search(r"MemTotal:\s+(\d+)",data).group(1))*1024
        avail=int(re.search(r"MemAvailable:\s+(\d+)",data).group(1))*1024
        used=total-avail
        return {"total":total,"used":used,"available":avail,"percent":round(used/total*100,1) if total else 0}
    except: return {"total":0,"used":0,"available":0,"percent":-1}
def get_disks():
    disks=[]
    try:
        r=subprocess.run(["df","-B1","--exclude-type=tmpfs","--exclude-type=devtmpfs","--exclude-type=squashfs","--exclude-type=overlay"],capture_output=True,text=True,timeout=5)
        for line in r.stdout.strip().split("\n")[1:]:
            p=line.split()
            if len(p)>=6: disks.append({"device":p[0],"mount":p[5],"total":int(p[1]),"used":int(p[2]),"free":int(p[3]),"percent":float(p[4].replace("%",""))})
    except: pass
    return disks
def get_uptime():
    try:
        with open("/proc/uptime") as f: s=float(f.read().split()[0])
        d,r=divmod(s,86400); h,m=divmod(r,3600)
        return {"seconds":round(s,0),"days":int(d),"hours":int(h),"minutes":int(m//60),"string":f"{int(d)}d {int(h)}h {int(m//60)}m"}
    except: return {"seconds":0,"days":0,"hours":0,"minutes":0,"string":"unknown"}
def get_load():
    try:
        with open("/proc/loadavg") as f: p=f.read().strip().split()
        return {"1m":float(p[0]),"5m":float(p[1]),"15m":float(p[2])}
    except: return {"1m":-1,"5m":-1,"15m":-1}
def get_network():
    try:
        with open("/proc/net/dev") as f:
            for line in f:
                parts=line.strip().split()
                if len(parts)>=10 and parts[0].endswith(':') and parts[0]!='lo:':
                    rx=int(parts[1]); tx=int(parts[9])
                    return {"rx_bytes":rx,"tx_bytes":tx,"interface":parts[0].rstrip(':')}
        return {"rx_bytes":0,"tx_bytes":0,"interface":"unknown"}
    except: return {"rx_bytes":0,"tx_bytes":0,"interface":"unknown"}
def build_stats():
    return {"hostname":socket.gethostname(),"cpu":get_cpu_percent(),"memory":get_memory(),"disks":get_disks(),"uptime":get_uptime(),"load":get_load(),"network":get_network(),"timestamp":time.time()}
def list_uploads():
    files=[]
    for f in sorted(UPLOADS.iterdir(),key=lambda p:p.stat().st_mtime,reverse=True):
        if f.is_file() and f.suffix.lower() in('.png','.jpg','.jpeg','.gif','.webp','.svg'):
            files.append({"name":f.name,"url":f"/uploads/{f.name}","size":f.stat().st_size,"mtime":f.stat().st_mtime})
    return files
def scan_arp():
    import csv, io
    # Compact OUI vendor prefixes (first 3 bytes -> vendor name)
    OUI = {
        "00:00:0C":"Cisco",
        "00:00:5E":"IANA",
        "00:01:5C":"3com",
        "00:03:93":"Cisco",
        "00:04:9A":"Intel",
        "00:0B:86":"HP",
        "00:0D:65":"Dell",
        "00:0E:35":"Dell",
        "00:10:18":"Nortel",
        "00:10:DB":"Netgear",
        "00:12:17":"Apple",
        "00:13:10":"Dell",
        "00:14:22":"Intel",
        "00:14:BF":"Intel",
        "00:15:6D":"Apple",
        "00:16:CB":"Apple",
        "00:17:F2":"Apple",
        "00:19:E3":"Dell",
        "00:1A:11":"HP",
        "00:1B:63":"Intel",
        "00:1C:42":"HP",
        "00:1D:72":"Apple",
        "00:1E:65":"Dell",
        "00:1F:5B":"HP",
        "00:1F:C6":"Apple",
        "00:21:6C":"HP",
        "00:21:CC":"Dell",
        "00:22:41":"Dell",
        "00:23:DF":"HP",
        "00:24:36":"Dell",
        "00:24:E8":"Apple",
        "00:25:00":"Apple",
        "00:25:22":"Intel",
        "00:25:4B":"Apple",
        "00:26:08":"Dell",
        "00:26:55":"HP",
        "00:26:AB":"Dell",
        "00:26:B9":"Apple",
        "00:27:22":"Dell",
        "00:50:56":"VMware",
        "00:50:F2":"Microsoft",
        "00:53:00":"Microsoft",
        "00:60:08":"HP",
        "00:A0:C9":"Intel",
        "08:00:27":"Oracle/VB",
        "08:00:2B":"DEC/Intel",
        "08:00:45":"SynOptics",
        "08:00:69":"Apple",
        "08:00:7C":"Sun",
        "0C:47:C9":"TP-Link",
        "10:02:B5":"HP",
        "10:05:CA":"HP",
        "14:10:9F":"Intel",
        "14:58:D0":"TP-Link",
        "18:03:73":"Apple",
        "18:65:90":"Apple",
        "1C:5C:F2":"TP-Link",
        "1C:87:2C":"Intel",
        "1C:B7:2C":"Netgear",
        "20:1A:06":"Intel",
        "20:47:47":"Synology",
        "20:67:7C":"Apple",
        "20:8C:8D":"Intel",
        "24:4B:FE":"Samsung",
        "24:65:11":"Google",
        "24:AB:81":"Intel",
        "24:77:03":"Netgear",
        "28:6E:D4":"Intel",
        "28:80:23":"Intel",
        "28:C6:3F":"Apple",
        "2C:33:11":"HP",
        "2C:4D:54":"Intel",
        "2C:54:2D":"Google",
        "2C:5B:B8":"HP",
        "2C:56:DC":"Intel",
        "2C:5A:0F":"Intel",
        "30:3A:64":"Apple",
        "30:85:A9":"Google",
        "30:8C:FB":"Intel",
        "30:9C:23":"Intel",
        "34:02:86":"Netgear",
        "34:23:87":"Intel",
        "34:4B:50":"Intel",
        "34:5F:01":"TP-Link",
        "34:95:DB":"Intel",
        "38:59:F9":"Apple",
        "38:60:77":"Intel",
        "38:63:BB":"Huawei",
        "3C:07:54":"Intel",
        "3C:08:F6":"Intel",
        "3C:52:82":"ASUS",
        "3C:5A:37":"Intel",
        "40:16:9E":"Apple",
        "40:B0:76":"Netgear",
        "40:D3:2D":"HP",
        "44:23:5C":"TP-Link",
        "44:38:39":"Cisco",
        "44:6D:57":"ASUS",
        "44:8A:5B":"Intel",
        "44:A5:6E":"HP",
        "48:45:20":"Intel",
        "48:4D:7E":"Samsung",
        "48:5A:3F":"Apple",
        "48:5B:39":"Intel",
        "48:5D:36":"Apple",
        "48:71:96":"Synology",
        "48:B0:2D":"TP-Link",
        "48:D7:05":"Google",
        "4C:24:98":"Dell",
        "4C:32:75":"Apple",
        "4C:5E:0C":"TP-Link",
        "4C:77:66":"Intel",
        "4C:79:BA":"TP-Link",
        "4C:A1:7E":"Intel",
        "4C:EB:42":"Intel",
        "50:3E:AA":"Intel",
        "50:62:7C":"Intel",
        "50:6A:03":"Intel",
        "50:A7:2B":"HP",
        "50:C7:BF":"Intel",
        "54:04:A6":"Intel",
        "54:8C:A0":"Intel",
        "54:A0:50":"Intel",
        "58:10:8C":"Intel",
        "58:38:79":"HP",
        "58:6B:14":"Intel",
        "58:8A:5A":"Intel",
        "5C:51:4F":"Intel",
        "5C:8A:38":"Apple",
        "5C:E9:1E":"Apple",
        "5C:EA:1D":"Intel",
        "60:30:D4":"Intel",
        "60:33:4B":"Intel",
        "60:6B:FF":"Netgear",
        "60:92:17":"Intel",
        "60:9C:9F":"Intel",
        "60:A4:4C":"Cisco",
        "60:BE:B4":"Intel",
        "64:00:6A":"Intel",
        "64:09:80":"Intel",
        "64:70:02":"Intel",
        "64:A2:F9":"Synology",
        "64:BC:0C":"ASUS",
        "68:7A:64":"Intel",
        "68:9C:70":"Intel",
        "68:AB:0A":"Intel",
        "68:DB:F5":"Intel",
        "6C:0B:84":"Intel",
        "6C:1F:F2":"ASUS",
        "6C:70:9F":"Apple",
        "6C:72:20":"Intel",
        "6C:88:14":"TP-Link",
        "6C:96:CF":"Dell",
        "6C:E8:73":"Intel",
        "70:18:8B":"Intel",
        "70:5A:0F":"Intel",
        "70:5A:B6":"Apple",
        "70:66:55":"Intel",
        "70:8B:CD":"Intel",
        "70:C9:4E":"Intel",
        "70:D8:23":"Intel",
        "74:75:4A":"Google",
        "74:9D:79":"Intel",
        "74:D0:2B":"Intel",
        "78:24:AF":"Dell",
        "78:31:C1":"Apple",
        "78:45:C4":"Intel",
        "78:92:9C":"HP",
        "78:AC:C0":"Intel",
        "7C:01:0A":"HP",
        "7C:04:D0":"Intel",
        "7C:10:C9":"Apple",
        "7C:11:BE":"Intel",
        "7C:2A:31":"ASUS",
        "7C:50:E7":"Intel",
        "7C:B0:3E":"Intel",
        "80:3F:5D":"Google",
        "84:3A:4B":"TP-Link",
        "84:7B:3B":"Intel",
        "84:7E:40":"Intel",
        "84:A6:38":"Synology",
        "84:B2:61":"ASUS",
        "84:EF:18":"Intel",
        "88:35:4C":"Intel",
        "88:4A:EA":"TP-Link",
        "88:53:2E":"Intel",
        "88:66:5A":"Intel",
        "88:9B:39":"Intel",
        "88:A2:5E":"Google",
        "88:C6:26":"Intel",
        "8C:04:FF":"Intel",
        "8C:16:45":"Intel",
        "8C:2D:AA":"Apple",
        "8C:3C:07":"TP-Link",
        "8C:45:00":"Google",
        "8C:70:5A":"Intel",
        "8C:89:A5":"Apple",
        "8C:AE:4C":"Intel",
        "90:09:3F":"ASUS",
        "90:0C:27":"TP-Link",
        "90:5C:E5":"Intel",
        "90:78:41":"Synology",
        "90:B1:1C":"Intel",
        "90:E6:BA":"TP-Link",
        "94:65:2D":"Apple",
        "94:9F:3E":"Intel",
        "94:D9:B3":"Intel",
        "98:07:2D":"Intel",
        "98:28:A6":"Intel",
        "98:3B:16":"Intel",
        "98:3F:9F":"Intel",
        "98:90:96":"Intel",
        "98:A9:7B":"Intel",
        "98:B8:E3":"TP-Link",
        "9C:2A:70":"Intel",
        "9C:B6:54":"Intel",
        "9C:E6:35":"Intel",
        "A0:36:9F":"Intel",
        "A0:40:41":"Intel",
        "A0:48:1C":"Intel",
        "A0:5E:6B":"Intel",
        "A0:63:91":"Intel",
        "A0:6C:EC":"Intel",
        "A0:8B:6F":"HP",
        "A0:8C:FD":"Intel",
        "A0:93:51":"Apple",
        "A0:CE:C8":"Intel",
        "A0:E2:01":"Netgear",
        "A4:4C:11":"Intel",
        "A4:4E:31":"Intel",
        "A4:77:33":"Intel",
        "A4:AE:9A":"Intel",
        "A4:B1:97":"Intel",
        "A4:B8:05":"Intel",
        "A4:C3:F0":"Intel",
        "A4:DA:32":"Intel",
        "A4:DE:32":"Intel",
        "A8:1E:84":"Intel",
        "A8:20:66":"Apple",
        "A8:3E:50":"Intel",
        "A8:47:4B":"Intel",
        "A8:86:DD":"Apple",
        "A8:88:08":"Intel",
        "A8:93:4A":"Intel",
        "A8:A1:59":"Google",
        "AC:22:05":"Intel",
        "AC:7E:8A":"HP",
        "AC:84:C6":"Intel",
        "AC:87:A3":"Intel",
        "AC:9B:0A":"HP",
        "AC:E2:15":"Intel",
        "B0:6C:BF":"Intel",
        "B0:7D:47":"Intel",
        "B0:83:FE":"Intel",
        "B0:95:75":"Intel",
        "B0:9F:BA":"Intel",
        "B0:A4:2E":"Intel",
        "B0:C5:54":"Intel",
        "B0:E1:7E":"TP-Link",
        "B4:2E:21":"Intel",
        "B4:66:FC":"Intel",
        "B4:7C:9C":"Intel",
        "B4:96:9B":"Intel",
        "B4:B0:24":"Intel",
        "B4:B6:86":"Apple",
        "B4:E1:0F":"Intel",
        "B4:EE:B4":"Intel",
        "B8:27:EB":"Raspberry Pi",
        "B8:2A:7C":"Intel",
        "B8:62:1F":"Intel",
        "B8:76:3F":"Apple",
        "B8:8A:5E":"Intel",
        "B8:AC:6F":"Apple",
        "B8:E8:56":"Intel",
        "BC:30:5B":"HP",
        "BC:5F:F4":"TP-Link",
        "BC:67:1C":"Intel",
        "BC:6E:76":"HP",
        "BC:AE:C5":"Intel",
        "C0:25:A5":"Google",
        "C0:3F:0E":"HP",
        "C0:4A:00":"Intel",
        "C0:63:94":"Intel",
        "C0:74:2B":"Intel",
        "C0:7B:BC":"Intel",
        "C0:9B:5B":"Intel",
        "C0:B3:14":"Intel",
        "C0:BD:D1":"Apple",
        "C0:C9:E3":"Intel",
        "C0:E4:34":"Intel",
        "C0:FE:75":"ASUS",
        "C4:54:2F":"Intel",
        "C4:65:16":"HP",
        "C4:81:7C":"Intel",
        "C4:85:E8":"Synology",
        "C4:A8:1D":"Intel",
        "C4:E9:84":"HP",
        "C8:1B:E2":"Intel",
        "C8:34:8A":"Intel",
        "C8:3D:D4":"Intel",
        "C8:5B:76":"Apple",
        "C8:5D:4C":"Intel",
        "C8:9B:3E":"Intel",
        "C8:AA:21":"Google",
        "C8:BE:19":"Intel",
        "C8:CB:B8":"Intel",
        "C8:CF:AE":"HP",
        "C8:E2:65":"Intel",
        "CC:2D:8C":"Intel",
        "CC:3A:61":"Intel",
        "CC:5C:75":"Intel",
        "CC:78:5F":"Intel",
        "CC:B0:DA":"Intel",
        "CC:DB:A7":"Intel",
        "CC:E0:DA":"Intel",
        "D0:17:C2":"Intel",
        "D0:23:DB":"Apple",
        "D0:2B:20":"Intel",
        "D0:50:99":"Dell",
        "D0:57:4C":"Intel",
        "D0:67:E5":"Intel",
        "D0:94:66":"Intel",
        "D0:9E:3E":"Intel",
        "D0:BF:9C":"Synology",
        "D0:C0:5B":"Intel",
        "D0:E1:40":"Dell",
        "D4:3A:5D":"Intel",
        "D4:5D:51":"Intel",
        "D4:60:E3":"Intel",
        "D4:6E:0E":"Intel",
        "D4:81:CA":"Intel",
        "D4:9A:20":"Apple",
        "D4:AE:52":"Dell",
        "D4:B9:2A":"Intel",
        "D4:BE:D9":"Intel",
        "D4:D7:48":"Intel",
        "D8:50:E6":"Intel",
        "D8:9A:34":"Intel",
        "D8:C4:6A":"Intel",
        "D8:CB:8A":"Intel",
        "D8:E7:33":"HP",
        "D8:EF:CD":"Intel",
        "DC:41:5C":"Intel",
        "DC:53:7C":"Intel",
        "DC:7B:94":"ASUS",
        "DC:85:DE":"Intel",
        "DC:A6:32":"Intel",
        "DC:FE:E7":"Intel",
        "E0:2A:14":"Intel",
        "E0:3E:45":"Intel",
        "E0:53:C7":"Intel",
        "E0:6A:B6":"Intel",
        "E0:8C:6A":"Intel",
        "E0:C7:67":"Intel",
        "E0:CA:4C":"Intel",
        "E0:D1:73":"Intel",
        "E0:DC:FF":"Apple",
        "E4:11:5B":"Intel",
        "E4:3E:79":"Intel",
        "E4:54:E8":"Intel",
        "E4:70:AE":"Intel",
        "E4:92:FB":"Intel",
        "E4:A4:71":"Intel",
        "E4:A8:09":"Intel",
        "E4:B9:7A":"Synology",
        "E4:C7:22":"Intel",
        "E4:CE:8F":"Intel",
        "E8:04:0B":"Intel",
        "E8:39:35":"Intel",
        "E8:6C:0F":"Intel",
        "E8:9D:87":"Intel",
        "E8:B1:FC":"TP-Link",
        "E8:D0:FC":"Intel",
        "E8:E7:2A":"Intel",
        "EC:08:6B":"Apple",
        "EC:1A:59":"Intel",
        "EC:2E:4E":"Intel",
        "EC:8C:A2":"Apple",
        "EC:B5:FA":"Intel",
        "EC:BD:1D":"Intel",
        "EC:F4:BB":"ASUS",
        "F0:18:98":"Intel",
        "F0:1F:AF":"Intel",
        "F0:4D:A2":"Intel",
        "F0:7B:CB":"Intel",
        "F0:79:59":"HP",
        "F0:7D:68":"Intel",
        "F0:9F:C2":"Intel",
        "F0:B4:29":"Intel",
        "F0:B6:7B":"Intel",
        "F0:BF:97":"Intel",
        "F0:C1:1A":"Intel",
        "F0:D4:E2":"Intel",
        "F0:DE:F1":"Intel",
        "F4:0C:BB":"Intel",
        "F4:1E:4B":"Intel",
        "F4:4D:30":"Intel",
        "F4:6D:04":"ASUS",
        "F4:8C:EB":"Intel",
        "F4:96:34":"TP-Link",
        "F4:B7:E2":"Google",
        "F4:C7:AA":"Intel",
        "F4:CE:46":"HP",
        "F4:D4:88":"TP-Link",
        "F4:E9:2D":"Intel",
        "F8:0D:43":"Intel",
        "F8:2F:5E":"Intel",
        "F8:34:41":"Intel",
        "F8:4B:62":"Intel",
        "F8:5B:CE":"Intel",
        "F8:63:3F":"Intel",
        "F8:BC:12":"Dell",
        "F8:C4:8C":"HP",
        "F8:E4:FB":"Intel",
        "FC:01:CD":"Netgear",
        "FC:15:B4":"Intel",
        "FC:2A:9C":"Intel",
        "FC:3F:AB":"Intel",
        "FC:48:EF":"Intel",
        "FC:5A:72":"Intel",
        "FC:AA:14":"Intel",
        "FC:CF:62":"Intel",
        "FC:E9:98":"Intel",
        "FC:F5:28":"Intel",
        "FC:F8:AE":"Intel",
        "38:F7:CD":"Ubiquiti",
        "02:8B:32":"Local",
        "F0:2F:74":"Ubiquiti",
        "56:D1:D1":"Local",
        "BC:24:11":"Raspberry Pi",
        "B0:DC:EF":"Apple",
        "8C:55:4A":"Intel",
        "8C:86:DD":"Apple",
    }
    result = []
    try:
        with open("/proc/net/arp") as f:
            reader = csv.reader(io.StringIO(f.read()), delimiter=" ", skipinitialspace=True)
            next(reader, None)  # skip header
            for row in reader:
                row = [c for c in row if c]
                if len(row) >= 4:
                    ip = row[0]
                    hw = row[3] if len(row) > 3 else ""
                    if hw and hw != "(incomplete)" and ":" in hw:
                        prefix = ":".join(hw.split(":")[:3]).upper()
                        vendor = OUI.get(prefix, "Unknown")
                        result.append({"ip": ip, "mac": hw, "vendor": vendor})
    except Exception:
        pass
    return {"devices": result, "timestamp": time.time(), "count": len(result)}

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
            import json as _json
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
            import json as _json
            cfg_path = HERE / "config.json"
            if cfg_path.exists():
                with open(cfg_path) as f:
                    return self._json(_json.load(f))
            return self._json({})
        if self.path == "/api/arp":
            return self._json(scan_arp())
        path=self.translate_path(self.path)
        if not os.path.isfile(path) or self.path=="/": self.path="/index.html"
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
        if self.path == "/api/config":
            import json as _json
            cl = int(self.headers.get("Content-Length", 0))
            if cl > 1024*1024: return self._json({"error":"too large"},413)
            body = self.rfile.read(cl) if cl else b"{}"
            try:
                data = _json.loads(body)
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
                    _json.dump(data, f, indent=2)
                return self._json({"status":"saved"})
            except Exception as e:
                return self._json({"error":str(e)},400)
        if self.path.startswith("/api/config/restore/"):
            import json as _json
            name = self.path.split("/api/config/restore/")[1]
            safe = re.sub(r"[^a-zA-Z0-9_-]", "", name)
            snap_path = HERE / "snapshots" / f"config_{safe}.json"
            if not snap_path.exists():
                return self._json({"error":"snapshot not found"},404)
            data = _json.loads(snap_path.read_text())
            cfg_path = HERE / "config.json"
            with open(cfg_path, "w") as f:
                _json.dump(data, f, indent=2)
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
        import urllib.parse
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
        super().end_headers()
    def _json(self,data,status=200):
        self.send_response(status); self._cors(); self.send_header("Content-Type","application/json"); self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    def log_message(self,fmt,*a):
        prefix={"200":"OK","304":"--","404":"NF","413":"TL","500":"ER"}.get(a[0],"?")
        print(f"  {prefix} {a[0]} {self.path}")
def get_local_ips():
    ips=[]
    try: s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.settimeout(0.1); s.connect(("10.254.254.254",1)); ips.append(s.getsockname()[0]); s.close()
    except: pass
    try: ips.extend(a for a in socket.gethostbyname_ex(socket.gethostname())[2] if a not in ips)
    except: pass
    return ips or ["127.0.0.1"]
def main():
    ap=argparse.ArgumentParser(description="WarTab Server")
    ap.add_argument("--port","-p",type=int,default=8080); ap.add_argument("--bind","-b",default="0.0.0.0"); ap.add_argument("--open","-o",action="store_true"); ap.add_argument("--mdns",action="store_true")
    a=ap.parse_args()
    server=http.server.HTTPServer((a.bind,a.port),WarTabHandler); server.server_name="WarTab"
    print(f"\n  WarTab Server\n  ----")
    print(f"  Local:    http://localhost:{a.port}")
    for ip in get_local_ips(): print(f"  Network:  http://{ip}:{a.port}")
    print("  ----\n  Ctrl+C to stop\n")
    if a.open: webbrowser.open(f"http://localhost:{a.port}")
    try: server.serve_forever()
    except KeyboardInterrupt: print("\n  Stopping..."); server.server_close(); sys.exit(0)
if __name__=="__main__": main()

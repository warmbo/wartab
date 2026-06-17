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

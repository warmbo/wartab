#!/usr/bin/env python3
"""Batch download all selfhst SVG icons locally."""
import json, os, sys, time, urllib.request, urllib.error
from pathlib import Path

HERE = Path(__file__).parent.resolve()
ICONS = HERE / "icons"
ICONS.mkdir(exist_ok=True)
MANIFEST_URL = "https://raw.githubusercontent.com/selfhst/icons/main/index.json"
CDN_BASE = "https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg"

print("Downloading icon manifest...")
try:
    req = urllib.request.Request(MANIFEST_URL, headers={"User-Agent": "WarTab/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
except Exception as e:
    print(f"Failed to download manifest: {e}")
    sys.exit(1)

print(f"Manifest has {len(data)} entries")
# Filter to entries with SVG available
svgs = [item for item in data if item.get("SVG") == "Yes"]
print(f"{len(svgs)} icons have SVG format")

downloaded = 0
skipped = 0
failed = 0

for item in svgs:
    ref = item.get("Reference", "").strip()
    if not ref:
        skipped += 1
        continue
    # Sanitize filename
    safe = "".join(c for c in ref if c.isalnum() or c in "-_.").lower()
    if not safe:
        skipped += 1
        continue
    safe = safe.rstrip(".") + ".svg"
    out_path = ICONS / safe
    if out_path.exists():
        skipped += 1
        continue
    url = f"{CDN_BASE}/{ref}.svg"
    try:
        req2 = urllib.request.Request(url, headers={"User-Agent": "WarTab/1.0"})
        with urllib.request.urlopen(req2, timeout=15) as resp2:
            svg_data = resp2.read()
        with open(out_path, "wb") as f:
            f.write(svg_data)
        downloaded += 1
        if downloaded % 50 == 0:
            print(f"  ... {downloaded} downloaded")
    except Exception as e:
        failed += 1
        if failed <= 5:
            print(f"  FAILED {ref}: {e}")
    # Small delay to be friendly to CDN
    time.sleep(0.05)

print(f"\nDone! {downloaded} downloaded, {skipped} skipped, {failed} failed")

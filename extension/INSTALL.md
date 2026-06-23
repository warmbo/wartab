# WarTab Browser Extension — Installation Guide

## Chrome

1. Download `wartab-chrome-v0.2.1.zip` from the [releases page](https://github.com/warmbo/wartab/releases)
2. Unzip to a permanent location (don't delete this folder — Chrome reads from it)
   ```bash
   unzip wartab-chrome-v0.2.1.zip -d ~/wartab-chrome
   ```
3. Open `chrome://extensions`
4. Enable **Developer mode** (toggle in top-right corner)
5. Click **Load unpacked**
6. Select the unzipped folder (e.g. `~/wartab-chrome`)
7. Open a new tab — WarTab is live

> To update: download a new ZIP, unzip over the old folder, and click the refresh icon on the extension card in `chrome://extensions`.

## Edge

1. Download `wartab-edge-v0.2.1.zip`
2. Unzip to a permanent location:
   ```bash
   unzip wartab-edge-v0.2.1.zip -d ~/wartab-edge
   ```
3. Open `edge://extensions`
4. Enable **Developer mode** (toggle bottom-left)
5. Click **Load unpacked**
6. Select the unzipped folder
7. Open a new tab — WarTab is live

Edge also accepts Chrome extensions directly. You can upload `wartab-chrome-v0.2.1.zip` to the [Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/) store using their "Import from Chrome" feature.

## Firefox

1. Download `wartab-firefox-v0.2.1.zip`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select the ZIP file (or any file inside it — Firefox detects the manifest)
5. Open a new tab — WarTab is live

> **Note:** Temporary add-ons only last for the current session. For permanent installation, the add-on must be signed by Mozilla. See [Extension Workshop](https://extensionworkshop.com/) for submitting to addons.mozilla.org.

## Building from source

```bash
git clone https://github.com/warmbo/wartab.git
cd wartab
git checkout extension
bash extension/build.sh all
# → dist/wartab-{chrome,edge,firefox}-v0.2.1.zip
```

## First run tips

- **Configure your dashboard** — click the ⚙️ gear icon in the top bar to open settings
- **Add cards** — click the ➕ button to add new cards with various section types
- **Manage pages** — click the 📋 list button to create multiple dashboard pages
- **Icons** — 2000+ Lucide icons and 350+ self-hosted service logos available in the icon picker
- **Config syncs** — dashboard config is stored in `chrome.storage.sync`, so it follows your Google account across devices

## Features that require the self-hosted server

The extension is fully self-contained, but a few advanced features depend on `server.py` running on your network:

| Feature | Extension | With server |
|---------|:---------:|:-----------:|
| LAN scan | ❌ "requires server" | ✅ ARP table scan |
| API proxy | ❌ not available | ✅ CORS bypass |
| System ping/cert/docker | ❌ not available | ✅ via server endpoints |

Everything else — links, search, clock, weather, iframe, notes, quotes, media, proxmox, git, API poller, resource monitor, timer, and all visual features — works identically.

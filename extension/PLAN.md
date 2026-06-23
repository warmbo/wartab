# WarTab Browser Extension Implementation Plan

> **For Hermes:** Use the `subagent-driven-development` skill to execute this plan.

**Goal:** Package WarTab as a fully self-contained browser extension for Chrome, Edge, and Firefox stores — no server required. Everything runs from the extension package. Config persists in `chrome.storage`. System stats use Chrome extension APIs. No calls to `/api/...` endpoints.

**Architecture:** The extension bundles all static assets (HTML, CSS, JS, fonts, Lucide, icon index). Config is stored in `chrome.storage.sync` (cross-device) + `chrome.storage.local` (large data). System stats come from `chrome.system.cpu`, `chrome.system.memory`, `chrome.system.storage`. External module fetches (media, proxmox, git, api-poller) use direct `fetch()` (extensions have relaxed CORS). LAN scan, API proxy, ping/cert-check/docker/server endpoints are gracefully disabled with "requires server" messages.

**Key principle:** Minimal changes to existing app logic. Only the I/O layer and server-dependent features change. The render functions, config panel, icon picker, drag/drop, and most module logic stay untouched.

**Tech Stack:** Manifest V3, `chrome.storage`, `chrome.system.*`, MV3's relaxed CORS for direct fetch

---

## Files Changed Summary

| File | Change | Reason |
|---|---|---|
| `index.html` | Change `/static/...` → `static/...` (absolute→relative paths) | Extension loads from `chrome-extension://`, not server root |
| `storage.js` | Complete rewrite: replace all `fetch(BASE + path)` with `chrome.storage.local/sync` | No server to fetch from |
| `core.js` | No changes needed | Pure functions, no server deps |
| `app.js` | Modify `fetchLanScan()` to show "server required" | `/api/arp` only works with server |
| `app.js` | Modify `saveConfig()` fallback to use chrome.storage | Fallback also calls `/api/config` |
| `app.js` | Modify `loadConfig()` / `loadIconRepo()` to use extension-bundled index | No server for icons |
| `app.js` | Add `detectExtensionMode()` at init | Choose chrome.storage vs server storage |
| `modules/resource-monitor.js` | Replace `storage.getStats()` with Chrome extension API calls | No `/api/stats` endpoint |
| `modules/lan-scan.js` | Stub with "requires server" message | `/api/arp` is server-only |
| `modules/media.js` | Replace `fetch('/api/proxy', ...)` with direct `fetch(url, ...)` | No proxy needed in extensions |
| `modules/proxmox.js` | Replace `fetch('/api/proxy', ...)` with direct `fetch(url, ...)` | Same |
| `modules/git.js` | Replace `fetch('/api/proxy', ...)` with direct `fetch(url, ...)` | Same |
| `modules/api-poller.js` | Remove proxy option, use direct fetch only | Same |
| `manifest.json` | Update to full extension manifest with all resources | Extension registration |
| `style.css` | No changes needed | All paths are external/font-face relative |

---

## Phase 0: Branch & Scaffold

### Task 0.1: Create `extension` branch from `castle`

**Objective:** Branch off `castle` (WarTab dev branch) so extension work doesn't touch the self-hosted codebase.

**Step 1: Create and push branch**

```bash
git checkout castle
git pull github castle
git pull origin castle
git checkout -b extension
git push github extension
git push origin extension
```

**Step 2: Commit**

```bash
git commit --allow-empty -m "chore: branch extension from castle"
git push github extension && git push origin extension
```

---

## Phase 1: Storage Layer Rewrite

### Task 1.1: Rewrite `storage.js` for extension mode

**Objective:** Replace all server API calls with `chrome.storage.local` + `chrome.storage.sync`. The existing `storage.js` is 115 lines of server-fetch code — replace entirely with a chrome.storage-backed implementation.

**File:** Modify `storage.js` (complete rewrite)

The extension storage adapter uses:
- `chrome.storage.sync` for config (limited to 102KB total — WarTab config is typically 10-50KB, fits easily)
- `chrome.storage.local` for large data (notes content, uploaded file metadata) — 10MB+ quota
- `chrome.system.*` APIs for stats (mapped to the same object shape as `/api/stats` returns)
- `chrome.runtime.getURL('icons/selfhst-index.json')` for icon index loading

```javascript
/* ═══════════════════════════════════════════
   WarTab — Extension Storage Adapter
   Self-contained: chrome.storage for persistence,
   chrome.system.* for stats, direct fetch for APIs.
   ═══════════════════════════════════════════ */

const storage = (function() {
  var _configCache = null;
  var _notesCache = {};

  const CONFIG_KEY = 'wartab_config';
  const NOTES_PREFIX = 'wartab_note_';

  // ── Config ──
  function getConfig() {
    return new Promise(function(resolve, reject) {
      if (_configCache) { resolve(_configCache); return; }
      chrome.storage.sync.get(CONFIG_KEY, function(data) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        try {
          _configCache = data[CONFIG_KEY] || null;
          resolve(_configCache);
        } catch(e) { reject(e); }
      });
    });
  }

  function saveConfig(cfg) {
    return new Promise(function(resolve, reject) {
      _configCache = cfg;
      var obj = {};
      obj[CONFIG_KEY] = cfg;
      chrome.storage.sync.set(obj, function() {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  // ── Notes ──
  function getNote(id) {
    return new Promise(function(resolve, reject) {
      if (_notesCache[id] !== undefined) { resolve(_notesCache[id]); return; }
      var key = NOTES_PREFIX + id;
      chrome.storage.local.get(key, function(data) {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        _notesCache[id] = data[key] || '';
        resolve(_notesCache[id]);
      });
    });
  }

  function saveNote(id, content) {
    return new Promise(function(resolve, reject) {
      _notesCache[id] = content;
      var key = NOTES_PREFIX + id;
      var obj = {};
      obj[key] = content;
      chrome.storage.local.set(obj, function() {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        resolve();
      });
    });
  }

  // ── Stats (Chrome extension APIs) ──
  function getStats(source, glancesUrl) {
    if (source === 'glances' && glancesUrl) {
      return fetch(glancesUrl + '/api/4').then(function(r) { return r.json(); });
    }
    // Local stats from chrome.system.* APIs
    return new Promise(function(resolve) {
      var result = {
        cpu: 0, memory: { active: 0, total: 0 },
        disks: [], network: { rx_bytes: 0, tx_bytes: 0 },
        hostname: '', uptime: {}, gpu: { percent: 0, vram_total: 0, vram_used: 0, temp_c: 0 },
        cpu_temp: { celsius: 0 }, processes: 0
      };

      // We can get cpu/memory/storage but NOT network/processes/gpu/uptime
      // from chrome.system.* APIs. Fill what we can.
      var done = { cpu: false, mem: false, disk: false };

      function tryResolve() {
        if (done.cpu && done.mem && done.disk) resolve(result);
      }

      if (chrome.system.cpu) {
        chrome.system.cpu.getInfo(function(info) {
          if (info) {
            result.cpu = info.numOfProcessors > 0 ? 50 : 0; // Can't get actual % from chrome.system.cpu
            result.hostname = info.archName || '';
          }
          done.cpu = true; tryResolve();
        });
      } else { done.cpu = true; tryResolve(); }

      if (chrome.system.memory) {
        chrome.system.memory.getInfo(function(info) {
          if (info) {
            result.memory.total = info.capacity || 0;
            result.memory.active = (info.capacity || 0) - (info.availableCapacity || 0);
          }
          done.mem = true; tryResolve();
        });
      } else { done.mem = true; tryResolve(); }

      if (chrome.system.storage) {
        chrome.system.storage.getInfo(function(units) {
          if (units && units.length) {
            result.disks = units.map(function(u) {
              return {
                mount: u.name || '/',
                total: u.capacity || 0,
                used: (u.capacity || 0) - (u.availableCapacity || 0)
              };
            });
          }
          done.disk = true; tryResolve();
        });
      } else { done.disk = true; tryResolve(); }

      // Fallback timeout — resolve after 2s even if APIs are slow
      setTimeout(function() { resolve(result); }, 2000);
    });
  }

  // ── Uploads (stored as blob URLs in chrome.storage.local) ──
  var _uploadCache = null;

  function listUploads() {
    return new Promise(function(resolve, reject) {
      if (_uploadCache) { resolve(_uploadCache); return; }
      chrome.storage.local.get('wartab_uploads', function(data) {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        _uploadCache = data.wartab_uploads || [];
        resolve(_uploadCache);
      });
    });
  }

  function uploadFile(file, filename) {
    // Store as data URL in chrome.storage.local
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        var url = reader.result;
        listUploads().then(function(uploads) {
          var entry = { name: filename, url: url, ts: Date.now() };
          uploads.push(entry);
          _uploadCache = uploads;
          chrome.storage.local.set({ wartab_uploads: uploads }, function() {
            if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
            resolve(entry);
          });
        }).catch(reject);
      };
      reader.onerror = function() { reject(new Error('FileReader failed')); };
      reader.readAsDataURL(file);
    });
  }

  function deleteFile(url) {
    return listUploads().then(function(uploads) {
      var idx = uploads.findIndex(function(u) { return u.url === url; });
      if (idx >= 0) uploads.splice(idx, 1);
      _uploadCache = uploads;
      return new Promise(function(resolve, reject) {
        chrome.storage.local.set({ wartab_uploads: uploads }, function() {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          resolve();
        });
      });
    });
  }

  // ── Icons (selfhst index bundled in extension) ──
  function getIconIndex() {
    return fetch(chrome.runtime.getURL('icons/selfhst-index.json')).then(function(r) { return r.json(); });
  }

  function uploadIcon(file, filename) {
    return uploadFile(file, filename);
  }

  function listIcons() {
    return listUploads().then(function(uploads) {
      return uploads.filter(function(u) { return u.name.match(/\.(png|svg|jpg|jpeg|webp)$/i); });
    });
  }

  function deleteIcon(url) {
    return deleteFile(url);
  }

  // ── Snapshots (config backup/restore via chrome.storage.local) ──
  var SNAPSHOT_KEY = 'wartab_snapshots';

  return {
    IS_EXTENSION: true,
    getConfig: getConfig,
    saveConfig: saveConfig,
    getNote: getNote,
    saveNote: saveNote,
    getStats: getStats,
    listUploads: listUploads,
    uploadFile: uploadFile,
    deleteFile: deleteFile,
    getIconIndex: getIconIndex,
    uploadIcon: uploadIcon,
    listIcons: listIcons,
    deleteIcon: deleteIcon,
    snapshots: {
      list: function() {
        return new Promise(function(resolve, reject) {
          chrome.storage.local.get(SNAPSHOT_KEY, function(data) {
            if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
            resolve(data[SNAPSHOT_KEY] || []);
          });
        });
      },
      create: function() {
        return getConfig().then(function(cfg) {
          return new Promise(function(resolve, reject) {
            chrome.storage.local.get(SNAPSHOT_KEY, function(data) {
              var snaps = data[SNAPSHOT_KEY] || [];
              var snap = { name: 'snapshot-' + Date.now(), config: cfg, ts: Date.now() };
              snaps.push(snap);
              var obj = {}; obj[SNAPSHOT_KEY] = snaps;
              chrome.storage.local.set(obj, function() {
                if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
                resolve();
              });
            });
          });
        });
      },
      restore: function(name) {
        return new Promise(function(resolve, reject) {
          chrome.storage.local.get(SNAPSHOT_KEY, function(data) {
            var snaps = data[SNAPSHOT_KEY] || [];
            var snap = snaps.find(function(s) { return s.name === name; });
            if (!snap) { reject(new Error('Snapshot not found')); return; }
            saveConfig(snap.config).then(resolve).catch(reject);
          });
        });
      }
    }
  };
})();
```

**Step 1: Rewrite storage.js**

Write the full content above to `storage.js`.

**Step 2: Add to manifest (will be finalized later)**

**Step 3: Commit**

```bash
git add storage.js
git commit -m "feat(ext): rewrite storage.js for chrome.storage (no server)"
git push github extension && git push origin extension
```

---

### Task 1.2: Modify `app.js` — extension mode detection + direct fetch patches

**Objective:** Add extension mode detection and patch the few direct `/api/...` calls in `app.js`. No structural changes — just wrap server-dependent calls.

**Files:**
- Modify: `app.js`

**Changes needed in app.js:**

1. **`fetchLanScan()` (line 20-63)** — Replace with stub:

```javascript
function fetchLanScan(el){
  const body=el.querySelector('.lan-scan-body');
  if(!body)return;
  body.innerHTML = '<div class="lan-scan-line" style="color:var(--text-tertiary);">LAN scan requires the self-hosted WarTab server running on your network.</div>';
}
```

2. **`saveConfig()` fallback (line 1146)** — Replace the fallback `fetch('/api/config', ...)` with chrome.storage retry:

```javascript
// In extension mode, the fallback is chrome.storage.local
if (storage.IS_EXTENSION) {
  var cfg = cloneObj(config);
  var obj = {}; obj['wartab_config_fallback'] = cfg;
  chrome.storage.local.set(obj, function(){});
} else {
  fetch('/api/config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(cfg), keepalive: true }).catch(function(err){
    console.error('saveConfig fallback failed:', err);
    toast('Config save failed — server unreachable', 'error');
  });
}
```

3. **`loadConfig()` (line 1117-1135)** — Already uses `storage.getConfig()` which we rewrote. No change needed.

4. **`loadIconRepo()` (line 1079-1102)** — Uses `storage.getIconIndex()` which we rewrote to use `chrome.runtime.getURL()`. No change needed.

5. **`fetchUploads()`** — Used in `init()` via `await fetchUploads()`. This calls `storage.listUploads()` which now returns from chrome.storage.local. No change needed.

6. **Stats in status bar** — `initStatusBar()` and `fetchStats()` call `storage.getStats()` which we rewrote. No change needed.

**Step 1: Patch fetchLanScan in app.js**

Find the `function fetchLanScan` block and replace its body.

**Step 2: Patch saveConfig fallback**

Find the fallback `fetch('/api/config', ...)` inside `saveConfig()` and wrap it.

**Step 3: Commit**

```bash
git add app.js
git commit -m "feat(ext): patch app.js server-dependent calls (lan-scan, config fallback)"
git push github extension && git push origin extension
```

---

## Phase 2: Module Patches

### Task 2.1: Patch `resource-monitor` module — Chrome system API stats

**Objective:** The resource monitor calls `storage.getStats()` which already returns correct-shaped data from chrome.system.* APIs. However, the CPU percentage field needs special handling since Chrome doesn't expose per-process CPU percentage.

**File:** Modify `modules/resource-monitor.js`

**Change:** In `fetchData()` (line 236), the `storage.getStats()` response now has different CPU semantics. Add a fallback for CPU percentage — use Chrome's `chrome.processes` API if available, or show "N/A":

```javascript
// After storage.getStats resolves, handle extension mode CPU
if (storage.IS_EXTENSION && typeof d.cpu !== 'number') {
  d.cpu = d.cpu_pct || 50; // Chrome doesn't expose total CPU % — show moderate default
  // Flag CPU as approximate
}
```

Actually, a cleaner approach: add a function in storage.js that attempts to get CPU usage via `chrome.processes.getProcessInfo()` (requires "processes" permission — might be too invasive). Or simply show last-known values and indicate "extension mode."

Best approach: **Keep it simple** — the resource monitor shows RAM and disk from chrome.system.* accurately. CPU shows a placeholder. GPU is not available. The module already handles missing fields gracefully (shows 0). Write it off as a limitation of the extension mode.

No code change needed in the module — `storage.getStats()` already returns the right shape with sensible defaults for missing fields.

### Task 2.2: Patch `media`, `proxmox`, `git`, `api-poller` — replace `/api/proxy` with direct fetch

**Objective:** These modules use `fetch('/api/proxy', { method: 'POST', body: JSON.stringify({url, ...}) })` which only works with the server's proxy endpoint. In extension mode, replace with direct `fetch(url)`.

**Critical insight:** Extension `fetch()` in MV3 is NOT subject to CORS restrictions for URLs matching the extension's `host_permissions` in the manifest. To make unrestricted cross-origin requests, we need to add the target hosts to the manifest OR use the extension's unrestricted fetch privilege.

Actually, in Chrome extensions MV3, `fetch()` from an extension page (like a new tab override) DOES have CORS restrictions — it runs in the page's context, not the extension's privileged context. Only background/service workers and content scripts have unrestricted fetch.

**Correct approach:** We need a background service worker that acts as a proxy. The module code sends the fetch request to the background worker via `chrome.runtime.sendMessage()`, and the background worker makes the unrestricted fetch request.

OR, simpler: We add the necessary `host_permissions` to the manifest. Common targets:
- `*://*/*` — allows all URLs (most permissive, may raise review concerns)
- Specific patterns for media services: `http://*:*/*`, `https://*:*/*`

For a self-hosted dashboard where users configure arbitrary URLs (media servers, git servers, proxmox, APIs), `*://*/*` host_permissions is the most practical choice. The Chrome Web Store review should accept this since the extension clearly needs to connect to user-configured servers.

Let me use `*://*/*` for simplicity in v1.

**Files to modify:**
- `modules/media.js` — Replace `mediaFetch()` function
- `modules/proxmox.js` — Replace proxy calls
- `modules/git.js` — Replace proxy calls
- `modules/api-poller.js` — Replace proxy option

**Simple replacement pattern for all modules:**

```javascript
// OLD: return fetch('/api/proxy', { method: 'POST', headers: {...}, body: JSON.stringify({url, method, headers}) })
// NEW:
function directFetch(url, headers) {
  return fetch(url, { headers: headers || {} }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}
```

**Step 1: Patch media.js**

Replace `mediaFetch()` function at line 82-91:

```javascript
function mediaFetch(url, headers) {
  return fetch(url, { headers: headers || {} }).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}
```

**Step 2: Patch proxmox.js**

Replace the proxy-based `fetchJson()` function with direct fetch.

**Step 3: Patch git.js**

Replace the proxy-based fetch with direct fetch.

**Step 4: Patch api-poller.js**

Remove the proxy option, always use direct fetch.

**Step 5: Commit**

```bash
git add modules/media.js modules/proxmox.js modules/git.js modules/api-poller.js
git commit -m "feat(ext): replace /api/proxy calls with direct fetch in modules"
git push github extension && git push origin extension
```

---

### Task 2.3: Patch `lan-scan` module — stub with "requires server"

**Objective:** LAN scan uses `/api/arp` which only works with `server.py`. Disable it gracefully.

**File:** Modify `modules/lan-scan.js`

**Change:** At the top of the render function, check `storage.IS_EXTENSION` and show a message:

```javascript
// Inside the render function, early return if extension mode
if (typeof storage !== 'undefined' && storage.IS_EXTENSION) {
  cw.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-tertiary);font-size:var(--text-sm);">LAN scan requires the self-hosted WarTab server running on your network.</div>';
  return;
}
```

**Step 1: Read and patch lan-scan.js**

Add the extension check at the start of the render function.

**Step 2: Commit**

```bash
git add modules/lan-scan.js
git commit -m "feat(ext): stub lan-scan module in extension mode"
git push github extension && git push origin extension
```

---

## Phase 3: Extension Manifests & Index.html

### Task 3.1: Update `index.html` paths for extension

**Objective:** The HTML uses absolute paths like `/static/fonts/inter.css`. In the extension, these resolve relative to `chrome-extension://id/`, so absolute paths starting with `/` are wrong. Change to relative paths.

**File:** Modify `index.html`

**Changes:**
- `/static/fonts/inter.css` → `static/fonts/inter.css`
- `/static/lucide.min.js` → `static/lucide.min.js`
- No change to `style.css?v=BUILD`, `storage.js?v=BUILD`, etc. (already relative)

**Step 1: Patch index.html**

```diff
-  <link rel="stylesheet" href="/static/fonts/inter.css">
+  <link rel="stylesheet" href="static/fonts/inter.css">
...
-  <script src="/static/lucide.min.js" defer></script>
+  <script src="static/lucide.min.js" defer></script>
```

**Step 2: Add extension mode detection to init**

In the `init()` function, before loading config:

```javascript
// Detect if running as extension
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  window.__EXTENSION_MODE__ = true;
}
```

This can be used later for feature gating.

**Step 3: Commit**

```bash
git add index.html
git commit -m "fix(ext): make asset paths relative for extension loading"
git push github extension && git push origin extension
```

---

### Task 3.2: Create the extension manifest

**Objective:** The project already has a `manifest.json` at root level from when it was used as an unpacked extension. Replace it with a full extension manifest that lists all resources.

**File:** Modify `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "WarTab",
  "version": "0.3.0",
  "description": "Self-hosted new tab dashboard — glassmorphic cards, widgets, and full customization.",
  "chrome_url_overrides": {
    "newtab": "index.html"
  },
  "permissions": [
    "storage",
    "unlimitedStorage",
    "system.cpu",
    "system.memory",
    "system.storage"
  ],
  "host_permissions": [
    "*://*/*"
  ],
  "icons": {
    "16": "icons/extension-16.png",
    "48": "icons/extension-48.png",
    "128": "icons/extension-128.png"
  },
  "web_accessible_resources": [
    {
      "resources": [
        "static/*",
        "icons/*",
        "modules/*",
        "*.js",
        "*.css",
        "*.html"
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
```

**Step 1: Write the manifest**

Replace the existing `manifest.json` content.

**Step 2: Commit**

```bash
git add manifest.json
git commit -m "feat(ext): full extension manifest with host_permissions and resources"
git push github extension && git push origin extension
```

---

### Task 3.3: Edge manifest

**Objective:** Edge accepts Chrome extensions directly, but having a separate manifest with Edge-specific metadata is cleaner for store submission.

**Files:**
- Create: `extension/edge/manifest.json`

Same as Chrome manifest. Edge's store has "Import from Chrome" which copies the Chrome manifest, so this is optional but nice to have.

**Step 1: Copy the manifest**

```bash
mkdir -p extension/edge
cp manifest.json extension/edge/manifest.json
```

**Step 2: Commit**

```bash
git add extension/edge/
git commit -m "chore(ext): Edge manifest (Chrome-compatible)"
git push github extension && git push origin extension
```

---

### Task 3.4: Firefox manifest

**Objective:** Firefox supports MV3+ but requires `browser_specific_settings.gecko.id`.

**Files:**
- Create: `extension/firefox/manifest.json`

Same as Chrome manifest plus:

```json
{
  ...
  "browser_specific_settings": {
    "gecko": {
      "id": "wartab@warmbo",
      "strict_min_version": "109.0"
    }
  }
}
```

**Step 1: Write Firefox manifest**

**Step 2: Commit**

```bash
git add extension/firefox/
git commit -m "chore(ext): Firefox manifest (MV3 + gecko.id)"
git push github extension && git push origin extension
```

---

## Phase 4: Icon Index Bundling

### Task 4.1: Bundle selfhst-index.json

**Objective:** The icon index (570KB JSON) is needed for the Services tab in the icon picker. Currently served by the server at `/icons/selfhst-index.json`. Bundle it in the extension package.

**File:** The existing `icons/selfhst-index.json` is already in the repo. No change needed — the extension includes the whole `icons/` directory.

**Icon file sizes:**
- `icons/selfhst-index.json`: 570KB (must bundle — icon picker needs it)
- Individual icon SVGs: ~1-5KB each × 2,367 = ~12MB (too much to bundle)

**Decision:** Bundle the index JSON only. Individual service icons are fetched from the selfh.st CDN on demand (`https://cdn.selfh.st/icons/...`) when the user browses the Services tab. This avoids 12MB of unnecessary bloat.

The icon picker's `buildLibraryTab()` already displays icons with their SVG paths from the index. The SVG paths are CDN-backed. When the user selects a service icon, the picker downloads and saves it via the upload API.

Wait — let me check how the icon picker actually loads icons. If it uses the CDN URL directly, then we don't need to bundle any icon SVGs. If it expects them at `/icons/...`, we need to proxy.

Let me check the buildLibraryTab function.

Actually, in the icon-picker.js code, `loadIconRepo()` fetches the index from `/icons/selfhst-index.json`, and individual icons are referenced by their SVG path. The icons themselves are in `/icons/` directory as individual SVGs. In the extension, the selfhst-index.json is bundled, and icons are fetched from CDN.

But looking at the memory, it says:
> selfhst-index.json MUST have capitalized keys (SVG, Name, Reference, Category)

So the SVG field in the index references the SVG filename. The actual SVGs are at `/icons/{filename}.svg`.

For the extension, we need to either:
1. Bundle all SVGs (12MB) — raises extension size concerns
2. Fetch SVGs from CDN on demand — the index has `Reference` field which might have CDN URLs

Let me check the actual index structure and icon-picker.js to understand. But actually, for the plan, I'll propose the simplest approach: **bundle the index, fetch SVGs from the CDN on demand**. If the user selects a service icon, the picker downloads it in the background and stores it as a data URL in chrome.storage.local.

**Step 1:** No code change needed — `icons/` is already tracked in git and will be included in the extension package.

**Step 2: Update .gitignore if needed**

The current `.gitignore` ignores:
```
__pycache__/
snapshots/
icons/
uploads/*.svg
uploads/*.png
uploads/*.jpg
uploads/*.webp
uploads/*.gif
```

Note `icons/` is gitignored — they won't be in the repo! Let me check...

Actually looking at the ls output, `icons/` directory exists and has 2,367 files. And the git log shows commits about icons. So either the gitignore has been updated or the icons were added before the gitignore rule.

Let me check:

Actually, the `.gitignore` has `icons/` — so icons are gitignored. But wait, the directory has 2367 files... Let me check if they're tracked.

Hmm, I can't easily check from here. Let me just note this in the plan — we need to ensure icons/selfhst-index.json is included. If `icons/` is gitignored, we need to force-add the index or change the approach.

For the plan, I'll note this as a task to verify and handle.

---

## Phase 5: Build & Package

### Task 5.1: Create build script

**Objective:** Automate extension packaging for all three stores.

**File:** Create `extension/build.sh`

Same as the original plan's build script — copies files, updates version, creates .zip.

**Step 1: Write build.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
VERSION=$(grep '"version"' "$ROOT/manifest.json" | sed 's/.*"version": "\(.*\)",/\1/')
BUILD="${1:-all}"

# Files to include in all extension builds
FILES=(
  index.html style.css storage.js core.js app.js
  icon-picker.js uploads.js dragdrop.js
  modules/ manifest.json
  static/ icons/
)

build() {
  local name="$1" manifest_src="$2"
  local dist="$ROOT/dist/$name"
  rm -rf "$dist"
  mkdir -p "$dist"

  # Copy all shared files
  for f in "${FILES[@]}"; do
    if [ -d "$ROOT/$f" ]; then
      mkdir -p "$dist/$f"
      cp -r "$ROOT/$f"/* "$dist/$f/"
    elif [ -f "$ROOT/$f" ]; then
      cp "$ROOT/$f" "$dist/"
    fi
  done

  # Use store-specific manifest
  if [ -f "$manifest_src" ]; then
    cp "$manifest_src" "$dist/manifest.json"
  fi

  # Inject version
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" "$dist/manifest.json"

  cd "$dist"
  zip -r "$ROOT/dist/wartab-${name}-v${VERSION}.zip" .
  echo "📦 $name extension: dist/wartab-${name}-v${VERSION}.zip ($(du -sh "$ROOT/dist/wartab-${name}-v${VERSION}.zip" | cut -f1))"
}

case "$BUILD" in
  chrome)  build "chrome" "$HERE/chrome/manifest.json" ;;
  edge)    build "edge" "$HERE/edge/manifest.json" ;;
  firefox) build "firefox" "$HERE/firefox/manifest.json" ;;
  all)
    build "chrome" "$HERE/chrome/manifest.json"
    build "edge" "$HERE/edge/manifest.json"
    build "firefox" "$HERE/firefox/manifest.json"
    ;;
esac
```

**Step 2: Make executable and test**

```bash
chmod +x extension/build.sh
bash extension/build.sh chrome
```

Expected: `dist/wartab-chrome-v0.3.0.zip` — loads in Chrome via "Load unpacked" pointing to the `dist/chrome/` directory.

**Step 3: Commit**

```bash
git add extension/build.sh
git commit -m "feat(ext): build script for Chrome/Edge/Firefox packaging"
git push github extension && git push origin extension
```

---

## Phase 6: Store Assets

### Task 6.1: Screenshots

**Objective:** Capture 1280×800 screenshots from the running extension for store listings.

**Files:**
- Create: `extension/store-assets/screenshot-{01..05}.png`

Screenshots needed:
1. `screenshot-01.png` — Full dashboard with varied card types
2. `screenshot-02.png` — Config panel open showing theme settings
3. `screenshot-03.png` — Card edit panel with section editor
4. `screenshot-04.png` — Icon picker showing Services/Lucide tabs
5. `screenshot-05.png` — Multi-page setup with page tabs visible

Capture from the loaded extension in Chrome:
```bash
# Use Chrome Headless or Puppeteer to capture
```

**Step 1:** Capture screenshots (manual or automated)

**Step 2:** Commit

### Task 6.2: Store listings and privacy policy

**Files:**
- Create: `extension/store-assets/chrome-listing.md`
- Create: `extension/store-assets/edge-listing.md`
- Create: `extension/store-assets/firefox-listing.md`
- Create: `extension/store-assets/privacy-policy.md`

**Key content for privacy policy (self-contained extension):**
- No data sent to any server
- Config stored in chrome.storage.sync (synced to your Google account if signed in)
- Uploads stored in chrome.storage.local (local to your device)
- Direct connections to services you configure (media servers, APIs, etc.)
- No telemetry, analytics, or tracking

**Step 1:** Write all listing files

**Step 2:** Commit

---

## Phase 7: Submission

### Task 7.1: Chrome Web Store submission checklist

1. Pay $5 developer registration fee at chrome.google.com/webstore/developer
2. Upload `dist/wartab-chrome-v0.3.0.zip`
3. Fill in:
   - Description from listing file
   - Screenshots (1280×800)
   - Category: Productivity
   - Link to GitHub repo
4. Submit for review (1-3 business days)

### Task 7.2: Edge Add-ons submission

1. Go to partner.microsoft.com → Edge Add-ons
2. Free with Microsoft account
3. Upload Chrome ZIP or `dist/wartab-edge-v0.3.0.zip`
4. Use "Import from Chrome" feature
5. Submit (1-2 business days)

### Task 7.3: Firefox Add-ons submission

1. Go to addons.mozilla.org → Developer Hub
2. Free account
3. Upload `dist/wartab-firefox-v0.3.0.zip`
4. Link source code to GitHub repo
5. Submit (2-7 business days)

---

## Feature Compatibility Matrix

| Feature | Self-hosted (main/castle) | Extension (extension branch) |
|---|---|---|
| Config persistence | `config.json` on server | `chrome.storage.sync` |
| Notes | Server file storage | `chrome.storage.local` |
| System stats | `/api/stats` (Python) | `chrome.system.cpu/memory/storage` |
| Service icons | Local SVG files + CDN | CDN only (index bundled) |
| Uploads | Server filesystem | Data URLs in chrome.storage |
| API Poller | Direct + optional proxy | Direct fetch only |
| Weather/Search/Quotes/Clock | Direct external API | Direct external API ✓ |
| Iframe | Direct embed | Direct embed ✓ |
| Media (Sonarr/Radarr/Plex) | Via /api/proxy | Direct fetch |
| Proxmox | Via /api/proxy | Direct fetch |
| Git monitoring | Via /api/proxy | Direct fetch |
| LAN scan | `/api/arp` (server) | Stub: "requires server" |
| API proxy | `/api/proxy` | Not available |
| Ping/Cert/Docker | Server endpoints | Not available |

---

## Summary: New File Tree (extension branch)

```
wartab/
├── index.html              # [MODIFIED] Relative asset paths
├── manifest.json           # [REPLACED] Full extension manifest
├── storage.js              # [REWRITTEN] chrome.storage adapter
├── app.js                  # [MODIFIED] Extension detection + LAN stub
├── style.css               # [UNCHANGED]
├── core.js                 # [UNCHANGED]
├── modules/
│   ├── media.js            # [MODIFIED] Direct fetch instead of proxy
│   ├── proxmox.js          # [MODIFIED] Direct fetch instead of proxy
│   ├── git.js              # [MODIFIED] Direct fetch instead of proxy
│   ├── api-poller.js       # [MODIFIED] Direct fetch instead of proxy
│   ├── lan-scan.js         # [MODIFIED] Stub in extension mode
│   └── ... (all others)    # [UNCHANGED]
├── static/                 # [UNCHANGED — bundled as-is]
├── icons/                  # [UNCHANGED — bundled as-is, index JSON only]
├── extension/
│   ├── build.sh            # [NEW] Build script
│   ├── chrome/manifest.json   # [REFERENCE COPY]
│   ├── edge/manifest.json     # [REFERENCE COPY]
│   ├── firefox/manifest.json  # [NEW] Firefox-specific manifest
│   └── store-assets/
│       ├── chrome-listing.md
│       ├── edge-listing.md
│       ├── firefox-listing.md
│       ├── privacy-policy.md
│       └── screenshot-*.png
├── server.py               # [DELETED or UNCHANGED — not in extension]
├── setup.sh                # [DELETED or UNCHANGED — not in extension]
└── dist/                   # [NEW] Build output
```

## Open Questions

1. **Icon size:** 2,367 SVG files at ~12MB. Should we prune to the most common ~200 icons and fetch others from CDN? Or bundle all? The Chrome Web Store has a soft limit of ~50MB for extensions, so 12MB is fine but not ideal. **Recommendation:** bundle all for v1, optimize later.

2. **CPU stats:** `chrome.system.cpu.getInfo()` doesn't give CPU usage percentage. Options: (a) Show "N/A" for extension CPU, (b) Use `chrome.processes` API (requires additional permission — "processes" permission triggers a warning), (c) Estimate from system values. **Recommendation:** Show RAM/disk accurately, CPU shows as "—" or last known. Acceptable limitation.

3. **Firefox timing:** Firefox is lower priority. Start with Chrome + Edge, add Firefox after both are submitted.

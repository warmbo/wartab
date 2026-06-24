/* ═══════════════════════════════════════════
   WarTab — Extension Storage Adapter
   Self-contained: chrome.storage for persistence,
   chrome.system.* for stats, direct fetch for APIs.
   No server required.
   ═══════════════════════════════════════════ */

const storage = (function() {
  var _configCache = null;
  var _notesCache = {};
  var _uploadCache = null;

  const CONFIG_KEY = 'wartab_config';
  const NOTES_PREFIX = 'wartab_note_';
  const UPLOADS_KEY = 'wartab_uploads';
  const SNAPSHOTS_KEY = 'wartab_snapshots';

  // ── Config helpers (chrome.storage.local — 10MB+ quota) ──

  // Listen for storage changes from other tabs — invalidate caches
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(function(changes, areaName) {
      if (areaName === 'local') {
        if (changes[CONFIG_KEY]) _configCache = null;
        if (changes[NOTES_PREFIX]) _notesCache = {};
      }
    });
  }

  function chromeGet(keys) {
    return new Promise(function(resolve, reject) {
      try {
        chrome.storage.local.get(keys, function(data) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(data);
          }
        });
      } catch(e) { reject(e); }
    });
  }

  function chromeSet(obj) {
    return new Promise(function(resolve, reject) {
      try {
        chrome.storage.local.set(obj, function() {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch(e) { reject(e); }
    });
  }

  function chromeLocalGet(keys) {
    return new Promise(function(resolve, reject) {
      try {
        chrome.storage.local.get(keys, function(data) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(data);
          }
        });
      } catch(e) { reject(e); }
    });
  }

  function chromeLocalSet(obj) {
    return new Promise(function(resolve, reject) {
      try {
        chrome.storage.local.set(obj, function() {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch(e) { reject(e); }
    });
  }

  // ── Config ──

  function getConfig() {
    return new Promise(function(resolve, reject) {
      if (_configCache !== null) { resolve(_configCache); return; }
      chromeGet(CONFIG_KEY).then(function(data) {
        _configCache = data[CONFIG_KEY] || null;
        resolve(_configCache);
      }).catch(reject);
    });
  }

  function saveConfig(cfg) {
    _configCache = cfg;
    var obj = {};
    obj[CONFIG_KEY] = cfg;
    return chromeSet(obj);
  }

  // ── Notes ──

  function getNote(id) {
    return new Promise(function(resolve, reject) {
      if (_notesCache[id] !== undefined) { resolve(_notesCache[id]); return; }
      var key = NOTES_PREFIX + id;
      chromeLocalGet(key).then(function(data) {
        _notesCache[id] = data[key] || '';
        resolve(_notesCache[id]);
      }).catch(reject);
    });
  }

  function saveNote(id, content) {
    _notesCache[id] = content;
    var key = NOTES_PREFIX + id;
    var obj = {};
    obj[key] = content;
    return chromeLocalSet(obj);
  }

  // ── Stats (Chrome extension APIs) ──

  function getStats(source, glancesUrl) {
    if (source === 'glances' && glancesUrl) {
      return fetch(glancesUrl + '/api/4').then(function(r) { return r.json(); });
    }
    // Local stats from chrome.system.* APIs
    return new Promise(function(resolve) {
      var result = {
        cpu: null,
        memory: { active: 0, total: 0 },
        disks: [],
        network: { rx_bytes: 0, tx_bytes: 0 },
        hostname: '',
        uptime: {},
        gpu: { percent: 0, vram_total: 0, vram_used: 0, temp_c: 0 },
        cpu_temp: { celsius: 0 },
        processes: 0
      };

      var done = { cpu: false, mem: false, disk: false };

      function tryResolve() {
        if (done.cpu && done.mem && done.disk) resolve(result);
      }

      // CPU — get core count + arch, but not usage % (Chrome doesn't expose it)
      if (chrome.system && chrome.system.cpu) {
        chrome.system.cpu.getInfo(function(info) {
          if (info) {
            result.hostname = info.archName || '';
            // Store core count so UI can show it; cpu % stays null
            result.cpu_cores = info.numOfProcessors || 0;
          }
          done.cpu = true;
          tryResolve();
        });
      } else {
        done.cpu = true;
        tryResolve();
      }

      // Memory
      if (chrome.system && chrome.system.memory) {
        chrome.system.memory.getInfo(function(info) {
          if (info) {
            result.memory.total = info.capacity || 0;
            result.memory.active = (info.capacity || 0) - (info.availableCapacity || 0);
          }
          done.mem = true;
          tryResolve();
        });
      } else {
        done.mem = true;
        tryResolve();
      }

      // Disk
      if (chrome.system && chrome.system.storage) {
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
          done.disk = true;
          tryResolve();
        });
      } else {
        done.disk = true;
        tryResolve();
      }

      // Fallback timeout — resolve after 3s even if APIs are slow
      setTimeout(function() { resolve(result); }, 3000);
    });
  }

  // ── IndexedDB for large file storage (uploads) ──
  // chrome.storage.local has tight quotas; IndexedDB handles binary blobs
  // at scale (hundreds of MB+), making it ideal for high-res uploads.

  var _dbPromise = null;
  var _objectUrls = {};

  function idbOpen() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise(function(resolve, reject) {
      var req = indexedDB.open('wartab', 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('uploads')) {
          db.createObjectStore('uploads', { keyPath: 'id' });
        }
      };
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
    return _dbPromise;
  }

  // Migrate legacy data-URL uploads from chrome.storage.local to IndexedDB
  function migrateLegacyUploads() {
    return chromeLocalGet(UPLOADS_KEY).then(function(data) {
      var legacy = data[UPLOADS_KEY];
      if (!legacy || !legacy.length) return;
      return idbOpen().then(function(db) {
        var tx = db.transaction('uploads', 'readwrite');
        var store = tx.objectStore('uploads');
        var promises = legacy.map(function(entry) {
          // Convert data URL back to blob for IndexedDB storage
          return fetch(entry.url).then(function(r) { return r.blob(); }).then(function(blob) {
            store.put({ id: 'up-' + entry.ts, name: entry.name, blob: blob, ts: entry.ts });
          }).catch(function() { /* skip entries that can't be converted */ });
        });
        return Promise.all(promises).then(function() {
          // Clear legacy storage
          var clearObj = {}; clearObj[UPLOADS_KEY] = [];
          return chromeLocalSet(clearObj);
        });
      });
    });
  }

  function listUploads() {
    if (_uploadCache !== null) { return Promise.resolve(_uploadCache); }
    // Attempt legacy migration once on first list
    return migrateLegacyUploads().then(function() {
      return idbOpen().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('uploads', 'readonly');
          var store = tx.objectStore('uploads');
          var req = store.getAll();
          req.onsuccess = function() {
            var entries = (req.result || []).map(function(entry) {
              if (_objectUrls[entry.id]) {
                URL.revokeObjectURL(_objectUrls[entry.id]);
              }
              var url = URL.createObjectURL(entry.blob);
              _objectUrls[entry.id] = url;
              return {
                id: entry.id,
                name: entry.name,
                url: url,
                ts: entry.ts,
                size: entry.blob.size,
                type: entry.blob.type
              };
            });
            _uploadCache = entries;
            resolve(entries);
          };
          req.onerror = function(e) { reject(e.target.error); };
        });
      });
    });
  }

  function uploadFile(file, filename) {
    return new Promise(function(resolve, reject) {
      var id = 'up-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
      var blob = file; // store the original full-resolution file as-is
      idbOpen().then(function(db) {
        return new Promise(function(resolve2, reject2) {
          var tx = db.transaction('uploads', 'readwrite');
          var store = tx.objectStore('uploads');
          store.put({ id: id, name: filename || file.name || 'file', blob: blob, ts: Date.now() });
          tx.oncomplete = function() {
            _uploadCache = null; // invalidate cache
            var url = URL.createObjectURL(blob);
            _objectUrls[id] = url;
            resolve2({ id: id, name: filename || file.name || 'file', url: url, ts: Date.now(), size: blob.size, type: blob.type });
          };
          tx.onerror = function(e) { reject2(e.target.error); };
        });
      }).then(resolve).catch(reject);
    });
  }

  function deleteFile(url) {
    return listUploads().then(function(uploads) {
      var match = null;
      for (var i = 0; i < uploads.length; i++) {
        if (uploads[i].url === url || uploads[i].name === url.split('/').pop()) {
          match = uploads[i];
          break;
        }
      }
      if (!match) return;
      if (_objectUrls[match.id]) {
        URL.revokeObjectURL(_objectUrls[match.id]);
        delete _objectUrls[match.id];
      }
      return idbOpen().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('uploads', 'readwrite');
          var store = tx.objectStore('uploads');
          store.delete(match.id);
          tx.oncomplete = function() { _uploadCache = null; resolve(); };
          tx.onerror = function(e) { reject(e.target.error); };
        });
      });
    });
  }

  // ── Icons (selfhst index bundled in extension package) ──

  function getIconIndex() {
    return fetch(chrome.runtime.getURL('icons/selfhst-index.json')).then(function(r) {
      if (!r.ok) throw new Error('Failed to load icon index');
      return r.json();
    });
  }

  function uploadIcon(file, filename) {
    return uploadFile(file, filename);
  }

  function listIcons() {
    return listUploads().then(function(uploads) {
      return uploads.filter(function(u) {
        return u.name && u.name.match(/\.(png|svg|jpg|jpeg|webp|ico)$/i);
      });
    });
  }

  function deleteIcon(url) {
    return deleteFile(url);
  }

  // ── Snapshots ──

  return {
    IS_EXTENSION: true,

    // Config
    getConfig: getConfig,
    saveConfig: saveConfig,
    saveConfigFallback: function(cfg) {
      try {
        var obj = {}; obj['wartab_config_fallback'] = cfg;
        chrome.storage.local.set(obj, function(){});
      } catch(e) {
        console.error('saveConfig fallback failed:', e);
      }
    },

    // Notes
    getNote: getNote,
    saveNote: saveNote,

    // Stats
    getStats: getStats,

    // Uploads
    listUploads: listUploads,
    uploadFile: uploadFile,
    deleteFile: deleteFile,

    // Icons
    getIconIndex: getIconIndex,
    uploadIcon: uploadIcon,
    listIcons: listIcons,
    deleteIcon: deleteIcon,

    // Snapshots (config backup/restore)
    snapshots: {
      list: function() {
        return chromeLocalGet(SNAPSHOTS_KEY).then(function(data) {
          return data[SNAPSHOTS_KEY] || [];
        });
      },
      create: function() {
        return getConfig().then(function(cfg) {
          return chromeLocalGet(SNAPSHOTS_KEY).then(function(data) {
            var snaps = data[SNAPSHOTS_KEY] || [];
            snaps.push({
              name: 'snapshot-' + Date.now(),
              config: cfg,
              ts: Date.now()
            });
            var obj = {};
            obj[SNAPSHOTS_KEY] = snaps;
            return chromeLocalSet(obj);
          });
        });
      },
      restore: function(name) {
        return chromeLocalGet(SNAPSHOTS_KEY).then(function(data) {
          var snaps = data[SNAPSHOTS_KEY] || [];
          var snap = null;
          for (var i = 0; i < snaps.length; i++) {
            if (snaps[i].name === name) { snap = snaps[i]; break; }
          }
          if (!snap) throw new Error('Snapshot not found: ' + name);
          return saveConfig(snap.config);
        });
      }
    },
    checkForUpdate: function() {
      var CHECK_KEY = 'wartab_update_check';
      var GITHUB_API = 'https://api.github.com/repos/warmbo/wartab/releases/latest';
      var ONE_HOUR = 60 * 60 * 1000;
      return new Promise(function(resolve) {
        chrome.storage.local.get(CHECK_KEY, function(data) {
          var cached = data[CHECK_KEY];
          // Validate cache: discard if the extension version changed or if the
          // cached latest matches current (indicates stale comparison result)
          var m = chrome.runtime.getManifest();
          var rawVer = m.version_name || m.version || '0.0.0';
          var currentVer = rawVer.replace(/-.*$/, '');
          if (cached && Date.now() - cached.ts < ONE_HOUR) {
            if (cached.current !== rawVer) { cached = null; } // extension updated — re-check
            else if (cached.available && cached.latest === currentVer) { cached = null; } // stale true positive
            else { resolve(cached); return; }
          }
          fetch(GITHUB_API).then(function(r) { return r.json(); }).then(function(release) {
            var latestTag = (release.tag_name || '').replace(/^v/, '').replace(/-.*$/, '');
            var m = chrome.runtime.getManifest();
            var rawVer = m.version_name || m.version || '0.0.0';
            var currentVer = rawVer.replace(/-.*$/, ''); // strip suffix like -dev
            var isNewer = latestTag !== '' && latestTag !== currentVer && latestTag !== rawVer;
            var result = { ts: Date.now(), current: rawVer, latest: latestTag || '', available: isNewer, url: (release.html_url || 'https://github.com/warmbo/wartab/releases') + '' };
            var obj = {}; obj[CHECK_KEY] = result;
            chrome.storage.local.set(obj, function(){});
            resolve(result);
          }).catch(function() {
            if (cached) { resolve(cached); return; }
            resolve({ ts: Date.now(), current: '', latest: '', available: false, url: '' });
          });
        });
      });
    }
  };
})();

// Auto-check for updates on page load (extension only)
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  document.addEventListener('DOMContentLoaded', function() {
    storage.checkForUpdate().then(function(result) {
      if (!result || !result.available) return;
      var badge = document.createElement('a');
      badge.href = result.url;
      badge.target = '_blank';
      badge.rel = 'noopener';
      badge.title = 'WarTab ' + result.latest + ' available (current: ' + result.current + ')';
      badge.textContent = '\u2B06';
      badge.style.cssText = 'font-size:14px;cursor:pointer;opacity:0.6;text-decoration:none;margin-left:8px;';
      badge.addEventListener('mouseenter', function(){ this.style.opacity = '1'; });
      badge.addEventListener('mouseleave', function(){ this.style.opacity = '0.6'; });
      var footer = document.getElementById('footer-repo');
      if (footer && footer.parentNode) footer.parentNode.appendChild(badge);
    });
  });
}

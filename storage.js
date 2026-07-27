/* ═══════════════════════════════════════════
   WarTab — Unified Storage Adapter
   ═══════════════════════════════════════════
   I/O layer that adapts to the runtime environment.
   Self-hosted server mode: REST API via fetch()
   Browser extension mode: chrome.storage + chrome.system.*

   Interface (identical in both modes):
     getConfig(), saveConfig(cfg), saveConfigFallback(cfg)
     getNote(id), saveNote(id, content)
     getStats(source, glancesUrl)
     listUploads(), uploadFile(file, filename), deleteFile(url)
     getIconIndex(), uploadIcon(file, filename), listIcons(), deleteIcon(url)
     snapshots.list(), snapshots.create(), snapshots.restore(name)
   ═══════════════════════════════════════════ */

const storage = (function() {

  // ── Environment detection ──
  // Extension context: chrome.runtime.getURL is only available to extension pages
  const IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL;

  // ═══════════════════════════════════════════
  // Server Mode Implementation
  // ═══════════════════════════════════════════
  if (!IS_EXTENSION) {

    const BASE = window.location.origin;

    function api(path, method, body) {
      const opts = { method, headers: {} };
      if (body) {
        if (typeof body === 'string') {
          opts.headers['Content-Type'] = 'text/plain';
          opts.body = body;
        } else {
          opts.headers['Content-Type'] = 'application/json';
          opts.body = JSON.stringify(body);
        }
      }
      return fetch(BASE + path, opts).then(function(r) {
        if (!r.ok) return r.json().then(function(e) {
          throw new Error(e.error || r.statusText);
        }, function() {
          throw new Error(r.statusText);
        });
        var ct = r.headers.get('Content-Type') || '';
        return ct.includes('application/json') ? r.json() : r.text();
      });
    }

    function getConfig() { return api('/api/config', 'GET'); }

    function saveConfig(cfg) { return api('/api/config', 'POST', cfg); }

    function getNote(id) { return api('/api/notes/' + encodeURIComponent(id), 'GET'); }

    function saveNote(id, content) { return api('/api/notes/' + encodeURIComponent(id), 'POST', content); }

    function getStats(source, glancesUrl, customUrl) {
      if (source === 'glances' && glancesUrl) return fetch(glancesUrl + '/api/4').then(function(r) { return r.json(); });
      if (source === 'custom' && customUrl) return fetch(customUrl).then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); });
      return api('/api/stats', 'GET');
    }

    function listUploads() { return api('/api/uploads', 'GET'); }

    function uploadFile(file, filename) {
      return fetch(BASE + '/api/upload', {
        method: 'POST', headers: { 'X-Filename': filename }, body: file
      }).then(function(r) { return r.json(); });
    }

    function deleteFile(url) {
      var name = url.split('/').pop();
      return api('/api/uploads/' + encodeURIComponent(name), 'DELETE');
    }

    function getIconIndex() { return api('/icons/selfhst-index.json?t=' + Date.now(), 'GET'); }

    function uploadIcon(file, filename) {
      return fetch(BASE + '/api/upload-icon', {
        method: 'POST', headers: { 'X-Filename': filename }, body: file
      }).then(function(r) { return r.json(); });
    }

    function listIcons() { return api('/api/icons/list', 'GET'); }

    function deleteIcon(url) {
      var name = url.split('/').pop();
      return api('/api/icons/delete/' + encodeURIComponent(name), 'POST');
    }

    return {
      IS_EXTENSION: false,
      getConfig: getConfig,
      saveConfig: saveConfig,
      saveConfigFallback: function(cfg) {
        fetch('/api/config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(cfg), keepalive: true }).catch(function(err){
          console.error('saveConfig fallback failed:', err);
        });
      },
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
        list: function() { return api('/api/config/backups', 'GET'); },
        create: function() { return getConfig().then(function(cfg) { return saveConfig(cfg); }); },
        restore: function(name) { return api('/api/config/restore/' + encodeURIComponent(name), 'POST'); },
        delete: function(name) { return api('/api/config/delete-snapshot/' + encodeURIComponent(name), 'POST'); }
      }
    };
  }

  // ═══════════════════════════════════════════
  // Extension Mode Implementation
  // ═══════════════════════════════════════════

  var _configCache = null;
  var _notesCache = {};
  var _uploadCache = null;

  const CONFIG_KEY = 'wartab_config';
  const NOTES_PREFIX = 'wartab_note_';
  const UPLOADS_KEY = 'wartab_uploads';
  const SNAPSHOTS_KEY = 'wartab_snapshots';

  // ── Chrome storage helpers ──

  function chromeGet(keys) {
    return new Promise(function(resolve, reject) {
      try {
        chrome.storage.local.get(keys, function(data) {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(data);
        });
      } catch(e) { reject(e); }
    });
  }

  function chromeSet(obj) {
    return new Promise(function(resolve, reject) {
      try {
        chrome.storage.local.set(obj, function() {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
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
      chromeGet(key).then(function(data) {
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
    return chromeSet(obj);
  }

  // ── Stats (Chrome extension APIs) ──

  function getStats(source, glancesUrl, customUrl) {
    if (source === 'glances' && glancesUrl) {
      return fetch(glancesUrl + '/api/4').then(function(r) { return r.json(); });
    }
    if (source === 'custom' && customUrl) {
      return fetch(customUrl).then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    }
    return new Promise(function(resolve) {
      var result = {
        cpu: null, cpu_cores: 0,
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
      function tryResolve() { if (done.cpu && done.mem && done.disk) resolve(result); }

      if (chrome.system && chrome.system.cpu) {
        chrome.system.cpu.getInfo(function(info) {
          if (info) {
            result.hostname = info.archName || '';
            result.cpu_cores = info.numOfProcessors || 0;
          }
          done.cpu = true; tryResolve();
        });
      } else { done.cpu = true; tryResolve(); }

      if (chrome.system && chrome.system.memory) {
        chrome.system.memory.getInfo(function(info) {
          if (info) {
            result.memory.total = info.capacity || 0;
            result.memory.active = (info.capacity || 0) - (info.availableCapacity || 0);
          }
          done.mem = true; tryResolve();
        });
      } else { done.mem = true; tryResolve(); }

      if (chrome.system && chrome.system.storage) {
        chrome.system.storage.getInfo(function(units) {
          if (units && units.length) {
            result.disks = units.map(function(u) {
              return { mount: u.name || '/', total: u.capacity || 0, used: (u.capacity || 0) - (u.availableCapacity || 0) };
            });
          }
          done.disk = true; tryResolve();
        });
      } else { done.disk = true; tryResolve(); }

      setTimeout(function() { resolve(result); }, 3000);
    });
  }

  // ── Uploads ──

  function listUploads() {
    return new Promise(function(resolve, reject) {
      if (_uploadCache !== null) { resolve(_uploadCache); return; }
      chromeGet(UPLOADS_KEY).then(function(data) {
        _uploadCache = data[UPLOADS_KEY] || [];
        resolve(_uploadCache);
      }).catch(reject);
    });
  }

  function uploadFile(file, filename) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        var dataUrl = reader.result;
        listUploads().then(function(uploads) {
          var entry = { name: filename, url: dataUrl, ts: Date.now() };
          uploads.push(entry);
          _uploadCache = uploads;
          var obj = {};
          obj[UPLOADS_KEY] = uploads;
          chromeSet(obj).then(function() { resolve(entry); }).catch(reject);
        }).catch(reject);
      };
      reader.onerror = function() { reject(new Error('FileReader failed')); };
      reader.readAsDataURL(file);
    });
  }

  function deleteFile(url) {
    return listUploads().then(function(uploads) {
      var idx = -1;
      for (var i = 0; i < uploads.length; i++) {
        if (uploads[i].url === url) { idx = i; break; }
      }
      if (idx >= 0) uploads.splice(idx, 1);
      _uploadCache = uploads;
      var obj = {};
      obj[UPLOADS_KEY] = uploads;
      return chromeSet(obj);
    });
  }

  // ── Icons ──

  function getIconIndex() {
    return fetch(chrome.runtime.getURL('icons/selfhst-index.json')).then(function(r) {
      if (!r.ok) throw new Error('Failed to load icon index');
      return r.json();
    });
  }

  function uploadIcon(file, filename) { return uploadFile(file, filename); }

  function listIcons() {
    return listUploads().then(function(uploads) {
      return uploads.filter(function(u) { return u.name && u.name.match(/\.(png|svg|jpg|jpeg|webp|ico)$/i); });
    });
  }

  function deleteIcon(url) { return deleteFile(url); }

  // ── Snapshots ──

  return {
    IS_EXTENSION: true,

    getConfig: getConfig,
    saveConfig: saveConfig,
    saveConfigFallback: function(cfg) {
      _configCache = cfg;
      var obj = {};
      obj[CONFIG_KEY] = cfg;
      chromeSet(obj).catch(function(e) { console.error('saveConfig fallback failed:', e); });
    },

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
      list: function() { return chromeGet(SNAPSHOTS_KEY).then(function(data) { return data[SNAPSHOTS_KEY] || []; }); },
      create: function() {
        return getConfig().then(function(cfg) {
          return chromeGet(SNAPSHOTS_KEY).then(function(data) {
            var snaps = data[SNAPSHOTS_KEY] || [];
            snaps.push({ name: 'snapshot-' + Date.now(), config: cfg, ts: Date.now() });
            var obj = {};
            obj[SNAPSHOTS_KEY] = snaps;
            return chromeSet(obj);
          });
        });
      },
      restore: function(name) {
        return chromeGet(SNAPSHOTS_KEY).then(function(data) {
          var snaps = data[SNAPSHOTS_KEY] || [];
          var snap = null;
          for (var i = 0; i < snaps.length; i++) {
            if (snaps[i].name === name) { snap = snaps[i]; break; }
          }
          if (!snap) throw new Error('Snapshot not found: ' + name);
          return saveConfig(snap.config);
        });
      },
      delete: function(name) {
        return chromeGet(SNAPSHOTS_KEY).then(function(data) {
          var snaps = data[SNAPSHOTS_KEY] || [];
          var idx = -1;
          for (var i = 0; i < snaps.length; i++) {
            if (snaps[i].name === name) { idx = i; break; }
          }
          if (idx < 0) throw new Error('Snapshot not found: ' + name);
          snaps.splice(idx, 1);
          var obj = {};
          obj[SNAPSHOTS_KEY] = snaps;
          return chromeSet(obj);
        });
      }
    }
  };
})();

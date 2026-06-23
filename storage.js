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

  // ── Uploads (stored as data URLs in chrome.storage.local) ──

  function listUploads() {
    return new Promise(function(resolve, reject) {
      if (_uploadCache !== null) { resolve(_uploadCache); return; }
      chromeLocalGet(UPLOADS_KEY).then(function(data) {
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
          var entry = {
            name: filename,
            url: dataUrl,
            ts: Date.now()
          };
          uploads.push(entry);
          _uploadCache = uploads;
          var obj = {};
          obj[UPLOADS_KEY] = uploads;
          chromeLocalSet(obj).then(function() {
            resolve(entry);
          }).catch(reject);
        }).catch(reject);
      };
      reader.onerror = function() {
        reject(new Error('FileReader failed'));
      };
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
      return chromeLocalSet(obj);
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
    }
  };
})();

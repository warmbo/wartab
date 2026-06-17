/* ═══════════════════════════════════════════
   WarTab — Storage Adapter
   ═══════════════════════════════════════════
   Unified I/O layer supporting two backends:

     Server mode (default):
       - Config:  GET/POST /api/config (config.json on server)
       - Notes:   GET/POST /api/notes/{id} (notes/*.md on server)
       - Stats:   GET /api/stats or Glances API
       - Uploads: GET /api/uploads, POST /api/upload, DELETE /api/uploads/{name}
       - Icons:   GET /icons/{file}.svg or selfhst-index.json

     Extension mode (detected via chrome.runtime):
       - Config:  chrome.storage.sync / localStorage
       - Notes:   chrome.storage.local / IndexedDB
       - Stats:   chrome.system.cpu / system.memory / system.storage APIs
       - Icons:   Bundled extension assets or CDN fetch

   Usage:
     import * as storage from './storage.js'
     const cfg = await storage.getConfig()
     await storage.saveConfig(cfg)
     const note = await storage.getNote(id)
     await storage.saveNote(id, content)
     const stats = await storage.getStats(source, glancesUrl)
     const uploads = await storage.listUploads()
     await storage.uploadFile(file, filename)
     await storage.deleteFile(url)
     const icons = await storage.getIconIndex()
   ═══════════════════════════════════════════ */

const storage = (function() {

  // ── Mode detection ──
  const IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  const BASE = window.location.origin;

  // ── Helpers ──
  function api(path, method, body) {
    if (IS_EXTENSION) throw new Error('Server API not available in extension mode');
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
      if (!r.ok) throw new Error(r.statusText);
      var ct = r.headers.get('Content-Type') || '';
      return ct.includes('application/json') ? r.json() : r.text();
    });
  }

  // ── Config ──
  function getConfig() {
    if (IS_EXTENSION) {
      return new Promise(function(resolve) {
        chrome.storage.local.get('wartab-config', function(data) {
          resolve(data['wartab-config'] || {});
        });
      });
    }
    return api('/api/config', 'GET');
  }

  function saveConfig(cfg) {
    if (IS_EXTENSION) {
      return new Promise(function(resolve) {
        chrome.storage.local.set({ 'wartab-config': cfg }, function() {
          if (chrome.runtime.lastError) console.error('saveConfig error:', chrome.runtime.lastError);
          resolve();
        });
      });
    }
    return api('/api/config', 'POST', cfg);
  }

  // ── Notes ──
  function getNote(id) {
    if (IS_EXTENSION) {
      return new Promise(function(resolve) {
        chrome.storage.local.get('wartab-note-' + id, function(data) {
          resolve({ id: id, content: data['wartab-note-' + id] || '' });
        });
      });
    }
    return api('/api/notes/' + encodeURIComponent(id), 'GET');
  }

  function saveNote(id, content) {
    if (IS_EXTENSION) {
      return new Promise(function(resolve) {
        var obj = {}; obj['wartab-note-' + id] = content;
        chrome.storage.local.set(obj, resolve);
      });
    }
    return api('/api/notes/' + encodeURIComponent(id), 'POST', content);
  }

  // ── Stats ──
  var _cpuPrev = null;
  function getStats(source, glancesUrl) {
    if (IS_EXTENSION) {
      return new Promise(function(resolve) {
        var result = { hostname: 'Device', cpu: 0, memory: { percent: 0, used: 0, total: 0 }, disks: [], network: {}, uptime: { string: '--' }, timestamp: Date.now() };
        var pending = 0;

        // Uptime via performance.now() approximation
        var nav = navigator || {};
        if (nav.connection && nav.connection.type) {
          result.network = { type: nav.connection.effectiveType || 'unknown' };
        }
        // Estimate uptime from performance.timing
        try {
          var perf = performance || {};
          var nav2 = perf.timing || perf.getEntriesByType ? null : null;
          if (perf.timeOrigin) {
            var secs = Math.floor((Date.now() - perf.timeOrigin) / 1000);
            var d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60);
            result.uptime = { string: d + 'd ' + h + 'h ' + m + 'm', seconds: secs };
          }
        } catch(e) {}

        // CPU — use logical processor tick deltas
        pending++;
        try {
          chrome.system.cpu.getInfo(function(info) {
            if (info && info.logicalProcessors && info.logicalProcessors.length) {
              var totalUser = 0, totalKernel = 0, totalIdle = 0;
              info.logicalProcessors.forEach(function(p) {
                if (p.usage) { totalUser += p.usage.user || 0; totalKernel += p.usage.kernel || 0; totalIdle += p.usage.idle || 0; }
              });
              var total = totalUser + totalKernel + totalIdle;
              if (_cpuPrev) {
                var dUser = totalUser - _cpuPrev.user, dKernel = totalKernel - _cpuPrev.kernel, dIdle = totalIdle - _cpuPrev.idle, dTotal = dUser + dKernel + dIdle;
                if (dTotal > 0) result.cpu = Math.round((dUser + dKernel) / dTotal * 1000) / 10;
              }
              _cpuPrev = { user: totalUser, kernel: totalKernel, idle: totalIdle };
              if (!result.cpu && total > 0) result.cpu = Math.round((totalUser + totalKernel) / total * 100);
            }
            pending--; if (pending <= 0) resolve(result);
          });
        } catch(e) { pending--; if (pending <= 0) resolve(result); }

        // Memory
        pending++;
        try {
          chrome.system.memory.getInfo(function(info) {
            if (info && info.capacity > 0) {
              var used = info.capacity - (info.availableCapacity || 0);
              result.memory = {
                total: info.capacity,
                available: info.availableCapacity || 0,
                used: used,
                percent: Math.round(used / info.capacity * 1000) / 10
              };
            }
            pending--; if (pending <= 0) resolve(result);
          });
        } catch(e) { pending--; if (pending <= 0) resolve(result); }

        // Storage (root-like: use navigator.storage.estimate for origin storage)
        pending++;
        try {
          if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(function(est) {
              if (est && est.quota > 0) {
                var used = est.usage || 0, total = est.quota || 0;
                result.disks = [{
                  mount: '/',
                  percent: Math.round(used / total * 1000) / 10,
                  used: used,
                  total: total,
                  free: total - used
                }];
              }
              pending--; if (pending <= 0) resolve(result);
            }).catch(function() { pending--; if (pending <= 0) resolve(result); });
          } else {
            pending--; if (pending <= 0) resolve(result);
          }
        } catch(e) { pending--; if (pending <= 0) resolve(result); }

        if (pending <= 0) resolve(result);
      });
    }
    if (source === 'glances' && glancesUrl) {
      return api(glancesUrl + '/api/4', 'GET');
    }
    return api('/api/stats', 'GET');
  }

  // ── Uploads ──
  function listUploads() {
    if (IS_EXTENSION) {
      return new Promise(function(resolve) {
        chrome.storage.local.get('wartab-uploads', function(data) {
          resolve(data['wartab-uploads'] || []);
        });
      });
    }
    return api('/api/uploads', 'GET');
  }

  function uploadFile(file, filename) {
    if (IS_EXTENSION) {
      return new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          var dataUrl = ev.target.result;
          // Store in local storage (limited, but works for small images)
          chrome.storage.local.get('wartab-uploads', function(data) {
            var list = data['wartab-uploads'] || [];
            var entry = { name: filename, url: dataUrl, size: file.size, mtime: Date.now() };
            list.unshift(entry);
            chrome.storage.local.set({ 'wartab-uploads': list }, function() {
              resolve(entry);
            });
          });
        };
        reader.readAsDataURL(file);
      });
    }
    // Server mode: POST multipart/form-data
    var formData = new FormData();
    formData.append('file', file, filename);
    return fetch(BASE + '/api/upload', { method: 'POST', headers: { 'X-Filename': filename }, body: file }).then(function(r) { return r.json(); });
  }

  function deleteFile(url) {
    if (IS_EXTENSION) {
      return new Promise(function(resolve) {
        chrome.storage.local.get('wartab-uploads', function(data) {
          var list = data['wartab-uploads'] || [];
          list = list.filter(function(f) { return f.url !== url; });
          chrome.storage.local.set({ 'wartab-uploads': list }, function() {
            resolve({ status: 'deleted' });
          });
        });
      });
    }
    var name = url.split('/').pop();
    return api('/api/uploads/' + encodeURIComponent(name), 'DELETE');
  }

  // ── Icons ──
  function getIconIndex() {
    if (IS_EXTENSION) {
      // In extension mode, icons are bundled assets
      return fetch(chrome.runtime.getURL('icons/selfhst-index.json')).then(function(r) { return r.json(); });
    }
    return api('/icons/selfhst-index.json', 'GET');
  }

  return {
    IS_EXTENSION: IS_EXTENSION,
    getConfig: getConfig,
    saveConfig: saveConfig,
    getNote: getNote,
    saveNote: saveNote,
    getStats: getStats,
    listUploads: listUploads,
    uploadFile: uploadFile,
    deleteFile: deleteFile,
    getIconIndex: getIconIndex,
    // Config snapshots (server only)
    snapshots: {
      list: function() {
        if (IS_EXTENSION) return Promise.resolve([]);
        return api('/api/config/backups', 'GET');
      },
      create: function() {
        if (IS_EXTENSION) return Promise.resolve({});
        // Force a snapshot by saving current config (server auto-snapshots)
        return getConfig().then(function(cfg) {
          return saveConfig(cfg);
        });
      },
      restore: function(name) {
        if (IS_EXTENSION) return Promise.reject(new Error('Not available in extension mode'));
        return api('/api/config/restore/' + encodeURIComponent(name), 'POST');
      }
    }
  };

})();

/* ═══════════════════════════════════════════
   WarTab — Storage Adapter (Server Mode Only)
   ═══════════════════════════════════════════
   I/O layer for the self-hosted server backend.
   Config:  GET/POST /api/config
   Notes:   GET/POST /api/notes/{id}
   Stats:   GET /api/stats or Glances API
   Uploads: GET /api/uploads, POST /api/upload, DELETE /api/uploads/{name}
   Icons:   GET /icons/selfhst-index.json
   ═══════════════════════════════════════════ */

const storage = (function() {

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
      if (!r.ok) throw new Error(r.statusText);
      var ct = r.headers.get('Content-Type') || '';
      return ct.includes('application/json') ? r.json() : r.text();
    });
  }

  // ── Config ──
  function getConfig() {
    return api('/api/config', 'GET');
  }

  function saveConfig(cfg) {
    return api('/api/config', 'POST', cfg);
  }

  // ── Notes ──
  function getNote(id) {
    return api('/api/notes/' + encodeURIComponent(id), 'GET');
  }

  function saveNote(id, content) {
    return api('/api/notes/' + encodeURIComponent(id), 'POST', content);
  }

  // ── Stats ──
  function getStats(source, glancesUrl) {
    if (source === 'glances' && glancesUrl) {
      return api(glancesUrl + '/api/4', 'GET');
    }
    return api('/api/stats', 'GET');
  }

  // ── Uploads ──
  function listUploads() {
    return api('/api/uploads', 'GET');
  }

  function uploadFile(file, filename) {
    return fetch(BASE + '/api/upload', {
      method: 'POST', headers: { 'X-Filename': filename }, body: file
    }).then(function(r) { return r.json(); });
  }

  function deleteFile(url) {
    var name = url.split('/').pop();
    return api('/api/uploads/' + encodeURIComponent(name), 'DELETE');
  }

  // ── Icons ──
  function getIconIndex() {
    return api('/icons/selfhst-index.json?t=' + Date.now(), 'GET');
  }

  return {
    IS_EXTENSION: false,
    getConfig: getConfig,
    saveConfig: saveConfig,
    getNote: getNote,
    saveNote: saveNote,
    getStats: getStats,
    listUploads: listUploads,
    uploadFile: uploadFile,
    deleteFile: deleteFile,
    getIconIndex: getIconIndex,
    uploadIcon: function(file, filename) {
      return fetch(BASE + '/api/upload-icon', {
        method: 'POST', headers: { 'X-Filename': filename }, body: file
      }).then(function(r) { return r.json(); });
    },
    listIcons: function() {
      return api('/api/icons/list', 'GET');
    },
    deleteIcon: function(url) {
      var name = url.split('/').pop();
      return api('/api/icons/delete/' + encodeURIComponent(name), 'POST');
    },
    snapshots: {
      list: function() { return api('/api/config/backups', 'GET'); },
      create: function() {
        return getConfig().then(function(cfg) { return saveConfig(cfg); });
      },
      restore: function(name) {
        return api('/api/config/restore/' + encodeURIComponent(name), 'POST');
      }
    }
  };

})();

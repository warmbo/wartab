/* ═══════════════════════════════════════════
   WarTab — Service Worker (offline-first app shell)
   - Cache immutable ?v= assets forever (cache-first).
   - Network-first for navigations (so config/API always fresh).
   - Never cache /api/ responses or config.json.
   ═══════════════════════════════════════════ */
'use strict';

const VERSION = 'wartab-v1';
const SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/static/fonts/inter.css',
  '/static/lucide.min.js',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Never cache API/config (always network)
  if (url.pathname.startsWith('/api/') || url.pathname === '/config.json') return;

  // Navigation requests: network-first, fall back to cached shell when offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put('/index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Immutable ?v= assets: cache-first, and populate on miss.
  if (url.searchParams.has('v')) {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        if (hit) return hit;
        return fetch(e.request).then(function (res) {
          if (res.ok) {
            var copy = res.clone();
            caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  // Everything else (fonts, icons, uploads): stale-while-revalidate.
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var fetchPromise = fetch(e.request).then(function (res) {
        if (res.ok && (url.origin === location.origin)) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || fetchPromise;
    })
  );
});

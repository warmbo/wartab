/* ═══════════════════════════════════════════
   module-round2 — behavioural checks for the integration/display modules.
   All payloads below are SYNTHETIC test fixtures (hand-written objects), not
   captured live data. No network or Proxmox/HA calls are made — WarTabHttp,
   storage and Open are stubbed.
   ═══════════════════════════════════════════ */
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const read = (p) => fs.readFileSync(p, 'utf8');
const src = (p) => window.eval(read(p));
const flush = (ms = 5) => new Promise((r) => setTimeout(r, ms));

function el(cls, text) {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  if (text != null) d.textContent = text;
  return d;
}

function stubDs() {
  return {
    loading: () => el('ds-loading'),
    empty: (icon, msg) => el('ds-empty', msg),
    error: (msg, detail, action) => {
      const d = el('ds-error', msg + (detail ? ' ' + detail : ''));
      if (action && action.label) {
        const b = document.createElement('button');
        b.textContent = action.label;
        b.addEventListener('click', action.onClick || function () {});
        d.appendChild(b);
      }
      return d;
    },
    statRow: (label, value, accent) => {
      const d = el('ds-stat-row', label + ': ' + value);
      d.dataset.accent = accent || '';
      return d;
    },
    statusRow: (o) => {
      const d = el('ds-status-row ds-status-' + (o.state || 'unknown'));
      d.textContent = [o.label || '', o.context || '', o.status || '', o.meta || ''].filter(Boolean).join(' ');
      return d;
    },
    freshness: (ts) => { const d = el('ds-freshness'); d.dataset.timestamp = String(ts || 0); return d; },
    progressRing: (v) => { const d = el('ds-progress-ring'); d.dataset.value = String(v); return d; },
    icon: () => el('ds-icon'),
    badge: (t) => el('ds-badge', t),
  };
}

function loadModule(file, globals) {
  const mods = {};
  window.registerModule = (t, m) => { mods[t] = m; };
  window.ds = stubDs();
  window.escHtml = (s) => String(s);
  window.renderIcons = () => {};
  window.openCardEditPanel = () => {};
  window.saveConfig = () => {};
  window.saveAndRefresh = () => {};
  window.rerenderCard = () => {};
  Object.assign(window, globals || {});
  window.eval(read(file));
  return mods;
}

beforeEach(() => { try { localStorage.clear(); } catch (e) {} });
afterEach(() => {
  for (const k of ['registerModule', 'ds', 'escHtml', 'renderIcons', 'openCardEditPanel',
    'saveConfig', 'saveAndRefresh', 'rerenderCard', 'WarTabHttp', 'WarTabLifecycle',
    'storage', 'IntersectionObserver']) delete window[k];
});

describe('media module', () => {
  it('renders an empty state when no service has a url+key', async () => {
    const mods = loadModule('modules/media.js', {
      WarTabHttp: { request: () => Promise.resolve([]), createPoller: (o) => { o.task(); return { dispose() {} }; } },
      open: () => null,
    });
    const owner = document.createElement('div');
    mods.media.render({ id: 'm0', services: [{ type: 'sonarr', url: '', key: '', label: 'Sonarr' }] }, { id: 'm0' }, owner);
    expect(owner.querySelector('.ds-empty')).not.toBeNull();
    expect(owner.textContent).toContain('Add Media Services');
  });

  it('renders synthetic Sonarr stats and paints values with the legible accent foreground', async () => {
    // SYNTHETIC fixture — canned API shapes, not live Sonarr data.
    const routes = {
      '/api/v3/series': [{}, {}],
      '/api/v3/wanted/missing': { totalRecords: 3 },
    };
    const mods = loadModule('modules/media.js', {
      WarTabHttp: {
        request: (url) => {
          const key = Object.keys(routes).find((k) => url.includes(k));
          return Promise.resolve(key ? routes[key] : null);
        },
        createPoller: (o) => { o.task(); return { dispose() {} }; },
      },
      open: () => null,
    });
    const owner = document.createElement('div');
    mods.media.render(
      { id: 'm1', services: [{ type: 'sonarr', url: 'http://sonarr:8989', key: 'k', label: 'Sonarr', enableQueue: false }] },
      { id: 'm1' }, owner,
    );
    await flush(10);
    expect(owner.textContent).toContain('Sonarr');
    expect(owner.textContent).toContain('Series: 2');
    expect(owner.textContent).toContain('Wanted: 3');
    // Regression: value text must use --accent-fg (legible) not raw --accent.
    const seriesRow = [...owner.querySelectorAll('.ds-stat-row')].find((r) => r.textContent.startsWith('Series'));
    expect(seriesRow.dataset.accent).toContain('--accent-fg');
  });

  it('shows a per-service error row for an unknown service type', async () => {
    const mods = loadModule('modules/media.js', {
      WarTabHttp: { request: () => Promise.resolve(null), createPoller: (o) => { o.task(); return { dispose() {} }; } },
      open: () => null,
    });
    const owner = document.createElement('div');
    mods.media.render(
      { id: 'm2', services: [{ type: 'bogus', url: 'http://x:1', key: 'k', label: 'Bogus' }] },
      { id: 'm2' }, owner,
    );
    await flush(10);
    expect(owner.textContent).toContain('Unknown type');
  });

  it('parses synthetic Plex sessions and library sections', async () => {
    const routes = {
      '/status/sessions': { MediaContainer: { Size: 2 } },
      '/library/sections': { MediaContainer: { Directory: [{ type: 'movie', size: 10 }, { type: 'show', size: 5 }] } },
    };
    const mods = loadModule('modules/media.js', {
      WarTabHttp: {
        request: (url) => {
          const key = Object.keys(routes).find((k) => url.includes(k));
          return Promise.resolve(key ? routes[key] : null);
        },
        createPoller: (o) => { o.task(); return { dispose() {} }; },
      },
      open: () => null,
    });
    const owner = document.createElement('div');
    mods.media.render(
      { id: 'm3', services: [{ type: 'plex', url: 'http://plex:32400', key: 't', label: 'Plex' }] },
      { id: 'm3' }, owner,
    );
    await flush(10);
    expect(owner.textContent).toContain('Streaming: 2');
    expect(owner.textContent).toContain('Movies: 10');
    expect(owner.textContent).toContain('TV Shows: 5');
  });

  it('opens service headers with noopener,noreferrer (tabnabbing guard)', async () => {
    const opened = [];
    const mods = loadModule('modules/media.js', {
      WarTabHttp: { request: () => Promise.resolve(null), createPoller: (o) => { o.task(); return { dispose() {} }; } },
      open: (...args) => { opened.push(args); return null; },
    });
    const owner = document.createElement('div');
    mods.media.render(
      { id: 'm4', services: [{ type: 'sonarr', url: 'http://sonarr:8989', key: 'k', label: 'Sonarr' }] },
      { id: 'm4' }, owner,
    );
    await flush(10);
    const link = owner.querySelector('[role="link"]');
    expect(link).not.toBeNull();
    link.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(opened.length).toBe(1);
    expect(opened[0][1]).toBe('_blank');
    expect(opened[0][2]).toContain('noopener');
    expect(opened[0][2]).toContain('noreferrer');
  });
});

describe('proxmox module', () => {
  const SYNTH = {
    resources: { data: [{ type: 'qemu', status: 'running' }, { type: 'qemu', status: 'stopped' }, { type: 'lxc', status: 'running' }, { type: 'node', status: 'online', cpu: 0.25, maxcpu: 4, maxmem: 8589934592, mem: 4294967296 }] },
    status: { data: [{ type: 'node', name: 'Synthetic node', online: 1 }] },
  };

  it('sends the Proxmox token auth header exactly (no Basic, no real call)', async () => {
    const seen = [];
    const mods = loadModule('modules/proxmox.js', {
      WarTabHttp: {
        request: (url, opts) => { seen.push({ url, opts }); return Promise.resolve(url.includes('resources') ? SYNTH.resources : SYNTH.status); },
        createPoller: (o) => { Promise.resolve().then(o.task); return { dispose() {} }; },
      },
    });
    const owner = document.createElement('div');
    mods.proxmox.render({ id: 'p1', url: 'https://pve.local:8006', username: 'user@pam!tok', password: 'SECRET' }, { id: 'p1' }, owner);
    await flush(10);
    expect(seen.length).toBeGreaterThan(0);
    for (const s of seen) {
      expect(s.opts.headers.Authorization).toBe('PVEAPIToken=user@pam!tok=SECRET');
      expect(s.opts.headers.Authorization).not.toContain('Basic');
    }
  });

  it('renders synthetic node and VM counts on success', async () => {
    const mods = loadModule('modules/proxmox.js', {
      WarTabHttp: {
        request: (url) => Promise.resolve(url.includes('resources') ? SYNTH.resources : SYNTH.status),
        createPoller: (o) => { Promise.resolve().then(o.task); return { dispose() {} }; },
      },
    });
    const owner = document.createElement('div');
    mods.proxmox.render({ id: 'p2', url: 'https://pve.local:8006', username: 'user@pam!tok', password: 's' }, { id: 'p2' }, owner);
    await flush(10);
    expect(owner.textContent).toContain('QEMU');
    expect(owner.textContent).toContain('1 / 2 running');
    expect(owner.textContent).toContain('1 / 1 running');
    expect(owner.textContent).toContain('1 online');
    expect(owner.textContent).toContain('25%');
    expect(owner.textContent).toContain('4/8 GB');
  });

  it('surfaces a helpful authentication error instead of a misleading dash', async () => {
    const mods = loadModule('modules/proxmox.js', {
      WarTabHttp: {
        request: () => Promise.reject(new Error('HTTP 401: no ticket')),
        createPoller: (o) => { Promise.resolve().then(o.task); return { dispose() {} }; },
      },
    });
    const owner = document.createElement('div');
    mods.proxmox.render({ id: 'p3', url: 'https://pve.local:8006', username: 'user@pam!tok', password: 'bad' }, { id: 'p3' }, owner);
    await flush(10);
    expect(owner.querySelector('.ds-error')).not.toBeNull();
    expect(owner.textContent).toContain('Authentication failed');
  });

  it('flags a malformed token id with a format-specific hint', async () => {
    const mods = loadModule('modules/proxmox.js', {
      WarTabHttp: { request: () => Promise.reject(new Error('HTTP 403: permission check failed')), createPoller: (o) => { Promise.resolve().then(o.task); return { dispose() {} }; } },
    });
    const owner = document.createElement('div');
    mods.proxmox.render({ id: 'p4', url: 'https://pve.local:8006', username: 'usernojunk', password: 'x' }, { id: 'p4' }, owner);
    await flush(10);
    expect(owner.textContent).toContain('user@realm!tokenid');
  });

  it('degrades quietly (no green, no error banner) on a transient network failure', async () => {
    const mods = loadModule('modules/proxmox.js', {
      WarTabHttp: { request: () => Promise.reject(new Error('Request timed out')), createPoller: (o) => { Promise.resolve().then(o.task); return { dispose() {} }; } },
    });
    const owner = document.createElement('div');
    mods.proxmox.render({ id: 'p5', url: 'https://pve.local:8006', username: 'user@pam!tok', password: 's' }, { id: 'p5' }, owner);
    await flush(10);
    expect(owner.querySelector('.ds-error')).toBeNull();
    // The Nodes header dot must not be reassuringly green when data is missing.
    const dot = [...owner.querySelectorAll('span')].find((s) => s.style.borderRadius === '50%');
    expect(dot).toBeTruthy();
    expect(dot.style.background).not.toContain('color-success');
    expect(dot.style.background).toContain('color-error');
  });
});

describe('resource-monitor module', () => {
  const OBSERVERS = [];
  const CLEANUPS = [];

  function load(synthetic, sec) {
    OBSERVERS.length = 0; CLEANUPS.length = 0;
    class FakeObserver {
      constructor(cb) { this.cb = cb; this.disconnected = false; OBSERVERS.push(this); }
      observe() {} disconnect() { this.disconnected = true; }
    }
    const mods = loadModule('modules/resource-monitor.js', {
      IntersectionObserver: FakeObserver,
      WarTabLifecycle: {
        addCleanup: (o, c) => { CLEANUPS.push(c); },
        setTimeout: (o, c, d) => setTimeout(c, d),
        observe: (o, obs, t) => { obs.observe(t); return obs; },
      },
      storage: { getStats: () => Promise.resolve(synthetic) },
      WarTabHttp: {
        request: () => Promise.resolve(null),
        createPoller: (o) => {
          if (o.owner) CLEANUPS.push(() => {});
          Promise.resolve().then(o.task);
          return { dispose() {}, pause() {}, resume() {} };
        },
      },
    });
    // graphMode off → no canvas painting in jsdom (getContext is unavailable).
    const s = Object.assign({ id: 'rm', source: 'local', refreshInterval: 5, graphMode: false, ringMode: false }, sec || {});
    const owner = document.createElement('div');
    mods['resource-monitor'].render(s, { id: 'rm' }, owner);
    return owner;
  }

  const stats = {
    cpu: 12.5,
    memory: { active: 2147483648, total: 8589934592 },
    disks: [{ mount: '/', used: 1, total: 2 }],
    network: { rx_bytes: 1000, tx_bytes: 2000 },
    hostname: 'host-1',
    uptime: { string: '3h' },
    gpu: { percent: 10, vram_used: 1073741824, vram_total: 2147483648, temp_c: 55 },
    cpu_temp: { celsius: 40 },
    processes: 120,
    disk_io: { readsectors: 100, writesectors: 200 },
  };

  it('renders synthetic metrics and hides sparkline canvases from assistive tech', async () => {
    const owner = load(stats);
    await flush(10);
    expect(owner.querySelector('.rm-val-cpu').textContent).toBe('12.5%');
    expect(owner.querySelector('.rm-val-ram').textContent).toContain('/8GB');
    expect(owner.querySelector('.rm-val-gpu').textContent).toBe('1/2GB');
    expect(owner.querySelector('.rm-host').textContent).toBe('host-1');
    expect(owner.querySelector('.rm-ts').textContent).toContain('3h');
    for (const c of owner.querySelectorAll('canvas')) expect(c.getAttribute('aria-hidden')).toBe('true');
  });

  it('disconnects its IntersectionObserver on lifecycle cleanup', async () => {
    load(stats);
    await flush(10);
    expect(OBSERVERS.length).toBe(1);
    CLEANUPS.forEach((fn) => fn());
    expect(OBSERVERS[0].disconnected).toBe(true);
  });

  it('survives a missing/empty stats payload without throwing', async () => {
    const owner = load(null);
    await flush(10);
    // No data → values keep their placeholder rather than fabricating zeros.
    expect(owner.querySelector('.rm-val-cpu').textContent).toBe('--');
  });
});

describe('network-status module', () => {
  function load(requestImpl, sec) {
    return loadModule('modules/network-status.js', {
      WarTabHttp: { request: requestImpl, createPoller: (o) => { Promise.resolve().then(o.task); return { dispose() {} }; } },
    });
  }

  it('shows an empty state when no targets are configured', async () => {
    const mods = load(() => Promise.resolve(null));
    const owner = document.createElement('div');
    mods['network-status'].render({ id: 'n0', targets: '' }, { id: 'n0' }, owner);
    mods['network-status'].onMount({ id: 'n0', targets: '' }, { id: 'n0' }, owner);
    await flush();
    expect(owner.querySelector('.ds-empty')).not.toBeNull();
    expect(owner.textContent).toContain('No network targets');
  });

  it('renders a summary and detail rows for synthetic healthy targets', async () => {
    const mods = load((url) => Promise.resolve({ alive: true, avg_ms: url.includes('1.1.1.1') ? 8 : 12 }));
    const sec = { id: 'n1', targets: 'Gateway|10.0.0.1\nDNS|1.1.1.1', refreshInterval: 60 };
    const owner = document.createElement('div');
    mods['network-status'].render(sec, { id: 'n1' }, owner);
    mods['network-status'].onMount(sec, { id: 'n1' }, owner);
    await flush(10);
    expect(owner.textContent).toContain('2/2 targets reachable');
    expect(owner.textContent).toContain('10 ms average latency');
    expect(owner.querySelectorAll('.ds-status-row.ds-status-healthy').length).toBe(2);
  });

  it('maps a ping timeout to an offline row', async () => {
    const mods = load(() => Promise.resolve({ alive: false, error: 'timeout' }));
    const sec = { id: 'n2', targets: 'Down|10.0.0.9', refreshInterval: 60 };
    const owner = document.createElement('div');
    mods['network-status'].render(sec, { id: 'n2' }, owner);
    mods['network-status'].onMount(sec, { id: 'n2' }, owner);
    await flush(10);
    expect(owner.textContent).toContain('0/1 targets reachable');
    expect(owner.querySelector('.ds-status-offline')).not.toBeNull();
  });

  it('treats a null/empty ping body as unknown instead of throwing', async () => {
    const mods = load(() => Promise.resolve(null));
    const sec = { id: 'n3', targets: 'Gateway|10.0.0.1', refreshInterval: 60 };
    const owner = document.createElement('div');
    mods['network-status'].render(sec, { id: 'n3' }, owner);
    mods['network-status'].onMount(sec, { id: 'n3' }, owner);
    await flush(10);
    expect(owner.textContent).toContain('Network checks unavailable');
    expect(owner.querySelector('.ds-status-unknown')).not.toBeNull();
  });

  it('reports a rejected ping as a check-unavailable row', async () => {
    const mods = load(() => Promise.reject(new Error('blocked')));
    const sec = { id: 'n4', targets: 'Gateway|10.0.0.1', refreshInterval: 60 };
    const owner = document.createElement('div');
    mods['network-status'].render(sec, { id: 'n4' }, owner);
    mods['network-status'].onMount(sec, { id: 'n4' }, owner);
    await flush(10);
    expect(owner.textContent).toContain('Check unavailable');
  });
});

describe('lan-scan module', () => {
  it('honours the configured label instead of the hardcoded title', () => {
    const mods = loadModule('modules/lan-scan.js', {});
    const owner = document.createElement('div');
    mods['lan-scan'].render({ label: 'My Rack', refreshInterval: 30 }, { id: 'l1' }, owner);
    expect(owner.querySelector('.lan-scan-title').textContent).toBe('My Rack');
    expect(owner.querySelector('.lan-scan-widget').dataset.refresh).toBe('30');
  });

  it('falls back to a sensible default title and stays honest about no scan endpoint', () => {
    const mods = loadModule('modules/lan-scan.js', {});
    const owner = document.createElement('div');
    mods['lan-scan'].render({}, { id: 'l2' }, owner);
    expect(owner.querySelector('.lan-scan-title').textContent).toBe('Network Scan');
    expect(owner.textContent).toContain('self-hosted WarTab server');
  });
});

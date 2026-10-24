import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const INFO = path.resolve('modules/information.js');
const POLLER = path.resolve('modules/api-poller.js');
const tick = () => new Promise((r) => setTimeout(r, 10));

// Escapes like core.js does, but deterministic for assertions.
const realEscHtml = (v) => String(v).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function baseGlobals() {
  window.registerModule = (type, def) => { window.__mods[type] = def; };
  window.ds = {
    empty: () => document.createElement('div'),
    error: () => document.createElement('div'),
    loading: () => document.createElement('div'),
    freshness: () => document.createElement('span'),
    statusRow: (o) => { const d = document.createElement('div'); d.textContent = o.label + ' ' + o.status; return d; },
  };
  window.escHtml = realEscHtml;
  window.getNested = (obj, p) => {
    if (!p) return obj;
    return String(p).split('.').reduce((c, k) => (c !== null && c !== undefined && typeof c === 'object' ? c[k] : undefined), obj);
  };
  window.openCardEditPanel = () => {};
  window.renderIcons = () => {};
}

function loadModules(file, mods) {
  window.__mods = mods || {};
  window.eval(fs.readFileSync(file, 'utf8'));
  return window.__mods;
}

// Poller stub matching http.js semantics: task() -> onData/onError.
function stubPoller(response, mode) {
  return {
    request: () => (mode === 'reject' ? Promise.reject(response) : Promise.resolve(response)),
    createPoller: (opts) => {
      const p = opts.task();
      if (p && p.then) p.then((d) => opts.onData && opts.onData(d)).catch((e) => opts.onError && opts.onError(e));
      return { dispose() {} };
    },
  };
}

afterEach(() => { delete window.registerModule; delete window.__mods; });

describe('information.py fixtures — RSS / agenda (labeled FIXTURE, not live)', () => {
  it('shows all-day (VALUE=DATE) iCal events instead of dropping them', async () => {
    baseGlobals();
    // FIXTURE iCal payload (synthetic, not a live calendar)
    const ical = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:All Day Review\nDTSTART;VALUE=DATE:20990115\nEND:VEVENT\nEND:VCALENDAR';
    window.WarTabHttp = stubPoller(ical);
    const mods = loadModules(INFO);
    const owner = document.createElement('div');
    mods.agenda.onMount({ url: 'fixture://ical', limit: 6 }, {}, owner);
    await tick();
    expect(owner.textContent).toContain('All Day Review');
  });

  it('parses UTC iCal timestamps (Z suffix) as UTC, not local', async () => {
    baseGlobals();
    const ical = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Utc Event\nDTSTART:20990115T120000Z\nEND:VEVENT\nEND:VCALENDAR';
    window.WarTabHttp = stubPoller(ical);
    const mods = loadModules(INFO);
    const owner = document.createElement('div');
    mods.agenda.onMount({ url: 'fixture://ical', limit: 6 }, {}, owner);
    await tick();
    // 12:00 UTC rendered in the local zone should not equal a naive local 12:00.
    const meta = owner.querySelector('.info-meta')?.textContent || '';
    const expected = new Date('2099-01-15T12:00:00Z').toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    expect(meta).toBe(expected);
  });

  it('does not render "Invalid Date" for a malformed RSS pubDate', async () => {
    baseGlobals();
    const xml = '<?xml version="1.0"?><rss><channel><item><title>Bad date</title><link>https://example.com/a</link><pubDate>not-a-real-date</pubDate></item></channel></rss>';
    window.WarTabHttp = stubPoller(xml);
    const mods = loadModules(INFO);
    const owner = document.createElement('div');
    mods.rss.onMount({ url: 'fixture://rss', limit: 6 }, {}, owner);
    await tick();
    expect(owner.textContent).not.toContain('Invalid Date');
    expect(owner.querySelector('a.info-row .info-title')?.textContent).toBe('Bad date');
  });
});

describe('information.js markdown readability', () => {
  it('wraps consecutive list items in a <ul>', () => {
    baseGlobals();
    const mods = loadModules(INFO);
    const owner = document.createElement('div');
    mods.markdown.render({ content: '- first\n- second' }, {}, owner);
    const ul = owner.querySelector('ul');
    expect(ul).not.toBeNull();
    expect(ul.querySelectorAll('li').length).toBe(2);
  });
});

describe('api-poller.js format + error handling (FIXTURE data)', () => {
  it('returns a placeholder (not NaN) for non-numeric bytes/duration/percent', () => {
    baseGlobals();
    loadModules(POLLER);
    expect(window.fmtBytes('not-a-number')).toBe('—');
    expect(window.fmtDuration('not-a-number')).toBe('—');
    expect(window.fmtPercent('not-a-number')).toBe('—');
    expect(window.fmtBytes(2048)).toBe('2.0 KB');
    expect(window.fmtPercent(42.5)).toBe('42.5%');
  });

  it('renders mapped fixture values through the poller (list mode)', async () => {
    baseGlobals();
    // FIXTURE JSON payload (synthetic, not a live API)
    window.WarTabHttp = stubPoller({ data: { amount: 1500 } });
    const mods = loadModules(POLLER);
    const owner = document.createElement('div');
    mods['api-poller'].render({
      url: 'fixture://api', method: 'GET', display: 'list',
      mappings: [{ field: 'data.amount', label: 'Amount', format: 'number' }],
    }, {}, owner);
    await tick();
    expect(owner.textContent).toContain('Amount');
    expect(owner.textContent).toContain('1,500');
  });

  it('surfaces a non-Error rejection instead of "undefined"', async () => {
    baseGlobals();
    window.WarTabHttp = stubPoller('backend exploded', 'reject');
    const mods = loadModules(POLLER);
    const owner = document.createElement('div');
    mods['api-poller'].render({ url: 'fixture://api', mappings: [{ field: 'x', label: 'X' }] }, {}, owner);
    await tick();
    expect(owner.textContent).not.toContain('undefined');
    expect(owner.textContent).toContain('backend exploded');
  });
});

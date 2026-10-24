import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

/* Regression tests for the timer / weather / search / clock / quotes modules.
   Each module is eval'd into jsdom with the globals it expects mocked. */

function loadModule(file) {
  let def;
  window.registerModule = (_type, definition) => { def = definition; };
  window.eval(fs.readFileSync(path.resolve(file), 'utf8'));
  delete window.registerModule;
  return def;
}

function host() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  delete window.registerModule;
  delete window.WarTabLifecycle;
  delete window.WarTabHttp;
  delete window.doSearch;
  delete window.saveConfig;
  delete window.ds;
  delete window.renderIcons;
  delete window.openCardEditPanel;
  delete window.cpHint;
  delete window.cpLabel;
  delete window.cpSelect;
});

describe('timer module — state and duration handling', () => {
  it('coerces configured durations to positive whole seconds', () => {
    loadModule('modules/timer.js');
    expect(window.timerSeconds(1500)).toBe(1500);
    expect(window.timerSeconds('300')).toBe(300);
    expect(window.timerSeconds(-5)).toBe(300);
    expect(window.timerSeconds(0)).toBe(300);
    expect(window.timerSeconds(undefined)).toBe(300);
    expect(window.timerSeconds(NaN, 120)).toBe(120);
  });

  it('renders a fallback duration instead of "-1:-5" for a negative duration', () => {
    const timer = loadModule('modules/timer.js');
    window.WarTabLifecycle = { addCleanup: () => {} };
    const cw = host();
    timer.render({ id: 't-neg', mode: 'interval', duration: -5, presets: '' }, {}, cw);
    expect(cw.querySelector('.timer-display').textContent).toBe('05:00');
  });

  it('shows an explicit message for an unparsable countdown date', () => {
    const timer = loadModule('modules/timer.js');
    window.WarTabLifecycle = { addCleanup: () => {} };
    const cw = host();
    timer.render({ id: 't-bad', mode: 'countdown', targetDate: 'not-a-date' }, {}, cw);
    expect(cw.querySelector('.timer-display').textContent).toBe('--:--');
    expect(cw.querySelector('.timer-info').textContent).toBe('Invalid target date');
    expect(cw.textContent).not.toMatch(/NaN/);
  });

  it('counts down one second per tick from a valid interval start', () => {
    vi.useFakeTimers();
    const timer = loadModule('modules/timer.js');
    window.WarTabLifecycle = { addCleanup: () => {} };
    const cw = host();
    timer.render({ id: 't-go', mode: 'interval', duration: 10, presets: '' }, {}, cw);
    const start = cw.querySelector('.timer-actions button');
    expect(cw.querySelector('.timer-display').textContent).toBe('00:10');
    start.click();
    vi.advanceTimersByTime(1000);
    expect(cw.querySelector('.timer-display').textContent).toBe('00:09');
    vi.advanceTimersByTime(9000);
    expect(cw.querySelector('.timer-display').textContent).toBe('★ TIME UP ★');
  });
});

describe('search module — URL input and engine accessibility', () => {
  it('renders without a search config and never opens "undefined" engines', () => {
    const search = loadModule('modules/search.js');
    window.doSearch = vi.fn();
    window.saveConfig = vi.fn();
    const cw = host();
    window.config = { pageOrder: [], pages: {}, search: {} };
    const sec = { id: 's1' };
    expect(() => search.render(sec, {}, cw)).not.toThrow();
    const input = cw.querySelector('input');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.getAttribute('spellcheck')).toBe('false');
    expect(input.getAttribute('enterkeyhint')).toBe('search');
    const tagEl = cw.querySelector('.search-engine-tag');
    expect(tagEl.getAttribute('aria-label')).toContain('Search engine');
    expect(tagEl.type).toBe('button');
    tagEl.click(); // no engines configured — must be a no-op, not undefined
    expect(tagEl.textContent).toBe('Google');
    expect(sec.engine).toBeUndefined();
  });

  it('cycles to the next configured engine and updates the aria label', () => {
    const search = loadModule('modules/search.js');
    window.doSearch = vi.fn();
    window.saveConfig = vi.fn();
    const cw = host();
    window.config = {
      pageOrder: [], pages: {},
      search: { engines: { Google: 'https://g/?q=', DuckDuckGo: 'https://d/?q=' }, selected: 'Google' },
    };
    const sec = { id: 's2' };
    search.render(sec, {}, cw);
    const tagEl = cw.querySelector('.search-engine-tag');
    tagEl.click();
    expect(sec.engine).toBe('DuckDuckGo');
    expect(tagEl.textContent).toBe('DuckDuckGo');
    expect(tagEl.getAttribute('aria-label')).toContain('DuckDuckGo');
  });

  it('gives every search card a unique suggestion-list id even without a section id', () => {
    const search = loadModule('modules/search.js');
    window.doSearch = vi.fn();
    window.saveConfig = vi.fn();
    window.config = { pageOrder: [], pages: {}, search: {} };
    const a = host(), b = host();
    search.render({}, {}, a);
    search.render({}, {}, b);
    expect(a.querySelector('datalist').id).not.toBe(b.querySelector('datalist').id);
    expect(a.querySelector('input').getAttribute('list')).toBe(a.querySelector('datalist').id);
  });
});

describe('weather module — cache validity and missing data', () => {
  function setupWeather() {
    const weather = loadModule('modules/weather.js');
    const requests = [];
    window.ds = {
      // Faithful enough: append the content/secondary nodes the module passes.
      card: (opts) => {
        const el = document.createElement('div');
        el.className = 'ds-module';
        const nodes = [].concat((opts && opts.content) || [], (opts && opts.secondary) || []);
        nodes.forEach((n) => { if (n) el.appendChild(n); });
        return el;
      },
      loading: () => document.createElement('div'),
      timestamp: () => document.createElement('span'),
      badge: () => document.createElement('span'),
      empty: () => document.createElement('div'),
      error: () => document.createElement('div'),
      freshness: () => document.createElement('span'),
    };
    window.renderIcons = () => {};
    window.openCardEditPanel = () => {};
    window.WarTabLifecycle = { addCleanup: () => {} };
    window.WarTabHttp = {
      request: (url) => { requests.push(url); return Promise.resolve({ results: [{ latitude: 1, longitude: 2 }] }); },
      // Mirror the real poller: run the task immediately, no interval loop.
      createPoller: (opts) => { opts.task(); return { dispose() {} }; },
    };
    return { weather, requests };
  }

  const data = {
    current_weather: { temperature: 20, weathercode: 2, windspeed: 5, time: '2026-10-23T10:00' },
    daily: { temperature_2m_max: [25], temperature_2m_min: [15], weathercode: [2], precipitation_probability_max: [10] },
  };

  it('serves a fresh cache for the same location and units without refetching', () => {
    const { weather, requests } = setupWeather();
    const sec = { id: 'w1', zip: '90210', country: 'US', units: 'celsius' };
    localStorage.setItem('wartab.weather.w1', JSON.stringify({ ts: Date.now(), key: '90210|US|celsius', lat: 1, lon: 2, data }));
    const cw = host();
    weather.render(sec, {}, cw);
    weather.onMount(sec, {}, cw);
    expect(cw.querySelector('.weather-temp').textContent).toBe('20°C');
    expect(requests).toEqual([]);
  });

  it('ignores a cache written for different units and refetches', () => {
    const { weather, requests } = setupWeather();
    const sec = { id: 'w2', zip: '90210', country: 'US', units: 'fahrenheit' };
    localStorage.setItem('wartab.weather.w2', JSON.stringify({ ts: Date.now(), key: '90210|US|celsius', lat: 1, lon: 2, data }));
    const cw = host();
    weather.render(sec, {}, cw);
    weather.onMount(sec, {}, cw);
    expect(requests.some((u) => u.includes('geocoding-api.open-meteo.com'))).toBe(true);
  });

  it('ignores a legacy cache without a key', () => {
    const { weather, requests } = setupWeather();
    const sec = { id: 'w3', zip: '90210', country: 'US', units: 'celsius' };
    localStorage.setItem('wartab.weather.w3', JSON.stringify({ ts: Date.now(), lat: 1, lon: 2, data }));
    const cw = host();
    weather.render(sec, {}, cw);
    weather.onMount(sec, {}, cw);
    expect(requests.some((u) => u.includes('geocoding-api.open-meteo.com'))).toBe(true);
  });

  it('does not fabricate 0° / 0% when the API returns null values', () => {
    const { weather } = setupWeather();
    const sec = { id: 'w4', zip: '90210', country: 'US', units: 'celsius' };
    const nullData = {
      current_weather: { temperature: 20, weathercode: 0, windspeed: 0, time: '2026-10-23T10:00' },
      daily: { temperature_2m_max: [null], temperature_2m_min: [null], weathercode: [0], precipitation_probability_max: [null] },
    };
    localStorage.setItem('wartab.weather.w4', JSON.stringify({ ts: Date.now(), key: '90210|US|celsius', lat: 1, lon: 2, data: nullData }));
    const cw = host();
    weather.render(sec, {}, cw);
    weather.onMount(sec, {}, cw);
    expect(cw.querySelector('.weather-main')).not.toBeNull();
    expect(cw.textContent).not.toMatch(/High 0°|Low 0°|0% precipitation|null|NaN/);
    expect(cw.querySelectorAll('.weather-fc-day').length).toBe(0);
  });
});

describe('clock module — minute-accurate refresh', () => {
  function mountClock(sec) {
    const clock = loadModule('modules/clock.js');
    const cw = host();
    clock.render(sec, {}, cw);
    const cleanup = clock.onMount(sec, {}, cw);
    return { cw, cleanup };
  }

  it('shows the new minute as soon as the boundary passes (no 10s staleness)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T10:00:55'));
    const { cw } = mountClock({ id: 'c1', format24h: false, showDate: true, showCalendar: false, zones: [] });
    expect(cw.querySelector('.clock-time').textContent).toBe('10:00 AM');
    vi.advanceTimersByTime(9000); // 10:01:04
    expect(cw.querySelector('.clock-time').textContent).toBe('10:01 AM');
  });

  it('renders a correct month grid and highlights today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T10:00:05'));
    const { cw } = mountClock({ id: 'c2', format24h: true, showDate: true, showCalendar: true, zones: [] });
    expect(cw.querySelector('.calendar-month').textContent).toBe('October 2026');
    expect(cw.querySelectorAll('.calendar-day:not(.other-month)').length).toBe(31);
    expect(cw.querySelector('.calendar-day.today').textContent).toBe('23');
  });

  it('stops scheduling ticks after cleanup', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T10:00:30'));
    const { cw, cleanup } = mountClock({ id: 'c3', format24h: true, showDate: true, showCalendar: false, zones: [] });
    cleanup();
    vi.advanceTimersByTime(180000);
    expect(cw.querySelector('.clock-time').textContent).toBe('10:00');
  });
});

describe('quotes module — malformed entries', () => {
  it('never prints "undefined" for a quote missing its author', () => {
    const quotes = loadModule('modules/quotes.js');
    const bd = host();
    window.cpHint = () => document.createElement('div');
    window.cpLabel = () => document.createElement('div');
    window.cpSelect = () => document.createElement('select');
    quotes.editor({ id: 'q1', quotes: [{ q: 'Stay lazy' }], rotationMode: 'sequential' }, {}, bd);
    expect(bd.textContent).toContain('Stay lazy');
    expect(bd.textContent).toContain('— Anonymous');
    expect(bd.textContent).not.toContain('undefined');
  });
});

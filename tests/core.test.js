import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

let core;

function loadCore(exposedNames, globals) {
  core = loadBrowserScript('core.js', exposedNames, globals);
  return core.exports;
}

afterEach(() => {
  core?.cleanup();
  core = undefined;
});

describe('escHtml (production core.js)', () => {
  it('escapes markup, ampersands, and both quote types', () => {
    const { escHtml } = loadCore(['escHtml']);

    expect(escHtml(`<script data-value="it's & unsafe">`)).toBe(
      '&lt;script data-value=&quot;it&#39;s &amp; unsafe&quot;&gt;',
    );
  });

  it('leaves plain text and the empty string unchanged', () => {
    const { escHtml } = loadCore(['escHtml']);

    expect(escHtml('hello world')).toBe('hello world');
    expect(escHtml('')).toBe('');
  });
});

describe('isLucideName (production core.js)', () => {
  it('recognizes curated icon names and rejects other values', () => {
    const { isLucideName } = loadCore(['isLucideName']);

    expect(isLucideName('activity')).toBe(true);
    expect(isLucideName('sword')).toBe(true);
    expect(isLucideName('nonexistent')).toBe(false);
    expect(isLucideName('')).toBe(false);
    expect(isLucideName(null)).toBe(false);
    expect(isLucideName(42)).toBe(false);
  });

  it('uses a controlled Lucide icon registry when one is available', () => {
    const lucide = { icons: { CustomIcon: {} } };
    const { isLucideName } = loadCore(['isLucideName'], { lucide });

    expect(isLucideName('custom-icon')).toBe(true);
    expect(isLucideName('activity')).toBe(false);
    expect(isLucideName('https://example.test/icon.svg')).toBe(false);
    expect(isLucideName('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isLucideName('/icon.svg')).toBe(false);
  });
});

describe('renderIcons (production core.js)', () => {
  it('filters only missing icon names without replacing console methods', () => {
    const lucide = { icons: { Activity: {} }, createIcons: vi.fn() };
    const originalWarn = console.warn;
    const { renderIcons } = loadCore(['renderIcons'], { lucide });
    core.document.body.innerHTML = '<i id="valid" data-lucide="activity"></i><i id="missing" data-lucide="missing"></i>';

    renderIcons();

    expect(core.document.querySelector('#valid').getAttribute('data-lucide')).toBe('activity');
    expect(core.document.querySelector('#missing').hasAttribute('data-lucide')).toBe(false);
    expect(lucide.createIcons).toHaveBeenCalledTimes(1);
    expect(console.warn).toBe(originalWarn);
  });

  it('reports unexpected Lucide failures only once', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const lucide = { icons: {}, createIcons: vi.fn(() => { throw new Error('broken'); }) };
    const { renderIcons } = loadCore(['renderIcons'], { lucide });

    renderIcons();
    renderIcons();

    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});

describe('uid (production core.js)', () => {
  it('returns unique DOM-safe string identifiers without asserting random values', () => {
    const { uid } = loadCore(['uid']);
    const ids = Array.from({ length: 25 }, () => uid());

    expect(ids.every((id) => typeof id === 'string')).toBe(true);
    expect(ids.every((id) => /^[a-z0-9]+$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('cloneObj (production core.js)', () => {
  it('deep-clones JSON-compatible objects and arrays', () => {
    const { cloneObj } = loadCore(['cloneObj']);
    const original = { name: 'WarTab', nested: { enabled: true }, values: [1, [2, 3]] };
    const cloned = cloneObj(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.nested).not.toBe(original.nested);
    expect(cloned.values).not.toBe(original.values);
    cloned.values[1][0] = 99;
    expect(original.values[1][0]).toBe(2);
  });

  it('preserves null through its JSON round trip', () => {
    const { cloneObj } = loadCore(['cloneObj']);

    expect(cloneObj(null)).toBeNull();
  });
});

const NOW = 1_800_000_000_000;

describe('timeAgo (production core.js)', () => {
  it('formats elapsed seconds, minutes, hours, and days at production boundaries', () => {
    const { timeAgo } = loadCore(['timeAgo'], { Date: { now: () => NOW } });

    expect(timeAgo(NOW - 2_000)).toBe('2s ago');
    expect(timeAgo(NOW - 59_000)).toBe('59s ago');
    expect(timeAgo(NOW - 60_000)).toBe('1m ago');
    expect(timeAgo(NOW - 3_599_000)).toBe('59m ago');
    expect(timeAgo(NOW - 3_600_000)).toBe('1h ago');
    expect(timeAgo(NOW - 86_399_000)).toBe('23h ago');
    expect(timeAgo(NOW - 86_400_000)).toBe('1d ago');
    expect(timeAgo(NOW - 172_800_000)).toBe('2d ago');
  });
});

describe('getNested (production core.js)', () => {
  it('traverses dot paths, including array indices', () => {
    const { getNested } = loadCore(['getNested']);
    const value = {
      data: { amount: '100.50' },
      results: [{ name: 'Alice' }],
    };

    expect(getNested(value, 'data.amount')).toBe('100.50');
    expect(getNested(value, 'results.0.name')).toBe('Alice');
    expect(getNested(value, 'data.missing')).toBeUndefined();
    expect(getNested(value, '')).toBe(value);
  });

  it('returns undefined when traversal continues through a primitive or null', () => {
    const { getNested } = loadCore(['getNested']);

    expect(getNested({ count: 0 }, 'count.value')).toBeUndefined();
    expect(getNested(null, 'anything')).toBeUndefined();
  });
});

describe('registerModule (production core.js)', () => {
  it('registers a module by type and replaces that registry entry', () => {
    const { CARD_MODULES, registerModule } = loadCore(['CARD_MODULES', 'registerModule']);
    const first = { render: () => 'first' };
    const replacement = { render: () => 'replacement' };

    registerModule('example', first);
    expect(CARD_MODULES.example).toBe(first);

    registerModule('example', replacement);
    expect(CARD_MODULES.example).toBe(replacement);
  });

  it('injects module CSS once per type', () => {
    const { CARD_MODULES, registerModule } = loadCore(['CARD_MODULES', 'registerModule']);
    const first = { css: '.example { color: red; }' };
    const replacement = { css: '.example { color: blue; }' };

    registerModule('example', first);
    registerModule('example', replacement);
    registerModule('other', { css: '.other { display: block; }' });

    const exampleStyles = core.document.querySelectorAll('#mod-css-example');
    expect(exampleStyles).toHaveLength(1);
    expect(exampleStyles[0].textContent).toBe(first.css);
    expect(core.document.querySelectorAll('head style')).toHaveLength(2);
    expect(core.document.querySelector('#mod-css-other').textContent).toBe(
      '.other { display: block; }',
    );
    expect(CARD_MODULES.example).toBe(replacement);
  });

  it('does not inject a style element when the module has no CSS', () => {
    const { registerModule } = loadCore(['registerModule']);

    registerModule('plain', { render: () => 'plain' });

    expect(core.document.querySelector('#mod-css-plain')).toBeNull();
    expect(core.document.querySelectorAll('head style')).toHaveLength(0);
  });
});

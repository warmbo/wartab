import { afterEach, describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

let loaded;
afterEach(() => loaded?.cleanup());

describe('theme branding', () => {
  it('treats imported brand icon URLs as attribute data, not markup', () => {
    const malicious = 'https://example.test/icon.png\" onerror=\"globalThis.__injected=1';
    const config = {
      theme: {
        bgType: 'solid', bgValue: '#000000', blur: 0, glow: '#336699',
        fontSizeText: 14, fontSizeHeading: 16, topBarScale: 1,
        fontFamily: 'Inter', cardBg: 'dark', cardOpacity: 1,
        cardRadius: 0, fontColor: '#cccccc', animations: true, showAccentBar: true,
      },
      branding: { title: 'Safe title', icon: malicious },
    };
    loaded = loadBrowserScript('theme.js', ['applyTheme'], {
      config,
      DEFAULT_CONFIG: config,
      $: selector => loaded.document.querySelector(selector),
      isLucideName: () => false,
      escHtml: value => String(value),
    });
    loaded.document.body.innerHTML = '<div id="bg-canvas"></div><div id="brand-text"></div>';

    loaded.exports.applyTheme();

    const image = loaded.document.querySelector('#brand-text img');
    expect(image.getAttribute('src')).toBe(malicious);
    expect(image.hasAttribute('onerror')).toBe(false);
    expect(loaded.window.__injected).toBeUndefined();
  });

  it('keeps the generated typography scale monotonic at every supported body-size extreme', () => {
    const config = {
      theme: {
        bgType: 'solid', bgValue: '#000000', blur: 0, glow: '#336699',
        fontSizeText: 14, fontSizeHeading: 16, topBarScale: 1,
        fontFamily: 'Inter', cardBg: 'dark', cardOpacity: 1,
        cardRadius: 0, fontColor: '#cccccc', animations: true, showAccentBar: true,
      },
      branding: { title: 'Typography', icon: 'type' },
    };
    loaded = loadBrowserScript('theme.js', ['applyTheme'], {
      config,
      DEFAULT_CONFIG: config,
      $: selector => loaded.document.querySelector(selector),
      isLucideName: () => true,
    });
    loaded.document.body.innerHTML = '<div id="bg-canvas"></div><div id="brand-text"></div>';

    for (const size of [10, 14, 28]) {
      config.theme.fontSizeText = size;
      config.theme.fontSizeHeading = size === 28 ? 10 : 16;
      loaded.exports.applyTheme();
      const root = loaded.document.documentElement;
      const names = ['--text-3xs', '--text-2xs', '--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl', '--text-4xl', '--text-5xl'];
      const values = names.map(name => Number.parseFloat(root.style.getPropertyValue(name)));
      expect(values.every(Number.isFinite)).toBe(true);
      expect(values.every((value, index) => index === 0 || value >= values[index - 1])).toBe(true);
      expect(Number.parseFloat(root.style.getPropertyValue('--type-card-title'))).toBeGreaterThan(values[4]);
    }

    expect(loaded.document.documentElement.style.fontSize).toBe('');
  });
});

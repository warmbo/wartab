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
});

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

describe('accent foreground token', () => {
  const baseTheme = (glow, cardBg) => ({
    bgType: 'solid', bgValue: '#000000', blur: 0, glow,
    fontSizeText: 14, fontSizeHeading: 16, topBarScale: 1,
    fontFamily: 'Inter', cardBg, cardOpacity: 1, cardRadius: 16,
    fontColor: '#cccccc', animations: true, showAccentBar: true,
  });
  const relativeLuminance = (hex) => {
    const c = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255);
    const f = v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a, b) => {
    const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  function apply(glow, cardBg) {
    const config = { theme: baseTheme(glow, cardBg), branding: { title: 'T', icon: 'x' } };
    loaded = loadBrowserScript('theme.js', ['applyTheme'], {
      config,
      DEFAULT_CONFIG: config,
      $: selector => loaded.document.querySelector(selector),
      isLucideName: () => true,
    });
    loaded.document.body.innerHTML = '<div id="bg-canvas"></div><div id="brand-text"></div>';
    loaded.exports.applyTheme();
    return loaded.document.documentElement;
  }

  it('derives a WCAG-AA foreground when the accent is black on a dark card', () => {
    const root = apply('#000000', 'dark');
    const fg = root.style.getPropertyValue('--accent-fg');
    expect(fg).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrast(fg, '#000000')).toBeGreaterThanOrEqual(4.5);
  });

  it('stays WCAG-AA readable for a bright accent on a light card', () => {
    const root = apply('#ffee00', 'light');
    expect(contrast(root.style.getPropertyValue('--accent-fg'), '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps saturated accents and primary action text readable in both modes', () => {
    loaded = loadBrowserScript('theme.js', ['accentForeground']);
    for (const color of ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#888888']) {
      for (const mode of ['dark','light']) {
        const fg=loaded.exports.accentForeground(color,mode);
        expect(contrast(fg,mode==='dark'?'#111111':'#f0f0f0')).toBeGreaterThanOrEqual(4.5);
        expect(contrast(fg,mode==='dark'?'#111111':'#ffffff')).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it('leaves the user\'s ornamental accent choice untouched', () => {
    const root = apply('#000000', 'dark');
    expect(root.style.getPropertyValue('--accent')).toBe('#000000');
    expect(root.style.getPropertyValue('--accent-glow')).toBe('rgba(0,0,0,0.3)');
  });
});

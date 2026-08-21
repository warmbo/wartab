import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';
const read = p => fs.readFileSync(p, 'utf8');

describe('plan-driven startpage gaps', () => {
  it('exposes Toggle Theme and Refresh Data from the command palette', () => {
    const palette = read('command-palette.js');
    expect(palette).toContain('Toggle Theme');
    expect(palette).toContain('Refresh Data');
    expect(palette).toContain('typeof toggleTheme');
    expect(palette).toContain('typeof refreshAllCards');
  });

  it('surfaces recent searches in the palette and ranks them on empty query', () => {
    const palette = read('command-palette.js');
    expect(palette).toContain('wartab.search.history');
    expect(palette).toContain("kind: 'recent-search'");
    expect(palette).toContain('emptyBoost');
  });

  it('implements theme toggle and full-card refresh helpers', () => {
    const theme = read('theme.js');
    expect(theme).toContain('function toggleTheme');
    expect(theme).toContain('followSystem = false');
    const render = read('render.js');
    expect(render).toContain('function refreshAllCards');
    expect(render).toContain('rerenderCard(card)');
  });

  it('adds a Search settings tab with engine management', () => {
    const panel = read('config-panel.js');
    expect(panel).toContain("{id:'search',label:'Search',icon:'search'}");
    expect(panel).toContain('function buildSearchPanel');
    expect(panel).toContain('Default Engine');
    expect(panel).toContain('+ Add Engine');
    expect(panel).toContain('config.search.engines');
  });

  it('attaches value tooltips to status rows and freshness labels', () => {
    const design = read('design-system.js');
    expect(design).toContain('row.title = opts.title');
    expect(design).toContain('el.title = new Date(');
    expect(design).toContain('data is stale');
  });

  it('removed the audited dead CSS selectors', () => {
    const css = read('style.css');
    for (const dead of [
      '.btn-icon-sm', '.cs-grid', '.cs-full', '.cs-gap',
      '.se-style-panel', '.se-style-summary', '.se-style-body',
      '.se-field-group', '.se-field-group-title', '.lan-scan-new',
      '.media-card-title', '.clock-separator', '.ds-pulse',
      '.ds-module-icon-emoji', '.icon-picker-body', '#footer-sep',
      '.form-group', '.mod-only-medium', '.mod-only-large',
      '.mod-only-expanded', '.search-wrap',
    ]) {
      expect(css, `dead selector ${dead} should be removed`).not.toContain(dead);
    }
  });

  it('executes the new Search settings panel without errors', () => {
    const panel = loadBrowserScript('config-panel.js', ['buildSearchPanel'], {
      el: (tag, style, text, ...children) => {
        const e = document.createElement(tag || 'div');
        if (style) e.style.cssText = style;
        if (text != null && text !== '') e.textContent = text;
        children.forEach(c => { if (c) e.appendChild(c); });
        return e;
      },
      config: { search: { selected: 'Google', openInNewTab: true, engines: { Google: 'https://google.com/search?q=', DuckDuckGo: 'https://duckduckgo.com/?q=' } } },
      saveConfig: () => {},
    });
    const body = panel.document.createElement('div');
    expect(() => panel.exports.buildSearchPanel(body)).not.toThrow();
    expect(body.textContent).toContain('Default Engine');
    expect(body.textContent).toContain('Google');
    expect(body.textContent).toContain('DuckDuckGo');
    panel.cleanup();
  });

  it('executes theme toggle and card refresh helpers without errors', () => {
    // theme.js declares its own applyTheme(); the injected saveConfig/applyTheme
    // are shadowed, so we stub $ to return a fake #bg-canvas the real applyTheme
    // can mutate, and observe the flip via the cardBg on the root dataset.
    const fakeStyle = { setProperty: () => {}, background: '' };
    const fakeEl = { style: fakeStyle, dataset: {}, setAttribute: () => {}, replaceChildren: () => {}, innerHTML: '' };
    const cfg = { theme: { cardBg: 'dark', glow: '#888888', fontSizeText: 14, fontSizeHeading: 16, fontFamily: 'Inter', animations: true, showAccentBar: true, followSystem: false }, branding: { title: 'WarTab', icon: 'sword' } };
    const theme = loadBrowserScript('theme.js', ['toggleTheme'], {
      config: cfg,
      DEFAULT_CONFIG: { theme: { bgValue: '#0a0a0a, #1a1a1a' }, branding: { title: 'WarTab', icon: 'sword' } },
      saveConfig: () => {},
      toast: () => {},
      loadGoogleFont: () => {},
      $: (sel) => sel === '#bg-canvas' ? fakeEl : null,
      isLucideName: () => false,
      renderLucideEl: () => null,
    });
    expect(() => theme.exports.toggleTheme()).not.toThrow();
    expect(cfg.theme.cardBg).toBe('light');
    theme.cleanup();

    const render = loadBrowserScript('render.js', ['refreshAllCards'], {
      config: { cards: [] },
      toast: () => {},
      renderIcons: () => {},
      renderCard: () => document.createElement('div'),
      WarTabLifecycle: { cleanupSubtree: () => {} },
    });
    expect(() => render.exports.refreshAllCards()).not.toThrow();
    render.cleanup();
  });

  it('gives proxmox the shared freshness and retry error contract', () => {
    const proxmox = read('modules/proxmox.js');
    expect(proxmox).toContain("ds.freshness(Date.now(), 180000)");
    expect(proxmox).toContain("ds.error('Proxmox unavailable'");
    expect(proxmox).toContain("label: 'Retry'");
    expect(proxmox).toContain("onClick: load");
    expect(proxmox).not.toContain("⚠ ' + escHtml(err.message) + '</div>'");
  });
});

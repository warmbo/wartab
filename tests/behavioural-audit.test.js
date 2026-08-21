import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';
const read = p => fs.readFileSync(p, 'utf8');

describe('behavioural audit fixes', () => {
  it('defines the --radius surface token in :root', () => {
    const css = read('style.css');
    expect(css).toContain('--radius: var(--radius-md)');
    expect(css).toContain('--control-radius: var(--radius-sm)');
  });

  it('derives surface and control radius from the card-radius setting in theme.js', () => {
    const theme = read('theme.js');
    expect(theme).toContain("root.style.setProperty('--radius'");
    expect(theme).toContain("root.style.setProperty('--control-radius'");
    expect(theme).toContain('Math.max(2, Math.min(cardR || 16, 24))');
    expect(theme).toContain('Math.max(3, Math.min(Math.round((cardR || 16) / 2), 12))');
  });

  it('raises modals above the ux overlays so confirms are never hidden', () => {
    const css = read('style.css');
    const modalLine = css.split('\n').find(l => l.includes('.modal-overlay') && l.includes('z-index'));
    expect(modalLine).toContain('calc(var(--z-modal) + 40)');
    const uxLine = css.split('\n').find(l => l.includes('.ux-overlay') && l.includes('z-index'));
    expect(uxLine).toContain('calc(var(--z-modal) + 30)');
  });

  it('removes the persistent will-change stacking-context hint from base cards', () => {
    const css = read('style.css');
    // Base .card rules must not carry will-change (stacking-context trap)
    expect(css).not.toContain('.card { will-change: transform;');
    expect(css).not.toContain('.card { transition: var(--transition-card); will-change: transform; }');
    // Drag keeps the hint where transform actually animates
    expect(css).toContain('.card.dragging { opacity: 0.25; transform: scale(0.96); will-change: transform;');
  });

  it('routes inner controls and surfaces through radius tokens instead of hardcoded px', () => {
    const css = read('style.css');
    expect(css).toContain('.palette-item {\n  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;\n  padding: 10px 12px; background: transparent; border: none; border-radius: var(--control-radius);');
    expect(css).toContain('.context-edit-actions button{min-height:38px;display:flex;align-items:center;gap:6px;padding:0 9px;border:0;border-radius:var(--control-radius)');
    expect(css).toContain('.command-deck-menu button{width:100%;min-height:38px;display:flex;align-items:center;gap:9px;padding:8px 10px;border:0;border-radius:var(--control-radius)');
    expect(css).toContain('.modal-box { background:var(--surface-panel)');
    expect(css).not.toContain('.modal-box { background:#151515');
  });

  it('keeps theme toggle functional with the new radius writes', () => {
    const fakeStyle = { setProperty: () => {}, background: '' };
    const fakeEl = { style: fakeStyle, dataset: {}, setAttribute: () => {}, replaceChildren: () => {}, innerHTML: '' };
    const cfg = { theme: { cardBg: 'dark', glow: '#888888', fontSizeText: 14, fontSizeHeading: 16, fontFamily: 'Inter', animations: true, showAccentBar: true, followSystem: false, cardRadius: 16 }, branding: { title: 'WarTab', icon: 'sword' } };
    const h = loadBrowserScript('theme.js', ['toggleTheme'], {
      config: cfg,
      DEFAULT_CONFIG: { theme: { bgValue: '#0a0a0a, #1a1a1a' }, branding: { title: 'WarTab', icon: 'sword' } },
      saveConfig: () => {},
      toast: () => {},
      loadGoogleFont: () => {},
      $: (sel) => sel === '#bg-canvas' ? fakeEl : null,
      isLucideName: () => false,
      renderLucideEl: () => null,
    });
    expect(() => h.exports.toggleTheme()).not.toThrow();
    expect(cfg.theme.cardBg).toBe('light');
    h.cleanup();
  });

  it('renders the command deck header, group labels, and separator', () => {
    const html = read('index.html');
    expect(html).toContain('command-deck-head');
    expect(html).toContain('command-deck-eyebrow');
    expect(html).toContain('command-deck-tag');
    expect(html).toContain('command-deck-label');
    expect(html).toContain('command-deck-sep');
    expect(html).toContain('id="deck-version"');
    expect(read('app.js')).toContain("var dv=$('#deck-version')");
    const css = read('style.css');
    expect(css).toContain('.command-deck-eyebrow');
    expect(css).toContain('.command-deck-sep');
  });
});

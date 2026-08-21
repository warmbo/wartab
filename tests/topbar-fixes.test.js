import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

describe('top bar fixes', () => {
  it('command trigger has a fixed width, not a stretching 1fr column', () => {
    const css = readFileSync('style.css', 'utf8');
    const cmd = css.match(/\.command-trigger \{[^}]*\}/)?.[0] || '';
    expect(cmd).toContain('width:190px');
    // The command-deck grid rule (not the base flex rule) must not give the
    // command trigger a stretchy 1fr column — fixed 190px instead.
    const deckGrid = css.match(/#top-bar \{ display:grid; grid-template-columns:[^}]*\}/)?.[0] || '';
    expect(deckGrid).toContain('grid-template-columns:auto minmax(100px,1fr) auto auto auto');
    expect(deckGrid).not.toContain('minmax(190px,340px)');
  });

  it('telemetry dropdown opens as a rich panel with row layout + hint', () => {
    const css = readFileSync('style.css', 'utf8');
    expect(css).toContain('.telemetry-disclosure[open] #top-stats{');
    expect(css).toContain('width:280px');
    expect(css).toContain('.telemetry-disclosure[open] #top-stats .stat-item{');
    expect(css).toContain('flex-direction:column');
    const stats = readFileSync('stats.js', 'utf8');
    expect(stats).toContain("hint.className='telemetry-hint'");
  });

  it('command deck menu: no hidden attr + CSS closed-state fallback', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('popover="auto"');
    expect(html).not.toContain('popover="auto" hidden');
    const css = readFileSync('style.css', 'utf8');
    expect(css).toContain('.command-deck-menu:not(:popover-open){display:none}');
  });
});

import { readFileSync } from 'node:fs';

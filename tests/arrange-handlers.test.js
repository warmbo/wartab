import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

let loaded;
afterEach(() => loaded?.cleanup());

describe('card handlers after arrange-mode swaps', () => {
  it('removes a moved gap by identity instead of its original render index', () => {
    const gap = { id: 'gap-1', _isGap: true, width: 1, height: 1 };
    const card = { id: 'card-1' };
    const config = {
      cards: [gap, card],
      pages: { home: { cols: 4 } },
      currentPage: 'home',
      layout: { cols: 4 },
    };
    loaded = loadBrowserScript('render.js', ['renderCard'], {
      config,
      saveConfig: vi.fn(),
      renderAll: vi.fn(),
      toast: vi.fn(),
      ds: { icon: () => loaded.document.createElement('i') },
    });
    const gapElement = loaded.exports.renderCard(gap, 0);
    loaded.window.renderAll = vi.fn();
    config.cards = [card, gap];

    gapElement.dispatchEvent(new loaded.window.MouseEvent('dblclick', { bubbles: true }));

    expect(config.cards).toEqual([card]);
  });
});

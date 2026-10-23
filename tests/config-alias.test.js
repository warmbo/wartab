import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

// The live `config` object carries a non-enumerable `cards` accessor for the
// current page (config-model.attachCurrentCardsAlias, run by pages.pageInit).
// Config is replaced on load/import/snapshot-restore/undo, so these tests pin
// that every replacement path ends with a working alias.
const model = loadBrowserScript('config-model.js', ['WarTabConfigModel'], {}).exports.WarTabConfigModel;

function loadPages(initialConfig) {
  return loadBrowserScript('pages.js', ['pageInit'], {
    WarTabConfigModel: model,
    uid: () => 'x' + Math.random().toString(36).slice(2, 6),
    config: initialConfig,
  });
}

describe('current-page cards alias', () => {
  it('is readable, writable and tied to the current page after pageInit', () => {
    const h = loadPages({
      pages: { 'page-a': { name: 'A', cards: [{ id: 'c1' }] }, 'page-b': { name: 'B', cards: [] } },
      pageOrder: ['page-a', 'page-b'],
      currentPage: 'page-a',
    });
    h.exports.pageInit();

    expect(h.window.config.cards).toEqual([{ id: 'c1' }]);
    expect(h.window.config.cards).toBe(h.window.config.pages['page-a'].cards);

    // Writes through the alias land on the current page's card list.
    h.window.config.cards.push({ id: 'c2' });
    expect(h.window.config.pages['page-a'].cards.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(h.window.config.pages['page-b'].cards).toEqual([]);
    h.cleanup();
  });

  it('follows currentPage and is re-attached after a plain-object replacement', () => {
    const h = loadPages({
      pages: { 'page-a': { name: 'A', cards: [{ id: 'c1' }] }, 'page-b': { name: 'B', cards: [{ id: 'c9' }] } },
      pageOrder: ['page-a', 'page-b'],
      currentPage: 'page-a',
    });
    h.exports.pageInit();
    h.window.config.currentPage = 'page-b';
    expect(h.window.config.cards).toEqual([{ id: 'c9' }]);

    // Every real replacement (loadConfig, import, snapshot restore, undo) swaps
    // in an alias-free clone and then calls pageInit().
    const replacement = JSON.parse(JSON.stringify(h.window.config));
    expect(replacement.cards).toBeUndefined();
    h.window.config = replacement;
    h.exports.pageInit();
    expect(h.window.config.cards).toEqual([{ id: 'c9' }]);
    h.cleanup();
  });

  it('reads an empty array, never undefined, for an empty or missing page', () => {
    const h = loadPages({ pages: { 'page-a': { name: 'A', cards: [] } }, pageOrder: ['page-a'], currentPage: 'page-a' });
    h.exports.pageInit();

    expect(h.window.config.cards).toEqual([]);
    // A stale currentPage must still resolve to an array, not throw or return undefined.
    h.window.config.currentPage = 'page-missing';
    expect(h.window.config.cards).toEqual([]);
    h.cleanup();
  });
});

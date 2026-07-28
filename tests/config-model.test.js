import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

function loadConfigModel() {
  const source = fs.readFileSync(path.resolve('config-model.js'), 'utf8');
  window.eval(source);
  return window.WarTabConfigModel;
}

describe('production config model', () => {
  let model;

  beforeEach(() => {
    delete window.WarTabConfigModel;
    model = loadConfigModel();
  });

  it('migrates legacy top-level cards into one canonical page', () => {
    const cards = [{ id: 'card-1', sections: [] }];
    const config = model.normalizePages({ cards }, () => 'generated');

    expect(config.pages).toEqual({
      'page-generated': { name: 'Page 1', icon: 'layout', cards },
    });
    expect(config.pageOrder).toEqual(['page-generated']);
    expect(config.currentPage).toBe('page-generated');
    expect(config).not.toHaveProperty('cards');
  });

  it('normalizes legacy page arrays while preserving page ids and order', () => {
    const config = model.normalizePages({
      pages: [
        { id: 'work', name: 'Work', cards: [{ id: 'one' }] },
        { id: 'home', name: 'Home', cards: [] },
      ],
      pageOrder: ['home', 'work'],
      currentPage: 'missing',
    });

    expect(Object.keys(config.pages)).toEqual(['work', 'home']);
    expect(config.pageOrder).toEqual(['home', 'work']);
    expect(config.currentPage).toBe('home');
    expect(config.pages.work).not.toHaveProperty('id');
  });

  it('repairs invalid page order and card collections', () => {
    const config = model.normalizePages({
      pages: {
        first: { name: 'First', cards: null },
        second: { name: 'Second', cards: [] },
      },
      pageOrder: ['missing', 'second', 'second'],
      currentPage: 'first',
    });

    expect(config.pageOrder).toEqual(['second', 'first']);
    expect(config.currentPage).toBe('first');
    expect(config.pages.first.cards).toEqual([]);
  });

  it('provides a non-persisted cards alias that follows the current page', () => {
    const config = model.attachCurrentCardsAlias({
      pages: {
        home: { cards: [{ id: 'home' }] },
        work: { cards: [{ id: 'work' }] },
      },
      currentPage: 'home',
    });

    expect(config.cards).toEqual([{ id: 'home' }]);
    config.currentPage = 'work';
    expect(config.cards).toEqual([{ id: 'work' }]);
    config.cards = [{ id: 'replacement' }];
    expect(config.pages.work.cards).toEqual([{ id: 'replacement' }]);
    expect(JSON.parse(JSON.stringify(config))).not.toHaveProperty('cards');
  });

  it('deep-merges objects and replaces arrays without sharing references', () => {
    const defaults = { theme: { accent: 'blue', nested: { enabled: true } }, cards: [1] };
    const override = { theme: { nested: { enabled: false } }, cards: [2] };
    const merged = model.deepMerge(defaults, override);

    expect(merged).toEqual({
      theme: { accent: 'blue', nested: { enabled: false } },
      cards: [2],
    });
    expect(merged.cards).not.toBe(override.cards);
    expect(merged.theme).not.toBe(defaults.theme);
  });

  it('sanitizes invalid collections and embedded data URLs with warnings', () => {
    const result = model.sanitizeImportConfig({
      cards: {},
      pages: 'bad',
      theme: { background: 'data:image/png;base64,' + 'a'.repeat(300) },
      values: [1, null, 2],
    });

    expect(result.data.cards).toBeUndefined();
    expect(result.data.pages).toBeUndefined();
    expect(result.data.theme.background).toBeUndefined();
    expect(result.data.values).toEqual([1, 2]);
    expect(result.warnings.length).toBeGreaterThanOrEqual(4);
  });

  it('drops prototype-manipulation keys from imported objects and deep merges', () => {
    const imported = JSON.parse('{"__proto__":{"polluted":true},"theme":{"constructor":{"bad":true},"safe":"yes"}}');

    const sanitized = model.sanitizeImportConfig(imported);
    const merged = model.deepMerge({}, imported);

    expect(Object.prototype.hasOwnProperty.call(sanitized.data, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(sanitized.data.theme, 'constructor')).toBe(false);
    expect(sanitized.data.theme.safe).toBe('yes');
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect({}.polluted).toBeUndefined();
  });
});

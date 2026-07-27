import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

function loadScript(filename) {
  window.eval(fs.readFileSync(path.resolve(filename), 'utf8'));
}

describe('production card model', () => {
  let model;

  beforeEach(() => {
    delete window.WarTabCardModel;
    window.CARD_MODULES = {
      clock: { defaults: { format24h: false, showDate: true } },
      links: { defaults: { links: [{ label: 'Example', url: 'https://example.com', icon: 'link' }] } },
    };
    loadScript('card-model.js');
    model = window.WarTabCardModel;
  });

  it('creates sections from registered defaults without sharing nested state', () => {
    const first = model.createSection('links', { label: 'Bookmarks' }, () => 'one');
    const second = model.createSection('links', {}, () => 'two');

    expect(first).toEqual({
      id: 'sec-one',
      type: 'links',
      label: 'Bookmarks',
      links: [{ label: 'Example', url: 'https://example.com', icon: 'link' }],
      styles: {
        align: 'left', density: 'standard', scale: 'medium',
        fontScale: { title: 1, content: 1, secondary: 1 },
      },
    });
    first.links[0].label = 'Changed';
    expect(second.links[0].label).toBe('Example');
  });

  it('creates cards through one type definition path', () => {
    const card = model.createCard('clock', {
      title: 'Clock', icon: 'clock', color: '#aaa', width: 3,
    }, { maxColumns: 2, makeId: () => 'id' });

    expect(card.id).toBe('card-id');
    expect(card.title).toBe('Clock');
    expect(card.width).toBe(2);
    expect(card.height).toBe(1);
    expect(card.sections).toHaveLength(1);
    expect(card.sections[0]).toMatchObject({ type: 'clock', format24h: false, showDate: true });
  });

  it('applies type-specific starter values after module defaults', () => {
    window.CARD_MODULES['api-poller'] = {
      defaults: { url: '', refreshInterval: 60, mappings: [] },
    };

    const section = model.createSection('api-poller', {}, () => 'api');

    expect(section.url).toBe('https://api.github.com/repos/nousresearch/wartab');
    expect(section.refreshInterval).toBe(120);
    expect(section.fields).toHaveLength(3);
  });

  it('derives section options in their existing order and preserves section labels', () => {
    const options = model.getSectionTypeOptions();

    expect(options.slice(0, 4)).toEqual([
      { value: 'links', label: 'Links' },
      { value: 'link-list', label: 'Link List' },
      { value: 'search', label: 'Search' },
      { value: 'clock', label: 'Clock' },
    ]);
    expect(options.find(option => option.value === 'iframe').label).toBe('iFrame');
    expect(options.find(option => option.value === 'resource-monitor').label).toBe('Resource Monitor');
  });

  it('finds, adds, and removes cards from the current page only', () => {
    const config = {
      currentPage: 'home',
      pages: {
        home: { cards: [{ id: 'home-card' }] },
        work: { cards: [{ id: 'work-card' }] },
      },
    };

    expect(model.getCardById(config, 'work-card')).toBeUndefined();
    expect(model.getCardById(config, 'home-card').id).toBe('home-card');

    const added = model.addCard(config, 'clock', {}, { makeId: () => 'new' });
    expect(config.pages.home.cards.at(-1)).toBe(added);

    const removed = model.removeCard(config, 'home-card');
    expect(removed.card.id).toBe('home-card');
    expect(removed.index).toBe(0);
    expect(config.pages.work.cards).toEqual([{ id: 'work-card' }]);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('digital pet render lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete window.registerModule;
    delete window.storage;
    delete window.WarTabLifecycle;
    delete window.saveConfig;
  });

  it('releases every timer when its render owner is cleaned up', () => {
    vi.useFakeTimers();
    let definition;
    const cleanups = [];
    window.registerModule = (_type, moduleDefinition) => { definition = moduleDefinition; };
    window.storage = { getStats: () => new Promise(() => {}) };
    window.WarTabLifecycle = { addCleanup: (_owner, cleanup) => cleanups.push(cleanup) };
    window.saveConfig = () => Promise.resolve();
    window.eval(fs.readFileSync(path.resolve('modules/digital-pet.js'), 'utf8'));
    const owner = document.createElement('div');
    const now = Date.now();

    definition.render({
      id: 'pet', hunger: 80, happiness: 80, waste: 10,
      lastFed: now, lastPetted: now, lastCleaned: now,
    }, {}, owner);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    cleanups.forEach((cleanup) => cleanup());

    expect(vi.getTimerCount()).toBe(0);
  });
});

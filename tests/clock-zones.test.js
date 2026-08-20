import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Load clock.js and expose its parseZones helper.
function loadClock() {
  let definition;
  window.registerModule = (_type, moduleDefinition) => { definition = moduleDefinition; };
  window.eval(fs.readFileSync(path.resolve('modules/clock.js'), 'utf8'));
  return definition;
}

describe('clock module — world clock zones', () => {
  afterEach(() => {
    delete window.registerModule;
  });

  it('registers a zones default', () => {
    const def = loadClock();
    expect(def.defaults.zones).toEqual([]);
  });

  it('parses comma-separated Label:tz entries', () => {
    loadClock();
    const zones = window.parseZones('Tokyo:Asia/Tokyo, London:Europe/London');
    expect(zones).toEqual([
      { label: 'Tokyo', tz: 'Asia/Tokyo' },
      { label: 'London', tz: 'Europe/London' },
    ]);
  });

  it('parses bare timezone strings (label = tz)', () => {
    loadClock();
    const zones = window.parseZones('America/New_York');
    expect(zones).toEqual([{ label: 'America/New_York', tz: 'America/New_York' }]);
  });

  it('tolerates arrays and empty values', () => {
    loadClock();
    expect(window.parseZones([{ label: 'A', tz: 'UTC' }])).toEqual([{ label: 'A', tz: 'UTC' }]);
    expect(window.parseZones('')).toEqual([]);
    expect(window.parseZones(null)).toEqual([]);
  });
});

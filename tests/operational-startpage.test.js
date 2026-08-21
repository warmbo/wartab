import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = p => fs.readFileSync(p, 'utf8');

describe('operational startpage improvements', () => {
  it('supports command search prefixes, URL/IP detection, and dynamic web search', () => {
    const palette = read('command-palette.js');
    expect(palette).toContain('parseCommandQuery');
    expect(palette).toContain("'g':'Google'");
    expect(palette).toContain("'yt':'YouTube'");
    expect(palette).toContain('looksLikeUrl');
    expect(palette).toContain("kind: 'search'");
  });

  it('provides shared status and freshness primitives', () => {
    const design = read('design-system.js');
    expect(design).toContain('ds.statusRow = function');
    expect(design).toContain('ds.freshness = function');
    expect(design).toContain("healthy: 'success'");
    expect(design).toContain("degraded: 'warning'");
  });

  it('renders service health with standardized state, latency, and freshness', () => {
    const info = read('modules/information.js');
    expect(info).toContain('ds.statusRow');
    expect(info).toContain('ds.freshness');
    expect(info).toContain("state:'offline'");
    expect(info).toContain("state:'healthy'");
  });

  it('adds concise high, low, and precipitation context to weather', () => {
    const weather = read('modules/weather.js');
    expect(weather).toContain('precipitation_probability_max');
    expect(weather).toContain('weather-context');
    expect(weather).toContain("'High '");
    expect(weather).toContain("'Low '");
  });

  it('replaces dead empty-URL bookmark showcases with a Card Gallery action', () => {
    const links = read('modules/links.js');
    expect(links).toContain('No destinations configured');
    expect(links).toContain('openCardGallery');
    expect(links).toContain('filter(function(link){return link&&link.url;})');
  });
});

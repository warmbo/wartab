import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

describe('information modules', () => {
  afterEach(() => { delete window.registerModule; });

  it('registers RSS, agenda, service-status and markdown modules', () => {
    const modules = {};
    window.registerModule = (type, definition) => { modules[type] = definition; };
    window.eval(fs.readFileSync(path.resolve('modules/information.js'), 'utf8'));
    expect(Object.keys(modules)).toEqual(['rss', 'agenda', 'service-status', 'markdown']);
    expect(modules.rss.settings.some((field) => field.name === 'url')).toBe(true);
    expect(modules.agenda.defaults.refreshInterval).toBeGreaterThan(0);
    expect(typeof modules['service-status'].defaults.services).toBe('string');
  });

  it('does not hardcode a private deployment URL in service-status defaults', () => {
    const modules = {};
    window.registerModule = (type, definition) => { modules[type] = definition; };
    window.eval(fs.readFileSync(path.resolve('modules/information.js'), 'utf8'));
    expect(modules['service-status'].defaults.services.trim()).toBe('');
    expect(modules['service-status'].settings[0].placeholder).not.toMatch(/tab\.warho\.me/);
  });

  it('sanitizes RSS hrefs to http(s) or relative destinations', async () => {
    const modules = {};
    window.registerModule = (type, definition) => { modules[type] = definition; };
    window.ds = { empty: () => document.createElement('div'), error: () => document.createElement('div'), loading: () => document.createElement('div'), freshness: () => document.createElement('span') };
    window.escHtml = (v) => String(v).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    window.openCardEditPanel = () => {};
    const xml = '<?xml version="1.0"?><rss><channel><item><title>bad</title><link>javascript:alert(1)</link></item><item><title>ok</title><link>https://example.com/x</link></item></channel></rss>';
    window.WarTabHttp = {
      request: () => Promise.resolve(xml),
      createPoller: (opts) => { opts.task(); return { dispose() {} }; },
    };
    window.renderIcons = () => {};
    window.eval(fs.readFileSync(path.resolve('modules/information.js'), 'utf8'));
    const owner = document.createElement('div');
    modules.rss.onMount({ url: 'x', limit: 6 }, {}, owner);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const rows = owner.querySelectorAll('a.info-row');
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute('href')).toBe('#');
    expect(rows[1].getAttribute('href')).toBe('https://example.com/x');
  });

  it('escapes raw HTML before applying markdown formatting', () => {
    const modules = {};
    window.registerModule = (type, definition) => { modules[type] = definition; };
    window.escHtml = (value) => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    window.eval(fs.readFileSync(path.resolve('modules/information.js'), 'utf8'));
    const owner = document.createElement('div');
    modules.markdown.render({ content: '<script>alert(1)</script> **safe**' }, {}, owner);
    expect(owner.querySelector('script')).toBeNull();
    expect(owner.querySelector('strong')?.textContent).toBe('safe');
  });
});

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
    expect(modules['service-status'].defaults.services).toContain('|');
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

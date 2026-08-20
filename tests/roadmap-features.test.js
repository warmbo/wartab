import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('roadmap feature contracts', () => {
  it('ships an installable PWA shell without caching API responses', () => {
    const manifest = JSON.parse(read('manifest.webmanifest'));
    const worker = read('sw.js');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(worker).toContain("url.pathname.startsWith('/api/')");
    expect(worker).toContain("e.request.mode === 'navigate'");
  });

  it('loads the command palette and exposes keyboard/ARIA semantics', () => {
    const html = read('index.html');
    const palette = read('command-palette.js');
    expect(html).toContain('command-palette.js?v=BUILD');
    expect(palette).toContain("e.key === 'k' || e.key === 'p'");
    expect(palette).toContain("setAttribute('role', 'listbox')");
    expect(palette).toContain("setAttribute('aria-selected'");
    expect(read('app.js')).not.toContain("e.key==='l'||e.key==='k'");
  });

  it('applies custom CSS in a dedicated late style element', () => {
    const theme = read('theme.js');
    expect(theme).toContain("getElementById('wartab-custom-css')");
    expect(theme).toContain("cssEl.id = 'wartab-custom-css'");
    expect(theme).toContain('document.head.appendChild(cssEl)');
  });

  it('provides one site-wide, top-level context menu with target-aware actions', () => {
    const context = read('context-menu.js');
    const links = read('modules/links.js');
    const css = read('style.css');
    expect(read('index.html')).toContain('context-menu.js?v=BUILD');
    expect(context).toContain("document.addEventListener('contextmenu'");
    expect(context).toContain("addItem(items, 'Copy URL'");
    expect(context).toContain("addItem(items, 'Delete link'");
    expect(context).toContain("addItem(items, 'Edit card'");
    expect(context).toContain("addItem(items, 'Command palette'");
    expect(links).toContain('WarTabContextMenu.registerLink');
    expect(css).toContain('z-index: 2147483647');
  });

  it('keeps search history bounded and supports engine prefixes', () => {
    const render = read('render.js');
    expect(render).toContain("'yt:':'YouTube'");
    expect(render).toContain("'ddg:':'DuckDuckGo'");
    expect(render).toContain('history.slice(0,30)');
  });

  it('never treats an empty current page as an uninitialized config', () => {
    const app = read('app.js');
    expect(app).not.toContain("if(!config.cards||!config.cards.length)");
    expect(app).toContain('An empty current page is valid user state');
  });
});

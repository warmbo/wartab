import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

function loadContextMenu() {
  window.renderIcons = vi.fn();
  window.toast = vi.fn();
  window.eval(fs.readFileSync(path.resolve('context-menu.js'), 'utf8'));
  return window.WarTabContextMenu;
}

describe('unified site context menu', () => {
  let api;
  beforeAll(() => { api = loadContextMenu(); });
  afterEach(() => {
    api.close();
    document.body.innerHTML = '';
  });

  it('renders one body-level menu and closes it with Escape', () => {
    api.open(900, 700, [
      { label: 'First', icon: 'search', action: vi.fn() },
      { separator: true },
      { label: 'Danger', icon: 'trash-2', action: vi.fn(), danger: true },
    ]);

    const root = document.querySelector('#wartab-context-menu-root');
    const menu = root.querySelector('[role="menu"]');
    expect(root.parentElement).toBe(document.body);
    expect(menu).not.toBeNull();
    expect(menu.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    expect(menu.querySelector('.danger')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector('[role="menu"]')).toBeNull();
  });

  it('owns right-click on the app but preserves native editing menus', () => {
    const card = document.createElement('div');
    document.body.appendChild(card);
    const siteEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
    card.dispatchEvent(siteEvent);
    expect(siteEvent.defaultPrevented).toBe(true);
    expect(document.querySelector('.site-context-menu')).not.toBeNull();

    api.close();
    const input = document.createElement('input');
    document.body.appendChild(input);
    const inputEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    input.dispatchEvent(inputEvent);
    expect(inputEvent.defaultPrevented).toBe(false);
    expect(document.querySelector('.site-context-menu')).toBeNull();
  });
});

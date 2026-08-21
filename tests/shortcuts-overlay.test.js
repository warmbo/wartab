import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

describe('shortcuts overlay redesign', () => {
  it('renders grouped sections with header, close button, and real shortcuts', () => {
    const h = loadBrowserScript('pages.js', ['showShortcutsOverlay'], {
      addNewCard: () => {},
      addPage: () => {},
      toggleConfigPanel: () => {},
      $: () => null,
      $$: () => [],
      renderIcons: () => {},
      config: { pageOrder: [], pages: {}, currentPage: 'page-x' },
      saveConfig: () => {},
      switchPage: () => {},
    });
    h.exports.showShortcutsOverlay();
    const overlay = h.document.getElementById('shortcuts-overlay');
    expect(overlay).toBeTruthy();
    const box = overlay.querySelector('.shortcuts-box');
    expect(box.getAttribute('role')).toBe('dialog');
    // Header
    expect(box.querySelector('.shortcuts-title').textContent).toContain('Keyboard Shortcuts');
    expect(box.querySelector('.shortcuts-head button[aria-label="Close shortcuts"]')).toBeTruthy();
    // Groups: Navigate, palette, Actions
    const groups = box.querySelectorAll('.shortcuts-group');
    expect(groups.length).toBe(3);
    expect(groups[0].querySelector('.shortcuts-group-title').textContent).toBe('Navigate');
    expect(box.querySelectorAll('.kbd-shortcut').length).toBe(12);
    // Ctrl+K listed
    expect(box.textContent).toContain('Command palette');
    expect(box.querySelector('.shortcuts-foot').textContent).toContain('Esc');
    // Esc closes
    overlay.dispatchEvent(new h.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(h.document.getElementById('shortcuts-overlay')).toBeFalsy();
    h.cleanup();
  });
});

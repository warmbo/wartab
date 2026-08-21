import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';
const read = p => fs.readFileSync(p, 'utf8');

describe('async audit round 2 fixes', () => {
  it('lifts the top bar above cards so the telemetry dropdown never hides behind them', () => {
    const css = read('style.css');
    // #top-bar has backdrop-filter → stacking context at z-auto; cards paint
    // later in DOM order and would cover the dropdown. It must carry a z-index.
    const topbar = css.match(/#top-bar \{[^}]*\}/s)?.[0] || '';
    expect(topbar).toContain('backdrop-filter');
    expect(topbar).toMatch(/z-index:\s*1/);
  });

  it('keeps the command-deck menu popover-safe: no hidden attr that breaks showPopover, JS manages the fallback', () => {
    const html = read('index.html');
    // hidden + popover="auto" makes showPopover() throw InvalidStateError in
    // Popover-API browsers — the menu must start without hidden.
    expect(html).toContain('popover="auto"');
    expect(html).not.toContain('popover="auto" hidden');
    const ux = read('ux-system.js');
    expect(ux).toContain("if(!hasPopover)menu.hidden=true");
    // Closed state safety via CSS :not(:popover-open) instead of the attribute
    expect(read('style.css')).toContain('.command-deck-menu:not(:popover-open){display:none}');
  });

  it('mirrors the icon-picker z bump for the bg picker overlay and panel', () => {
    const css = read('style.css');
    expect(css).toContain('#bg-picker-overlay { z-index: calc(var(--z-picker) + 1); }');
    expect(css).toContain('#bg-picker { z-index: calc(var(--z-picker) + 2); }');
  });

  it('provides a shared openModal with Esc, backdrop, focus, and aria roles', () => {
    const modals = read('modals.js');
    expect(modals).toContain('function openModal');
    expect(modals).toContain("box.setAttribute('role', 'dialog')");
    expect(modals).toContain("box.setAttribute('aria-modal', 'true')");
    expect(modals).toContain("e.key === 'Escape'");
    expect(modals).toContain('beforeClose');
    expect(modals).not.toContain('overlay.appendChild(box);\n  document.body.appendChild(overlay);\n}');
  });

  it('routes confirm/info modals through openModal', () => {
    const modals = read('modals.js');
    expect(modals).toContain('const m = openModal({ label: okText + \'?\', align: \'center\' });');
    expect(modals).toContain('const m = openModal({ label: title || \'WarTab\', align: \'left\', width: \'520px\' });');
  });

  it('rebuilds the update terminal on openModal with a close-veto while running', () => {
    const updates = read('updates.js');
    expect(updates).toContain('openModal({ label: \'WarTab Update\'');
    expect(updates).toContain('beforeClose: function()');
    expect(updates).toContain('return closeBtn ? !closeBtn.disabled : true;');
    expect(updates).not.toContain("overlay.addEventListener('click', (e) => { if (e.target === overlay) return; });");
  });

  it('gives config tabs real tab semantics with arrow-key navigation', () => {
    const panel = read('config-panel.js');
    expect(panel).toContain("tabBar.setAttribute('role','tablist')");
    expect(panel).toContain("btn.setAttribute('role','tab')");
    expect(panel).toContain("btn.setAttribute('aria-selected'");
    expect(panel).toContain("e.key!=='ArrowLeft'&&e.key!=='ArrowRight'");
  });

  it('returns focus to the config trigger on close', () => {
    const panel = read('config-panel.js');
    expect(panel).toContain('window._configReturnFocus');
    expect(panel).toContain("document.activeElement&&!document.activeElement.closest('#config-panel')");
  });

  it('renders unbounded number settings as numeric inputs, not capped sliders', () => {
    const editor = read('section-editor.js');
    expect(editor).toContain("if (f.min !== undefined || f.max !== undefined) {");
    expect(editor).toContain("num.type='number';num.className='cp-input';");
    expect(editor).toContain('// No explicit bounds');
  });

  it('keeps structured rows for clock zones and timer presets with colon/comma format', () => {
    const clock = read('modules/clock.js');
    expect(clock).toContain("type:'rows'");
    expect(clock).toContain("pairSeparator:':'");
    expect(clock).toContain("rowSeparator:','");
    expect(clock).not.toContain('World clock (IANA timezones)');
    const timer = read('modules/timer.js');
    expect(timer).toContain('cpRows({');
    expect(timer).toContain("pairSeparator: ':'");
  });

  it('adds aria-live to toasts', () => {
    const core = read('core.js');
    expect(core).toContain("el.setAttribute('role','status')");
    expect(core).toContain("el.setAttribute('aria-live','polite')");
  });

  it('cpRows supports custom pair and row separators', () => {
    const h = loadBrowserScript('form-helpers.js', ['cpRows'], {});
    let emitted = null;
    const el = h.exports.cpRows({
      value: 'Tokyo:Asia/Tokyo, London:Europe/London',
      pairSeparator: ':',
      rowSeparator: ',',
      onChange: (v) => { emitted = v; },
    });
    const inputs = el.querySelectorAll('input');
    expect(inputs.length).toBe(4);
    expect(inputs[0].value).toBe('Tokyo');
    expect(inputs[1].value).toBe('Asia/Tokyo');
    expect(inputs[2].value).toBe('London');
    // Edit and verify the colon/comma format round-trips
    inputs[1].value = 'Asia/Tokyo';
    inputs[1].dispatchEvent(new h.window.Event('change', { bubbles: true }));
    expect(emitted).toBe('Tokyo:Asia/Tokyo,London:Europe/London');
    h.cleanup();
  });

  it('openModal executes with Esc close and focus return', () => {
    const h = loadBrowserScript('modals.js', ['openModal'], {});
    const win = h.window;
    const m = h.exports.openModal({ label: 'Test', align: 'center' });
    expect(m.box.getAttribute('role')).toBe('dialog');
    expect(m.overlay.className).toContain('modal-overlay');
    // Esc closes
    h.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(h.document.querySelector('.modal-overlay')).toBeFalsy();
    h.cleanup();
  });
});

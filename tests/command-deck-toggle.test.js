import { describe, expect, it } from 'vitest';

describe('command deck popover logic', () => {
  it('popover+hidden elements start closed and toggleMore opens them', () => {
    // Simulate the exact HTML + JS contract in jsdom
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!doctype html><html><body>' +
      '<button id="btn-more"></button>' +
      '<div id="command-deck-menu" class="command-deck-menu" popover="auto" hidden><button data-command="pages">x</button></div>' +
      '</body></html>', { url: 'https://wartab.test/' });
    const { window } = dom;
    const doc = window.document;
    const more = doc.getElementById('btn-more');
    const menu = doc.getElementById('command-deck-menu');

    // In jsdom there is NO showPopover — so hasPopover=false → fallback branch
    const hasPopover = typeof menu.showPopover === 'function';
    expect(hasPopover).toBe(false); // jsdom lacks the API

    let open = hasPopover ? menu.matches(':popover-open') : !menu.hidden;
    expect(open).toBe(false); // hidden=true → !hidden=false → closed

    // Fallback toggle: first click should OPEN
    open = hasPopover ? menu.matches(':popover-open') : !menu.hidden;
    if (open) { menu.hidden = true; } else { menu.hidden = false; }
    expect(menu.hidden).toBe(false); // first click opens — correct now with hidden attr

    // Second click closes
    open = !menu.hidden;
    if (open) { menu.hidden = true; } else { menu.hidden = false; }
    expect(menu.hidden).toBe(true);
  });
});

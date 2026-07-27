/* ═══════════════════════════════════════════
   WarTab — Link List Module (deprecated)
   Thin wrapper that delegates to the 'links' module in list mode.
   Delegation happens at render time so load order doesn't matter.
   ═══════════════════════════════════════════ */
registerModule('link-list', {
  defaults: CARD_MODULES['links'] ? CARD_MODULES['links'].defaults : { links: [{label:'Example',url:'https://example.com',icon:'link'}], listMode: true },
  render: function(sec, card, cw) {
    if (CARD_MODULES['links']) {
      CARD_MODULES['links'].render(sec, card, cw);
    } else {
      cw.innerHTML = '<div style="padding:8px;text-align:center;color:var(--text-tertiary);font-size:var(--text-sm);">Link list unavailable</div>';
    }
  },
  editor: function(sec, card, bd) {
    if (CARD_MODULES['links']) {
      CARD_MODULES['links'].editor(sec, card, bd);
    } else {
      bd.appendChild(cpHint('Links module not loaded'));
    }
  },
});

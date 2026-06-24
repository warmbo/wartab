/* ═══════════════════════════════════════════
   WarTab — Page Drag Reorder
   Pointer-based drag to reorder pages in the management panel.
   Depends on: $, config, saveConfig (app.js), renderPageNav (pages.js)
   ═══════════════════════════════════════════ */

/* ── Page drag-to-reorder handlers ── */

function onPageDragMove(e) {

  if (!_pageDrag) return;

  e.preventDefault();

  const body = $('#edit-panel-body');

  const items = [...body.children].filter(function(el) { return el.classList.contains('cp-config-card') && el !== _pageDrag.card; });

  // Find insertion point: before the card whose center Y the cursor is above

  let targetBefore = null;

  for (const item of items) {

    const r = item.getBoundingClientRect();

    if (e.clientY < r.top + r.height / 2) { targetBefore = item; break; }

  }

  // Visual indicator: show which card will be displaced

  items.forEach(function(el) {

    el.style.borderTopColor = (el === targetBefore) ? 'var(--accent)' : 'var(--glass-border)';

    el.style.borderTopWidth = (el === targetBefore) ? '3px' : '1px';

    el.style.transition = 'border-top-color 0.1s, border-top-width 0.1s';

  });

  // Move the dragged card with the cursor

  _pageDrag.card.style.transform = 'translateY(' + (e.clientY - _pageDrag.startY) + 'px)';

  _pageDrag.card.style.transition = 'transform 0.05s linear';

}

function onPageDragEnd(e) {

  if (!_pageDrag) return;

  document.removeEventListener('pointermove', onPageDragMove);

  document.removeEventListener('pointerup', onPageDragEnd);

  document.removeEventListener('pointercancel', onPageDragEnd);

  _pageDrag.card.style.opacity = '';

  _pageDrag.card.style.transform = '';

  // Reset visual indicators

  const body = $('#edit-panel-body');

  [...body.children].forEach(function(el) {

    el.style.transform = '';

    el.style.transition = '';

    el.style.borderTopColor = '';

    el.style.borderTopWidth = '';

  });

  // Compute new order: find where the cursor is relative to non-dragged cards

  const dragId = _pageDrag.pageId;

  // Get all page cards EXCLUDING the dragged one (same as onPageDragMove)

  const items = [...body.children].filter(function(el) {

    return el.classList.contains('cp-config-card') && el.dataset.pageId !== dragId;

  });

  // The current DOM order (before reorder) tells us the starting arrangement

  const allCards = [...body.children].filter(function(el) { return el.classList.contains('cp-config-card'); });

  const domOrder = allCards.map(function(el) { return el.dataset.pageId; });

  const srcIdx = domOrder.indexOf(dragId);

  if (srcIdx >= 0) {

    const newOrder = [...domOrder];

    newOrder.splice(srcIdx, 1);

    // Find target insertion point: first non-dragged card whose center the cursor is above

    let tgtIdx = newOrder.length; // default: append at end

    for (const item of items) {

      const r = item.getBoundingClientRect();

      if (e.clientY < r.top + r.height / 2) {

        const found = newOrder.indexOf(item.dataset.pageId);

        if (found >= 0) { tgtIdx = found; }

        break;

      }

    }

    newOrder.splice(tgtIdx, 0, dragId);

    if (JSON.stringify(newOrder) !== JSON.stringify(config.pageOrder)) {

      config.pageOrder = newOrder;

      saveConfig();

      renderPageNav();

      // Reorder DOM to match new page order

      const cards = body.querySelectorAll('.cp-config-card');

      const cardMap = {};

      cards.forEach(c => { cardMap[c.dataset.pageId] = c; });

      cards.forEach(c => c.remove());

      newOrder.forEach(id => {

        if (cardMap[id]) body.insertBefore(cardMap[id], body.lastChild);

      });

    }

  }

  _pageDrag = null;

}

/* ── Edit Panel Form Helpers ── */

/* ── Edit Panel Builder ── */

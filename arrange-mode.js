/* ═══════════════════════════════════════════
   WarTab — Card Arrange Mode
   ═══════════════════════════════════════════
   Replaces free-form drag-and-drop with discrete
   hover-driven arrow movement. Toggle from toolbar
   button, then hover any card to show ↑↓←→ arrows.
   Depends on: app.js (config, $, $$, getPageCols, simulateGrid,
                 saveConfig, renderAll, escHtml, toast)
   ═══════════════════════════════════════════ */

let _arrangeActive = false;   // global: arrange mode on/off
let _arrangeState = null;     // { cardId } — card currently hovered
let _arrangeHoveredId = null; // track last hovered card ID

/* ── Toolbar toggle (no args) ── */
function toggleArrangeMode() {
  if (_arrangeActive) {
    exitArrangeMode();
  } else {
    _arrangeActive = true;
    document.body.classList.add('arrange-mode');
    document.body.classList.add('arrange-picker');
    updateToolbarBtn();
    setArrangeCardAccess(true);
    toast('Select a card to see move arrows — Esc to exit', 'info');
  }
}

/* ── Exit arrange mode entirely ── */
function exitArrangeMode() {
  _arrangeActive = false;
  _arrangeState = null;
  _arrangeHoveredId = null;
  document.body.classList.remove('arrange-mode');
  document.body.classList.remove('arrange-picker');
  document.querySelectorAll('.arrange-selected').forEach(function(el){
    el.classList.remove('arrange-selected');
  });
  setArrangeCardAccess(false);
  removeArrows();
  updateToolbarBtn();
}

function updateToolbarBtn() {
  var btn = document.getElementById('btn-arrange');
  if (btn) {
    btn.classList.toggle('active', _arrangeActive);
    btn.setAttribute('aria-pressed', String(_arrangeActive));
  }
}

function setArrangeCardAccess(enabled) {
  document.querySelectorAll('#card-grid .card').forEach(function(el) {
    if (enabled) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', 'Select card to arrange');
    } else {
      el.removeAttribute('tabindex');
      el.removeAttribute('aria-label');
    }
  });
}

/* ── Hover: show/hide arrows ── */
function showArrowsForCard(cardId) {
  // Clear previous selection
  document.querySelectorAll('.arrange-selected').forEach(function(el){
    el.classList.remove('arrange-selected');
  });
  removeArrows();

  var el = document.querySelector('[data-card-id="' + cardId + '"]');
  if (!el) return;
  el.classList.add('arrange-selected');
  _arrangeState = { cardId: cardId };
  renderArrows(cardId);
}

function hideArrows() {
  document.querySelectorAll('.arrange-selected').forEach(function(el){
    el.classList.remove('arrange-selected');
  });
  removeArrows();
  _arrangeState = null;
  _arrangeHoveredId = null;
}

/* Delegate hover on card-grid — show arrows, no mouseout needed since
   arrows persist until another card is hovered or arrange mode exits */
document.getElementById('card-grid').addEventListener('mouseover', function(e) {
  if (!_arrangeActive) return;
  var cardEl = e.target.closest('.card');
  if (!cardEl) return;
  var id = cardEl.dataset.cardId;
  if (id !== _arrangeHoveredId) {
    _arrangeHoveredId = id;
    showArrowsForCard(id);
  }
});

document.getElementById('card-grid').addEventListener('click', function(e) {
  if (!_arrangeActive || e.target.closest('.arr-arrow')) return;
  var cardEl = e.target.closest('.card');
  if (cardEl) showArrowsForCard(cardEl.dataset.cardId);
});
document.getElementById('card-grid').addEventListener('focusin', function(e) {
  if (!_arrangeActive) return;
  var cardEl = e.target.closest('.card');
  if (cardEl) showArrowsForCard(cardEl.dataset.cardId);
});
document.getElementById('card-grid').addEventListener('keydown', function(e) {
  if (!_arrangeActive || (e.key !== 'Enter' && e.key !== ' ')) return;
  var cardEl = e.target.closest('.card');
  if (!cardEl) return;
  e.preventDefault();
  showArrowsForCard(cardEl.dataset.cardId);
});

/* ── Arrow DOM ── */
function removeArrows() {
  document.querySelectorAll('.arr-arrow').forEach(function(el){el.remove();});
}

var ARROW_DIRS = [
  { dir: 'up',    symbol: '↑', label: 'Move up' },
  { dir: 'down',  symbol: '↓', label: 'Move down' },
  { dir: 'left',  symbol: '←', label: 'Move left' },
  { dir: 'right', symbol: '→', label: 'Move right' }
];

function renderArrows(cardId) {
  removeArrows();
  var el = document.querySelector('[data-card-id="' + cardId + '"]');
  if (!el) return;
  var cw = el.offsetWidth;
  var ch = el.offsetHeight;
  var cols = getPageCols();
  
  ARROW_DIRS.forEach(function(item){
    if (!canMove(cardId, item.dir, cols)) return;
    var btn = document.createElement('button');
    btn.className = 'arr-arrow arr-' + item.dir;
    btn.textContent = item.symbol;
    btn.title = item.label;
    btn.setAttribute('aria-label', item.label);
    var pos = getArrowPos(cw, ch, item.dir);
    btn.style.cssText = 'position:absolute;z-index:9999;left:' + pos.left + 'px;top:' + pos.top + 'px;';
    btn.addEventListener('pointerdown', function(e){
      e.stopPropagation();
      e.preventDefault();
    });
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      moveCard(cardId, item.dir);
    });
    el.appendChild(btn);
  });
}

/* Arrow pixel position relative to the card element (scrolls with card) */
function getArrowPos(cardW, cardH, dir) {
  var ow = 6;   // overlap with card edge (px)
  var bw = 44;  // button width — must match .arr-arrow CSS
  var bh = 36;  // button height — must match .arr-arrow CSS
  if (dir === 'up')    return { left: Math.round(cardW/2 - bw/2), top: Math.round(-bh + ow) };
  if (dir === 'down')  return { left: Math.round(cardW/2 - bw/2), top: Math.round(cardH - ow) };
  if (dir === 'left')  return { left: Math.round(-bw + ow), top: Math.round(cardH/2 - bh/2) };
  if (dir === 'right') return { left: Math.round(cardW - ow), top: Math.round(cardH/2 - bh/2) };
  return { left: 0, top: 0 };
}

/* ── Direction Availability ── */
function canMove(cardId, dir, cols) {
  var cards = config.cards, idx = cards.findIndex(function(c){return c.id === cardId;});
  if (idx < 0) return false;
  var positions = simulateGrid(cards, cols);
  var pos = positions[idx], card = cards[idx];
  var w = Math.min(card.width || 1, cols), h = card.height || 1;
  if (dir === 'left')  return pos.col > 0;
  if (dir === 'right') return hasCardRight(positions, cards, pos, w, idx);
  if (dir === 'up')    return pos.row > 0;
  if (dir === 'down')  return hasCardBelow(positions, cards, pos, w, h, idx);
  return false;
}

function hasCardRight(positions, cards, srcPos, w, srcIdx) {
  for (var i = 0; i < positions.length; i++) {
    if (i === srcIdx) continue;
    if (positions[i].row === srcPos.row && positions[i].col >= srcPos.col + w) return true;
  }
  return false;
}

function hasCardBelow(positions, cards, srcPos, w, h, srcIdx) {
  var belowRow = srcPos.row + h;
  for (var i = 0; i < positions.length; i++) {
    if (i === srcIdx) continue;
    var p = positions[i];
    if (p.row >= belowRow && p.col >= srcPos.col && p.col < srcPos.col + w) return true;
    if (p.row >= belowRow && p.col < srcPos.col + w && srcPos.col < p.col + (cards[i].width || 1)) return true;
  }
  return false;
}

/* ── Grid helpers ── */
function findCardAt(positions, cards, row, col, excludeIdx) {
  for (var i = 0; i < positions.length; i++) {
    if (i === excludeIdx) continue;
    var p = positions[i], c = cards[i];
    var w = Math.min(c.width || 1, 10);
    var h = c.height || 1;
    if (p.row <= row && row < p.row + h && p.col <= col && col < p.col + w) return c.id;
  }
  return null;
}

function findFirstCardInRow(positions, cards, row, excludeIdx) {
  for (var i = 0; i < positions.length; i++) {
    if (i === excludeIdx) continue;
    if (positions[i].row === row && positions[i].col === 0) return cards[i].id;
  }
  for (var i = 0; i < positions.length; i++) {
    if (i === excludeIdx) continue;
    if (positions[i].row === row) return cards[i].id;
  }
  return null;
}

function findLastCardInRow(positions, cards, row, excludeIdx) {
  var last = null, lastCol = -1;
  for (var i = 0; i < positions.length; i++) {
    if (i === excludeIdx) continue;
    if (positions[i].row === row) {
      var cw = Math.min(cards[i].width || 1, 10);
      var right = positions[i].col + cw;
      if (right > lastCol) { lastCol = right; last = cards[i].id; }
    }
  }
  return last;
}

/* ── Move ── */
function moveCard(cardId, dir) {
  if (!_arrangeState) return;
  var cards = config.cards;
  var cols = getPageCols();
  var positions = simulateGrid(cards, cols);
  var srcIdx = cards.findIndex(function(c){return c.id === cardId;});
  if (srcIdx < 0) return;
  var srcPos = positions[srcIdx];
  var card = cards[srcIdx];
  var w = Math.min(card.width || 1, cols);
  var h = card.height || 1;
  var targetId = null;

  if (dir === 'left') {
    targetId = findCardAt(positions, cards, srcPos.row, srcPos.col - 1, srcIdx);
  } else if (dir === 'right') {
    targetId = null;
    var bestCol = Infinity;
    for (var i = 0; i < positions.length; i++) {
      if (i === srcIdx) continue;
      if (positions[i].row === srcPos.row && positions[i].col >= srcPos.col + w && positions[i].col < bestCol) {
        bestCol = positions[i].col;
        targetId = cards[i].id;
      }
    }
  } else if (dir === 'up') {
    targetId = findCardAt(positions, cards, srcPos.row - h, srcPos.col, srcIdx);
    if (!targetId) targetId = findFirstCardInRow(positions, cards, srcPos.row - h, srcIdx);
  } else if (dir === 'down') {
    targetId = findCardAt(positions, cards, srcPos.row + h, srcPos.col, srcIdx);
    if (!targetId) targetId = findLastCardInRow(positions, cards, srcPos.row + h, srcIdx);
  }

  if (!targetId) {
    toast('Cannot move further in that direction', 'info');
    return;
  }

  // Direct swap — exchange positions in the config array
  var sa = cards.findIndex(function(c){return c.id === cardId;});
  var ta = cards.findIndex(function(c){return c.id === targetId;});
  if (sa < 0 || ta < 0) return;
  var tmp = cards[sa];
  cards[sa] = cards[ta];
  cards[ta] = tmp;

  saveConfig();

  // Swap two cards in the DOM and FLIP animate them
  var grid = document.getElementById('card-grid');
  if (grid) {
    var srcEl = grid.querySelector('[data-card-id="' + cardId + '"]');
    var tgtEl = grid.querySelector('[data-card-id="' + targetId + '"]');
    if (srcEl && tgtEl) {
      // 1. Capture first positions
      var srcFirst = srcEl.getBoundingClientRect();
      var tgtFirst = tgtEl.getBoundingClientRect();

      // 2. Swap DOM elements using general-purpose helper
      swapNodes(srcEl, tgtEl);

      // 3. Update data-index to match new DOM order
      var allCards = [...grid.children].filter(function(el){return el.classList.contains('card');});
      allCards.forEach(function(el, i){ el.dataset.index = i; });

      // 4. Capture new positions
      var srcLast = srcEl.getBoundingClientRect();
      var tgtLast = tgtEl.getBoundingClientRect();

      // 5. Calculate deltas and animate
      var sDx = srcFirst.left - srcLast.left, sDy = srcFirst.top - srcLast.top;
      var tDx = tgtFirst.left - tgtLast.left, tDy = tgtFirst.top - tgtLast.top;

      if (!prefersReducedMotion()) {
        // Set initial transforms with transitions disabled
        srcEl.style.transition = 'none';
        srcEl.style.transform = 'translate(' + sDx + 'px, ' + sDy + 'px)';
        tgtEl.style.transition = 'none';
        tgtEl.style.transform = 'translate(' + tDx + 'px, ' + tDy + 'px)';
        // Force layout so initial transforms are painted
        grid.offsetHeight;
        // Start animation on next frame
        setTimeout(function(){
          srcEl.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
          srcEl.style.transform = 'translate(0, 0)';
          tgtEl.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
          tgtEl.style.transform = 'translate(0, 0)';
          setTimeout(function(){
            srcEl.style.transition = ''; srcEl.style.transform = '';
            tgtEl.style.transition = ''; tgtEl.style.transform = '';
            hideArrows();
          }, 400);
        }, 20);
      } else {
        hideArrows();
      }
    } else {
      hideArrows();
    }
  }
}

/* Swap two DOM nodes reliably, regardless of position */
function swapNodes(a, b) {
  var parent = a.parentNode;
  var aNext = a.nextSibling;
  var bNext = b.nextSibling;
  if (aNext === b) {
    parent.insertBefore(b, a);
  } else if (bNext === a) {
    parent.insertBefore(a, b);
  } else {
    parent.insertBefore(b, aNext);
    parent.insertBefore(a, bNext);
  }
}

/* ── Keyboard: Escape exits arrange mode ── */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && _arrangeActive) {
    exitArrangeMode();
    e.preventDefault();
  }
});

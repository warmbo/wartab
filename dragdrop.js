/* ═══════════════════════════════════════════
   WarTab — Drag & Drop
   ═══════════════════════════════════════════ */
/* Depends on: app.js (config, $, $$, isLucideName, escHtml, saveConfig, saveAndRefresh, renderAll, toast) */
/* State: _linkDrag, iconPickerCallback — declared in app.js */
/* Card grid DnD removed in favor of arrange-mode.js (2026-06-25) */

/* ── Link Drag (section editor) ── */
function startLinkDrag(e, row, sec, srcIdx) {
  if (e.button !== 0) return;
  e.preventDefault();
  row.classList.add('me-link-dragging');
  const label = (sec.links[srcIdx] || {}).label || 'Link';
  const ghost = document.createElement('div');
  ghost.className = 'me-link-ghost';
  ghost.textContent = '⠿ ' + label;
  ghost.style.display = 'none';
  document.body.appendChild(ghost);
  _linkDrag = { srcRow: row, srcIdx, sec, ghost, active: false, _startX: e.clientX, _startY: e.clientY };
  document.addEventListener('pointermove', onLinkDragMove);
  document.addEventListener('pointerup', onLinkDragEnd);
  document.addEventListener('pointercancel', onLinkDragEnd);
}
function linkDropClear() {
  document.querySelectorAll('.me-link-tr.drop-above, .me-link-tr.drop-below').forEach(el => {
    el.classList.remove('drop-above', 'drop-below');
  });
}
function onLinkDragMove(e) {
  if (!_linkDrag) return;
  if (!_linkDrag.active) {
    const dx = e.clientX - _linkDrag._startX, dy = e.clientY - _linkDrag._startY;
    if (dx * dx + dy * dy < 64) return;
    _linkDrag.active = true;
    if (_linkDrag.ghost) _linkDrag.ghost.style.display = '';
  }
  if (!_linkDrag.active || !_linkDrag.ghost) return;
  _linkDrag.ghost.style.cssText = `position:fixed; pointer-events:none; z-index:9999; left:${e.clientX + 10}px; top:${e.clientY - 16}px; display:flex; align-items:center; gap:6px; padding:8px 14px; background:var(--accent-glass); border:2px dashed var(--accent); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); font-size:var(--text-sm); font-weight:600; color:var(--accent); white-space:nowrap;`;
  linkDropClear();
  const rows = _linkDrag.srcRow.parentElement.querySelectorAll('.me-link-tr');
  let targetRow = null;
  let insertBefore = false;
  for (const r of rows) {
    if (r === _linkDrag.srcRow) continue;
    const rect = r.getBoundingClientRect();
    if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
      targetRow = r;
      const midY = rect.top + rect.height / 2;
      insertBefore = e.clientY < midY;
      break;
    }
  }
  if (!targetRow && rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    const rect = lastRow.getBoundingClientRect();
    if (e.clientY > rect.bottom) { targetRow = lastRow; insertBefore = false; }
    else if (e.clientY < rows[0].getBoundingClientRect().top) { targetRow = rows[0]; insertBefore = true; }
  }
  if (targetRow) {
    targetRow.classList.add(insertBefore ? 'drop-above' : 'drop-below');
    _linkDrag._targetRow = targetRow;
    _linkDrag._insertBefore = insertBefore;
  } else {
    _linkDrag._targetRow = null;
  }
}
function onLinkDragEnd(e) {
  document.removeEventListener('pointermove', onLinkDragMove);
  document.removeEventListener('pointerup', onLinkDragEnd);
  document.removeEventListener('pointercancel', onLinkDragEnd);
  if (!_linkDrag) return;
  const { srcRow, srcIdx, sec, ghost, active, _targetRow, _insertBefore } = _linkDrag;
  if (ghost && ghost.parentNode) ghost.remove();
  if (srcRow) srcRow.classList.remove('me-link-dragging');
  linkDropClear();
  if (active && _targetRow) {
    const rows = [...srcRow.parentElement.querySelectorAll('.me-link-tr')];
    const tgtIdxStr = _targetRow.dataset.linkIdx;
    const tgtIdx = tgtIdxStr !== undefined ? parseInt(tgtIdxStr, 10) : -1;
    if (tgtIdx >= 0 && tgtIdx !== srcIdx) {
      const links = sec.links || [];
      const [moved] = links.splice(srcIdx, 1);
      let insertAt = tgtIdx;
      if (tgtIdx > srcIdx) insertAt = tgtIdx - 1;
      if (!_insertBefore) insertAt = insertAt + 1;
      insertAt = Math.min(insertAt, links.length);
      links.splice(insertAt, 0, moved);
      // Rebuild the editor body so row closures/data-linkIdx are regenerated
      // against the new order — otherwise the next remove/edit/drag uses stale
      // indices and targets the wrong link.
      saveAndRefreshStructural();
    }
  }
  _linkDrag = null;
}

/* ── Grid simulation (used by arrange-mode.js) ── */
function simulateGrid(cards, cols) {
  const occ = [];const out = [];
  let curRow = 0, curCol = 0;
  for (const card of cards) {
    const w = Math.min(card.width || 1, cols);const h = card.height || 1;let placed = false;
    for (let row = curRow; !placed && row < 100; row++) {
      const startCol = (row === curRow) ? curCol : 0;
      if (!occ[row]) occ[row] = [];
      for (let col = startCol; col <= cols - w && !placed; col++) {
        let free = true;
        for (let dr = 0; dr < h && free; dr++) for (let dc = 0; dc < w && free; dc++) if (occ[row + dr] && occ[row + dr][col + dc]) free = false;
        if (free) {
          for (let dr = 0; dr < h; dr++) { if (!occ[row + dr]) occ[row + dr] = []; for (let dc = 0; dc < w; dc++) occ[row + dr][col + dc] = true; }
          out.push({ row, col }); placed = true; curRow = row; curCol = col + w;
          if (curCol >= cols) { curRow++; curCol = 0; }
        }
      }
    }
    if (!placed) out.push({ row: 0, col: 0 });
  }
  return out;
}

/* ── Gap helpers ── */
function addGap(){config.cards.push({id:'gap-'+uid(),title:'',icon:'',color:'transparent',width:1,height:1,_isGap:true});saveConfig();renderAll();toast('Gap added','success');}
function removeGap(idx){config.cards.splice(idx,1);saveConfig();renderAll();}

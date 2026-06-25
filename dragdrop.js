/* ═══════════════════════════════════════════
   WarTab — Drag & Drop
   ═══════════════════════════════════════════ */
/* Depends on: app.js (config, $, $$, isLucideName, escHtml, saveConfig, saveAndRefresh, renderAll, toast) */
/* State: dragState, _linkDrag, iconPickerCallback — declared in app.js */

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
      saveAndRefresh();
    }
  }
  _linkDrag = null;
}

/* ── Card Grid Drag ── */
function startDrag(e, id, idx){
  if(e.button!==0)return;
  e.preventDefault();
  const card=config.cards.find(x=>x.id===id);
  if(!card)return;
  const grid=$('#card-grid');
  const srcEl=grid.querySelector(`[data-card-id=\"${id}\"]`);
  if(!srcEl)return;
  srcEl.classList.add('dragging');
  const ghost=document.createElement('div');ghost.className='drag-ghost';
  ghost.style.display='none';
  const cw=Math.min(card.width||1,getPageCols());
  const ch=card.height||1;
  if(card._isGap){
    ghost.innerHTML='<div class="dgh-label">␣ empty gap</div>';
  }else{
    var iconHtml=card.icon?'<span class="ghost-icon">'+(isLucideName(card.icon)?'<i data-lucide="'+card.icon+'" style="width:16px;height:16px;"></i>':card.icon)+'</span>':'';
    ghost.innerHTML='<div class="dgh-label">'+iconHtml+'<span class="ghost-title">'+escHtml(card.title||'Card')+'</span></div>';
  }
  document.body.appendChild(ghost);
  const dropPreview=document.createElement('div');
  dropPreview.className='drag-drop-preview';
  dropPreview.style.display='none';
  document.body.appendChild(dropPreview);
  const srcRect=srcEl.getBoundingClientRect();
  dragState={cardId:id,srcEl,ghost,dropPreview,active:false,_startX:e.clientX,_startY:e.clientY,_beforeCardId:null,
    _cardWidth:cw,_cardHeight:ch,_grabOffs:e.clientX-srcRect.left,_grabOffsY:e.clientY-srcRect.top,
    _cardLeft:srcRect.left,_cardTop:srcRect.top,_cardW:srcRect.width,_cardH:srcRect.height,
    _cardRect:srcRect,_origWidth:srcEl.offsetWidth};
  document.addEventListener('pointermove',onDragMove);
  document.addEventListener('pointerup',onDragEnd);
  document.addEventListener('pointercancel',onDragEnd);
  document.body.style.overflow = 'hidden';
}
function buildRowMap(grid, excludeEl) {
  const items=[...grid.children].filter(el=>el.classList.contains('card')&&el!==excludeEl);
  const rows=[];
  for(const el of items){
    const top=el.offsetTop;
    let found=false;
    for(const row of rows){if(top===row.top){row.cards.push(el);found=true;break;}}
    if(!found)rows.push({top,cards:[el]});
  }
  // Compute bottom from the tallest card in the row (handles mixed heights)
  for(const row of rows){let h=0;for(const cr of row.cards)h=Math.max(h,cr.offsetHeight);row.bottom=row.top+h;}
  return rows;
}
/** Given the current _beforeCardId, predict where CSS Grid auto-placement will
 *  put the dragged card after the drop. Returns pixel {left,top,width,height}
 *  for a card-sized outline, or null if prediction fails. */
function predictDropPixelPos(cols, gr, rows, colW, gap, cardW, cardH){
  var bid=dragState._beforeCardId;
  var all=config.cards,did=dragState.cardId;
  var si=all.findIndex(function(c){return c.id===did;});
  if(si<0)return null;
  var ord=all.slice();var m=ord.splice(si,1)[0];
  var bi=bid?ord.findIndex(function(c){return c.id===bid;}):ord.length;
  ord.splice(bi<0?ord.length:bi,0,m);
  var pos=simulateGrid(ord,cols);
  var ni=ord.findIndex(function(c){return c.id===did;});
  if(ni<0||!pos[ni])return null;
  var row=pos[ni].row,col=pos[ni].col;
  var left=gr.left+col*(colW+gap);
  var pw=cardW*colW+(cardW-1)*gap;
  var top,ph;
  if(rows.length===0){
    top=gr.top+gap+row*(cardH+gap);
    ph=cardH;
  }else{
    if(row<rows.length){top=rows[row].top;ph=rows[row].bottom-rows[row].top;}
    else{
      var lr=rows[rows.length-1];var avgH=(lr.bottom-rows[0].top)/rows.length;
      top=lr.bottom+gap+(row-(rows.length-1))*(avgH+gap);ph=cardH;
    }
  }
  return{left:left,top:top,width:pw,height:ph};
}
function onDragMove(e){
  if(!dragState)return;
  if(!dragState.active){
    const dx=e.clientX-dragState._startX,dy=e.clientY-dragState._startY;
    if(dx*dx+dy*dy<64)return;
    dragState.active=true;
    if(dragState.ghost)dragState.ghost.style.display='';
  }
  if(!dragState.active)return;
  const grid=$('#card-grid'),ghost=dragState.ghost,dSrc=dragState.srcEl;
  if(!ghost||!grid)return;
  const gr=grid.getBoundingClientRect(),cols=getPageCols(),gap=(config.layout.gap||16);
  const colW=(gr.width-(cols-1)*gap)/cols,step=colW+gap;
  const cw=dragState._cardWidth,ch=dragState._cardHeight;
  const rows=buildRowMap(grid,dSrc);
  let targetRow=null,rowIdx=0;
  for(let i=0;i<rows.length;i++){const row=rows[i];if(e.clientY>=row.top-20&&e.clientY<=row.bottom+20){targetRow=row;rowIdx=i;break;}}
  if(!targetRow&&rows.length){
    let best=0,bestD=Infinity;
    for(let i=0;i<rows.length;i++){const d=Math.abs(e.clientY-rows[i].top);if(d<bestD){bestD=d;best=i;}}
    targetRow=rows[best];rowIdx=best;
  }
  const ghostAccent=config.cards.find(c=>c.id===dragState.cardId);
  ghost.style.cssText=`position:fixed;pointer-events:none;z-index:var(--z-drag);left:${e.clientX-dragState._grabOffs}px;top:${e.clientY-dragState._grabOffsY}px;width:${dragState._origWidth}px;min-height:${dragState._cardH || 60}px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${ghostAccent&&ghostAccent.color?ghostAccent.color:'var(--accent)'} 15%, transparent);border:2px dashed ${ghostAccent&&ghostAccent.color?ghostAccent.color:'var(--accent)'};backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);`;
  document.querySelectorAll('.card.push-preview').forEach(function(el){
    el.style.transition='none';el.classList.remove('push-preview');el.style.transform='';
  });
  // Unified drop zone determination — sets _beforeCardId once, no overwrites
  var dropY=e.clientY;
  var dropZone='none',betweenIdx=0;
  if(rows.length>1){for(var ri=0;ri<rows.length-1;ri++){if(dropY>=rows[ri].bottom&&dropY<=rows[ri+1].top){dropZone='between';betweenIdx=ri;break;}}}
  if(dropZone==='none'&&rows.length&&dropY>rows[rows.length-1].bottom)dropZone='below';
  if(dropZone==='none'&&rows.length&&dropY<rows[0].top)dropZone='above';
  if(dropZone==='none'){for(var ri=0;ri<rows.length;ri++){if(dropY>=rows[ri].top&&dropY<=rows[ri].bottom){dropZone='inrow';break;}}}
  // Determine drop target (_beforeCardId) — drives both dropPreview and actual drop
  if(dropZone==='above'||dropZone==='between'||dropZone==='below'){
    if(dropZone==='between'){var nextRow=rows[betweenIdx+1];dragState._beforeCardId=nextRow&&nextRow.cards.length?nextRow.cards[0].dataset.cardId:null;}
    else if(dropZone==='above'){dragState._beforeCardId=rows[0].cards.length?rows[0].cards[0].dataset.cardId:null;}
    else{dragState._beforeCardId=null;}
  }else if(dropZone==='inrow'&&targetRow){
    // Find which card the cursor is over, then decide before/after by midpoint
    var hovered=null;
    for(var el of targetRow.cards){
      var r2=el.getBoundingClientRect();
      if(e.clientX>=r2.left&&e.clientX<=r2.right){hovered=el;break;}
    }
    if(hovered){
      var hr=hovered.getBoundingClientRect();
      if(e.clientX>hr.left+hr.width/2){
        // Right half: insert after (find next card or append)
        var nextEl=null;
        for(var el2 of targetRow.cards){
          var r3=el2.getBoundingClientRect();
          if(r3.left>hr.right){nextEl=el2;break;}
        }
        dragState._beforeCardId=nextEl?nextEl.dataset.cardId:null;
      }else{
        // Left half: insert before
        dragState._beforeCardId=hovered.dataset.cardId;
      }
    }else if(targetRow.cards.length&&e.clientX<targetRow.cards[0].getBoundingClientRect().left){
      dragState._beforeCardId=targetRow.cards[0].dataset.cardId;
    }else{
      dragState._beforeCardId=null;
    }
  }
  // Show dropPreview at simulateGrid-predicted final position
  var dp=dragState.dropPreview;
  if(dropZone!=='none'){
    var pp=dragState._beforeCardId===dragState.cardId?null:predictDropPixelPos(cols,gr,rows,colW,gap,cw,ch);
    if(pp){
      dp.style.display='';
      dp.style.left=pp.left+'px';dp.style.top=pp.top+'px';
      dp.style.width=pp.width+'px';dp.style.height=pp.height+'px';
      dp.style.background='color-mix(in srgb, '+(ghostAccent&&ghostAccent.color?ghostAccent.color:'var(--accent)')+' 12%, transparent)';
      dp.style.border='2px dashed '+(ghostAccent&&ghostAccent.color?ghostAccent.color:'var(--accent)');
      dp.style.borderRadius='var(--radius-md)';
    }else{dp.style.display='none';}
  }else{dp.style.display='none';}
  computeDropShift(dragState._beforeCardId);
}
function dropZoneClear(){
  $$('.card.drop-shift').forEach(function(el){el.classList.remove('drop-shift');});
  document.querySelectorAll('.card-dir-arrow,.card-swap-arrow').forEach(function(el){el.remove();});
}
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
function computeDropShift(targetBeforeCardId) {
  dropZoneClear();
  if(targetBeforeCardId===dragState.cardId)return; // no-op when referencing itself
  const allCards = config.cards;const dragId = dragState.cardId;const cols = getPageCols();
  const srcIdx = allCards.findIndex(c => c.id === dragId);
  if (srcIdx < 0) return;
  const newOrder = [...allCards];const [moved] = newOrder.splice(srcIdx, 1);
  const beforeIdx = targetBeforeCardId ? newOrder.findIndex(c => c.id === targetBeforeCardId) : newOrder.length;
  newOrder.splice(beforeIdx < 0 ? newOrder.length : beforeIdx, 0, moved);
  const oldPos = simulateGrid(allCards, cols);const newPos = simulateGrid(newOrder, cols);
  computeDropShiftFromPositions(allCards, oldPos, newPos, dragId, newOrder, cols);
}
function computeDropShiftFromPositions(allCards, oldPos, newPos, dragId, newOrder, cols) {
  document.querySelectorAll('.card-dir-arrow,.card-swap-arrow').forEach(function(el){el.remove();});
  const grid = document.getElementById('card-grid');
  var dragOldIdx = allCards.findIndex(function(c){return c.id===dragId;});
  var dragOldPos = dragOldIdx>=0?oldPos[dragOldIdx]:null;
  var swapPartnerId = null;
  if(dragOldPos){for(var si=0;si<allCards.length;si++){var sc = allCards[si];if(sc.id===dragId) continue;var sNewIdx = newOrder.findIndex(function(nc){return nc.id===sc.id;});if(sNewIdx<0) continue;var sNewP = newPos[sNewIdx];var sW = Math.min(sc.width || 1, cols);var sH = sc.height || 1;var inCol = (sNewP.col <= dragOldPos.col && dragOldPos.col < sNewP.col + sW);var inRow = (sNewP.row <= dragOldPos.row && dragOldPos.row < sNewP.row + sH);if(inRow && inCol){swapPartnerId = sc.id;break;}}}
  for (let i = 0; i < allCards.length; i++) {
    const c = allCards[i];
    if (c.id === dragId) continue;
    const oldP = oldPos[i];const newIdx = newOrder ? newOrder.findIndex(nc => nc.id === c.id) : -1;
    if (newIdx < 0) continue;const newP = newPos[newIdx];
    const dRow = newP.row - oldP.row;const dCol = newP.col - oldP.col;
    if (dRow !== 0 || dCol !== 0) {
      const el = grid.querySelector(`[data-card-id=\"${c.id}\"]`);
      if (el) {
        el.classList.add('drop-shift');
        var arrow = document.createElement('span');
        var isSwap = (c.id === swapPartnerId);
        arrow.className = isSwap ? 'card-swap-arrow' : 'card-dir-arrow';
        if(isSwap){arrow.textContent = '⇄';}
        else{
          var dir = '';if (dRow < 0) dir += '↑';if (dRow > 0) dir += '↓';if (dCol < 0) dir += '←';if (dCol > 0) dir += '→';
          var dist = Math.abs(dRow) + Math.abs(dCol);arrow.textContent = dist > 1 ? dir + dist : dir;
        }
        var er = el.getBoundingClientRect();
        arrow.style.cssText = 'position:fixed;top:'+(er.top+6)+'px;right:'+(document.body.clientWidth-er.right+6)+'px;z-index:1000;';
        document.body.appendChild(arrow);
      }
    }
  }
}
function onDragEnd(e){
  document.removeEventListener('pointermove',onDragMove);document.removeEventListener('pointerup',onDragEnd);document.removeEventListener('pointercancel',onDragEnd);
  dropZoneClear();
  document.querySelectorAll('.card.push-preview').forEach(function(el){el.classList.remove('push-preview');el.style.transform='';el.style.transition='';});
  if(dragState.dropPreview&&dragState.dropPreview.parentNode)dragState.dropPreview.remove();
  if(!dragState)return;
  const{cardId,srcEl,ghost,active,_beforeCardId}=dragState;
  if(ghost&&ghost.parentNode)ghost.remove();
  if(srcEl)srcEl.classList.remove('dragging');
  document.body.style.overflow = '';
  if(active){
    const grid=$('#card-grid');const cards=config.cards;
    const srcIdx=cards.findIndex(c=>c.id===cardId);
    if(srcIdx<0){renderAll();dragState=null;return;}
    let tgtIdx=-1;
    if(_beforeCardId){tgtIdx=cards.findIndex(c=>c.id===_beforeCardId);}else{tgtIdx=cards.length;}
    if(tgtIdx>=0&&srcIdx!==tgtIdx){
      const allCards=[...grid.children].filter(el=>el.classList.contains('card'));
      const snaps=allCards.map(el=>({el,first:el.getBoundingClientRect()}));
      if(_beforeCardId){const bdom=grid.querySelector(`[data-card-id=\"${_beforeCardId}\"]`);if(bdom)grid.insertBefore(srcEl,bdom);else grid.appendChild(srcEl);}
      else{grid.appendChild(srcEl);}
      const flips=snaps.map(({el,first})=>{const last=el.getBoundingClientRect();return{el,dx:first.left-last.left,dy:first.top-last.top};});
      const moved=flips.filter(f=>f.dx||f.dy);
      if(moved.length && !prefersReducedMotion()){for(const{el,dx,dy}of moved){el.style.transition='none';el.style.transform=`translate(${dx}px,${dy}px)`;}
        requestAnimationFrame(()=>{for(const{el,dx,dy}of moved){if(dx||dy){el.style.transition='transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';el.style.transform='translate(0,0)';}}
          setTimeout(()=>{for(const{el}of moved){el.style.transition='';el.style.transform='';}},450);
        });}
      const[m]=cards.splice(srcIdx,1);const insertAt=tgtIdx>(srcIdx)?tgtIdx-1:tgtIdx;
      cards.splice(insertAt,0,m);saveConfig();
      [...grid.children].filter(el=>el.classList.contains('card')).forEach((el,i)=>{el.dataset.index=i;});
      toast('Card moved','success');dragState=null;return;
    }
  }
  if(srcEl)srcEl.classList.remove('dragging');if(active)renderAll();dragState=null;
}
function addGap(){config.cards.push({id:'gap-'+uid(),title:'',icon:'',color:'transparent',width:1,height:1,_isGap:true});saveConfig();renderAll();toast('Gap added','success');}
function removeGap(idx){config.cards.splice(idx,1);saveConfig();renderAll();}
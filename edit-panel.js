/* ═══════════════════════════════════════════
   WarTab — Card & Page Edit Panel
   Panel open/close, saveAndRefresh, buildCardEditPanel, buildSectionEditor.
   Depends on: $, $$, config, saveConfig (app.js), toast (core.js), renderCard (render.js)
   ═══════════════════════════════════════════ */
let _editingCardId = null, _editPanelOpen = false, _slideTimer = null;

function openCardEditPanel(cardId) {
  const card = config.cards.find(c => c.id === cardId);
  if (!card) return;
  _editingCardId = cardId;
  _editPanelOpen = true;
  $('#edit-panel-body').innerHTML = '';
  buildCardEditPanel(card);
  renderIcons();
  // Highlight the edited card above the overlay so it stays sharp
  const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
  if (cardEl) cardEl.classList.add('card-highlight');
  // Slide panel from the side OPPOSITE the card so the card stays visible
  const panel = $('#edit-panel');
  if (cardEl) {
    const cr = cardEl.getBoundingClientRect();
    const vw = window.innerWidth;
    // Set slide direction FIRST so the panel starts at the correct off-screen position
    // before .open triggers the transition
    if (cr.left + cr.width / 2 > vw / 2) {
      panel.classList.add('slide-left');
    } else {
      panel.classList.remove('slide-left');
    }
  } else {
    panel.classList.remove('slide-left');
  }
  // Force style resolution so the browser registers the starting off-screen
  // transform position (translateX(-100%) or translateX(100%)) before .open
  // triggers the transition. offsetHeight only reflows layout, not transforms.
  // Set panel starting position explicitly via inline style (no CSS cascade ambiguity)
  if (prefersReducedMotion()) {
    // Skip animation — just show panel immediately
    panel.classList.add('open');
    $('#edit-panel-overlay').classList.add('open');
    document.body.classList.add('panel-open');
  } else {
    panel.style.transition='none';
    panel.style.transform=panel.classList.contains('slide-left')?'translateX(-100%)':'translateX(100%)';
    panel.offsetHeight;
    // Double rAF: frame 1 paints the starting position, frame 2 triggers the transition
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        panel.style.transition='';
        panel.classList.add('open');
        panel.style.transform='';  // CSS #edit-panel.open → translateX(0)
        $('#edit-panel-overlay').classList.add('open');
        document.body.classList.add('panel-open');
      });
    });
  }
  const title = $('#edit-panel-title');
  if (title) title.textContent = '✎ ' + (card._isGap ? 'Edit Gap' : escHtml(card.title || 'Untitled'));
}

function updateBlurState() {
  document.body.classList.toggle('panel-open', _editPanelOpen || configPanelOpen);
}

function closeCardEditPanel() {
  // Remove highlight from edited card
  if (_editingCardId) {
    const el = document.querySelector(`[data-card-id="${_editingCardId}"]`);
    if (el) el.classList.remove('card-highlight');
  }
  _editingCardId = null;
  _editingPageId = null;
  _editPanelOpen = false;
  $('#edit-panel-overlay').classList.remove('open');
  $('#edit-panel').classList.remove('open');
  // Keep slide-left during the close transition so --slide-dir stays -100%
  // and the panel slides out to the left. Clean up after animation completes.
  clearTimeout(_slideTimer);
  _slideTimer = setTimeout(function() {
    const p=$('#edit-panel');
    p.style.transition='none';
    p.classList.remove('slide-left');
    p.offsetHeight;
    p.style.transition='';
  }, 380);
  updateBlurState();
}

function saveAndRefresh(structural) {
  saveConfig();
  if (structural && _editingCardId) {
    // Structural change — rebuild the panel body and card preview without
    // re-sliding the panel or destroying the entire page
    const card = config.cards.find(c => c.id === _editingCardId);
    if (card) {
      // Update card preview in-place
      const oldEl = document.querySelector(`[data-card-id="${_editingCardId}"]`);
      if (oldEl) {
        const idx = config.cards.indexOf(card);
        const newEl = renderCard(card, idx);
        oldEl.replaceWith(newEl);
      }
      // Rebuild the panel body to show structural changes (new sections,
      // different module editors, etc.) — no slide animation needed
      const body = $('#edit-panel-body');
      body.innerHTML = '';
      buildCardEditPanel(card);
      // Restore highlight
      const cardEl = document.querySelector(`[data-card-id="${_editingCardId}"]`);
      if (cardEl) cardEl.classList.add('card-highlight');
      const title = $('#edit-panel-title');
      if (title) title.textContent = '✎ ' + (card._isGap ? 'Edit Gap' : escHtml(card.title || 'Untitled'));
    }
    renderIcons();
  } else if (_editingCardId) {
    // Soft save — update the card element in-place without rebuilding the
    // entire page or re-opening the edit panel. The panel body stays stable,
    // no scroll jump, no slide animation.
    const card = config.cards.find(c => c.id === _editingCardId);
    if (card) {
      const oldEl = document.querySelector(`[data-card-id="${_editingCardId}"]`);
      if (oldEl) {
        const idx = config.cards.indexOf(card);
        const newEl = renderCard(card, idx);
        oldEl.replaceWith(newEl);
      }
      const title = $('#edit-panel-title');
      if (title) title.textContent = '✎ ' + (card._isGap ? 'Edit Gap' : escHtml(card.title || 'Untitled'));
    }
    renderIcons();
  } else if (_editingPageId) {
    renderAll();
    renderPageNav();
  } else {
    renderAll();
  }
}

function saveAndRefreshStructural() {
  saveAndRefresh(true);
}

let _editingPageId = null;

function openPageEditPanel(pageId) {
  const page = config.pages[pageId];
  if (!page) return;
  _editingPageId = pageId;
  _editingCardId = null;
  _editPanelOpen = true;
  const body = $('#edit-panel-body');
  body.innerHTML = '';
  const title = $('#edit-panel-title');
  if (title) title.textContent = '✎ Page: ' + escHtml(page.name);

  // Icon row
  const iconG = document.createElement('div');
  iconG.className = 'cs-pair';
  iconG.appendChild(cpLabel('Icon'));
  const iconRow = document.createElement('div');
  iconRow.className = 'cs-icon-row';
  const ip = document.createElement('span');
  ip.className = 'cs-icon-preview';
  if (page.icon && isLucideName(page.icon)) {
    ip.appendChild(renderLucideEl(page.icon, ''));
  } else if (page.icon) {
    ip.textContent = page.icon;
  } else {
    ip.appendChild(renderLucideEl('layout', ''));
  }
  iconRow.appendChild(ip);
  const chIcon = cpBtn('Change');
  chIcon.addEventListener('click', () => openIconPicker(url => { page.icon = url; saveConfig(); renderPageNav(); }));
  iconRow.appendChild(chIcon);
  iconG.appendChild(iconRow);
  body.appendChild(iconG);

  // Name
  const nameG = document.createElement('div');
  nameG.className = 'cs-pair';
  nameG.appendChild(cpLabel('Name'));
  const ni = cpInput('Page name', page.name, v => { page.name = v; saveConfig(); renderPageNav(); });
  nameG.appendChild(ni);
  body.appendChild(nameG);

  // Divider
  body.appendChild(cpDivider(''));

  // Footer
  const foot = document.createElement('div');
  foot.className = 'cp-footer';
  const doneBtn = cpBtn('Done');
  doneBtn.addEventListener('click', closeCardEditPanel);
  foot.appendChild(doneBtn);
  const delBtn = cpBtn('Delete Page', true);
  delBtn.addEventListener('click', () => {
    if (config.pageOrder.length <= 1) { toast('Cannot delete last page'); return; }
    showConfirmModal('Delete page "' + page.name + '"?', () => {
      deletePage(pageId);
      closeCardEditPanel();
    });
  });
  foot.appendChild(delBtn);
  body.appendChild(foot);

  // Open panel
  $('#edit-panel-overlay').classList.add('open');
  $('#edit-panel').classList.add('open');
  renderIcons();
}

/* ── Page Management Panel (overview of all pages) ── */
// Simple drag-to-reorder state for page list
let _pageDrag = null;

function openPageManagementPanel() {
  _editingPageId = null;
  _editingCardId = null;
  _editPanelOpen = true;
  const body = $('#edit-panel-body');
  body.innerHTML = '';
  const title = $('#edit-panel-title');
  if (title) title.textContent = '📄 Manage Pages';

  // Create a card for each page
  (config.pageOrder || []).forEach(function(id) {
    const p = config.pages[id];
    if (!p) return;
    const card = document.createElement('div');
    card.className = 'cp-config-card';
    card.dataset.pageId = id;
    card.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

    // Header with icon + name
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;gap:8px;';
    
    // Drag handle
    const dh = document.createElement('span');
    dh.textContent = '⠿';
    dh.className = 'drag-page-handle';
    dh.title = 'Drag to reorder';
    hdr.appendChild(dh);

    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon-box';
    if (p.icon && isLucideName(p.icon)) {
      iconSpan.appendChild(renderLucideEl(p.icon, ''));
    } else if (p.icon) {
      iconSpan.textContent = p.icon;
    } else {
      iconSpan.appendChild(renderLucideEl('layout', ''));
    }
    hdr.appendChild(iconSpan);

    const nm = document.createElement('span');
    nm.className = 'text-bold';
    nm.textContent = p.name;
    hdr.appendChild(nm);

    // Edit button
    const eb = cpBtn('✎');
    eb.className = 'btn btn-glass btn-sm';
    eb.title = 'Edit page';
    eb.addEventListener('click', function() { openPageEditPanel(id); });
    hdr.appendChild(eb);

    // Delete button
    const db = cpBtn('✕', true);
    db.className = 'btn btn-glass btn-sm btn-danger';
    db.title = 'Delete page';
    db.addEventListener('click', function() {
      if (config.pageOrder.length <= 1) { toast('Cannot delete last page','warning'); return; }
      showConfirmModal('Delete page "' + p.name + '"?', function() {
        deletePage(id);
        body.innerHTML = '';
        openPageManagementPanel();
      });
    });
    hdr.appendChild(db);

    card.appendChild(hdr);
    body.appendChild(card);

    // Drag-to-reorder via pointer events
    dh.addEventListener('pointerdown', function(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      card.style.opacity = '0.4';
      card.style.transform = 'scale(0.97)';
      _pageDrag = { card: card, pageId: id, startY: e.clientY };
      document.addEventListener('pointermove', onPageDragMove);
      document.addEventListener('pointerup', onPageDragEnd);
      document.addEventListener('pointercancel', onPageDragEnd);
    });
  });

  // Render icons for all page cards
  renderIcons();

  // Footer with Add + Done
  const foot = document.createElement('div');
  foot.className = 'cp-footer';
  foot.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
  const addBtn = cpBtn('+ Add Page');
  addBtn.addEventListener('click', function() {
    addPage();
    body.innerHTML = '';
    openPageManagementPanel();
  });
  foot.appendChild(addBtn);
  const doneBtn = cpBtn('Done');
  doneBtn.addEventListener('click', closeCardEditPanel);
  foot.appendChild(doneBtn);
  body.appendChild(foot);

  // Open panel (same positioning logic as card edit)
  const panel = $('#edit-panel');
  panel.classList.remove('slide-left');
  panel.style.transition = 'none';
  panel.style.transform = 'translateX(100%)';
  panel.offsetHeight;
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      panel.style.transition = '';
      panel.classList.add('open');
      panel.style.transform = '';
      $('#edit-panel-overlay').classList.add('open');
      document.body.classList.add('panel-open');
    });
  });
}

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
function buildCardEditPanel(card) {
  const body = $('#edit-panel-body');
  body.innerHTML = '';

  if (card._isGap) {
    body.appendChild(cpRange('Width', card.width, 1, config.layout.cols, v => {
      card.width = parseInt(v); saveAndRefresh();
    }));
    body.appendChild(cpRange('Min Height (px)', card.minHeight || 0, 0, 400, v => {
      card.minHeight = parseInt(v) || 0; saveAndRefresh();
    }));
    body.appendChild(cpCheck('Empty gap (no content)', true, v => {
      if (!v) { card.sections = card._savedSections || [{ id: 'sec-' + uid(), type: 'links', label: 'Links', links: [{ label: 'Example', url: 'https://example.com', icon: 'link' }] }]; }
      card._isGap = v;
      saveAndRefreshStructural();
    }));
    const foot = document.createElement('div');
    foot.className = 'cp-footer';
    const done = cpBtn('Done');
    done.addEventListener('click', closeCardEditPanel);
    foot.appendChild(done);
    body.appendChild(foot);
    return;
  }

  /* ── Card Settings ── */
  body.appendChild(cpDivider('CARD SETTINGS'));
  const panel = document.createElement('div');
  panel.className = 'cs-panel';
  const grid = document.createElement('div');
  grid.className = 'cs-grid';

  // Title
  const titleG = document.createElement('div');
  titleG.className = 'cs-full cs-pair';
  titleG.appendChild(cpLabel('Title'));
  const ti = cpInput('Card title', card.title, v => { card.title = v; saveAndRefresh(); });
  titleG.appendChild(ti);
  grid.appendChild(titleG);

  // Icon
  const iconG = document.createElement('div');
  iconG.className = 'cs-pair';
  iconG.appendChild(cpLabel('Icon'));
  const iconRow = document.createElement('div');
  iconRow.className = 'cs-icon-row';
  const ip = document.createElement('span');
  ip.className = 'cs-icon-preview';
  if (card.icon && (card.icon.startsWith('http') || card.icon.startsWith('data:') || card.icon.startsWith('/'))) {
    const img = document.createElement('img'); img.src = card.icon; img.style.cssText = 'width:20px;height:20px;object-fit:contain;';
    ip.appendChild(img);
  } else if (isLucideName(card.icon)) {
    ip.appendChild(renderLucideEl(card.icon, ''));
  } else if (card.icon) {
    ip.textContent = card.icon;
  }
  // else: blank — no icon
  iconRow.appendChild(ip);
  const chIcon = cpBtn('Change');
  chIcon.addEventListener('click', () => openIconPicker(url => { card.icon = url; saveAndRefresh(); }));
  iconRow.appendChild(chIcon);
  const clIcon = cpBtn('✕');
  clIcon.addEventListener('click', () => { card.icon = ''; saveAndRefresh(); });
  iconRow.appendChild(clIcon);
  iconG.appendChild(iconRow);
  grid.appendChild(iconG);

  // Color
  const colorG = document.createElement('div');
  colorG.className = 'cs-pair';
  colorG.appendChild(cpLabel('Color'));
  const colorRow = document.createElement('div');
  colorRow.className = 'cs-color-row';
  const cp = document.createElement('input');
  cp.type = 'color'; cp.value = card.color || config.theme.glow;
  cp.style.cssText = 'width:40px;height:34px;padding:2px;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);cursor:pointer;flex-shrink:0;';
  const ct = document.createElement('input');
  ct.className = 'cp-input';
  ct.type = 'text'; ct.value = card.color || config.theme.glow;
  const syncColor = v => { cp.value = v; ct.value = v; card.color = v; saveAndRefresh(); };
  cp.addEventListener('change', () => syncColor(cp.value));
  ct.addEventListener('change', () => syncColor(ct.value));
  colorRow.appendChild(cp);
  colorRow.appendChild(ct);
  colorG.appendChild(colorRow);
  grid.appendChild(colorG);

  // Width
  const wG = document.createElement('div');
  wG.className = 'cs-pair';
  wG.appendChild(cpRange('Width', card.width, 1, config.layout.cols, v => { card.width = parseInt(v); saveAndRefresh(); }));
  grid.appendChild(wG);

  // Height
  const hG = document.createElement('div');
  hG.className = 'cs-pair';
  hG.appendChild(cpRange('Height', card.height || 1, 1, 4, v => { card.height = parseInt(v); saveAndRefresh(); }));
  grid.appendChild(hG);

  // Gap toggle (full width)
  const gapG = document.createElement('div');
  gapG.className = 'cs-full';
  gapG.appendChild(cpCheck('Empty gap (no content)', false, v => {
    card._isGap = v;
    if (v) { card._savedSections = card.sections; card.sections = []; }
    else { card.sections = card._savedSections || []; }
    saveAndRefreshStructural();
  }));
  grid.appendChild(gapG);

  // Transparent card (see-through, no bg/border/shadow)
  const trG = document.createElement('div');
  trG.className = 'cs-full';
  trG.appendChild(cpCheck('Transparent (no background)', card.transparent, v => { card.transparent = v; saveAndRefresh(); }));
  grid.appendChild(trG);

  panel.appendChild(grid);
  body.appendChild(panel);

  /* ── Sections ── */
  body.appendChild(cpDivider('SECTIONS'));
  (card.sections || []).forEach((sec, si) => {
    try {
      body.appendChild(buildSectionEditor(sec, card, si));
    } catch(e) {
      console.error('Section editor error', e);
    }
  });
  const addSecBtn = cpBtn('+ Add Section');
  addSecBtn.style.marginTop = '4px';
  addSecBtn.addEventListener('click', () => {
    card.sections = card.sections || [];
    card.sections.push({ id: 'sec-' + uid(), type: 'links', label: 'Links', links: [{ label: 'Example', url: 'https://example.com', icon: 'link' }] });
    saveAndRefreshStructural();
    toast('Section added');
  });
  body.appendChild(addSecBtn);

  /* ── Footer ── */
  const foot = document.createElement('div');
  foot.className = 'cp-footer';
  const doneBtn = cpBtn('Done');
  doneBtn.addEventListener('click', closeCardEditPanel);
  foot.appendChild(doneBtn);
  const delBtn = cpBtn('Delete Card', true);
  delBtn.addEventListener('click', () => {
    const snap = cloneObj(config.cards);
    const idx = config.cards.findIndex(c => c.id === card.id);
    if (idx < 0) return;
    showConfirmModal('Delete "' + (card.title || 'card') + '"?', function() {
      config.cards.splice(idx, 1);
      closeCardEditPanel();
      saveConfig();
      renderAll();
      toastWithUndo('Card deleted', () => { config.cards = snap; saveConfig(); renderAll(); });
    });
  });
  foot.appendChild(delBtn);
  body.appendChild(foot);
}

function buildSectionEditor(sec, card, si) {
  const cardEl = document.createElement('div');
  cardEl.className = 'se-card';
  cardEl.dataset.secIdx = si;
  cardEl.style.borderLeftColor = card.color || config.theme.glow;

  /* ── Card Header: drag handle | badge | title | actions ── */
  const hdr = document.createElement('div');
  hdr.className = 'se-card-header';

  // Grab handle
  const dh = document.createElement('span');
  dh.className = 'se-drag-handle';
  dh.textContent = '⠿';
  dh.title = 'Drag to reorder';
  hdr.appendChild(dh);

  // Type badge
  const badge = document.createElement('span');
  badge.className = 'me-badge';
  badge.textContent = sec.type;
  hdr.appendChild(badge);

  // Section heading title
  const title = document.createElement('span');
  title.className = 'se-card-title';
  title.textContent = sec.label || 'Untitled';
  hdr.appendChild(title);

  // Actions (delete)
  const acts = document.createElement('div');
  acts.className = 'se-card-actions';
  const del = cpBtn('✕', true);
  del.title = 'Delete section';
  del.addEventListener('click', e => {
    e.stopPropagation();
    const c = config.cards.find(x => x.id === card.id);
    if (!c) return;
    c.sections.splice(si, 1);
    saveAndRefreshStructural();
    toast('Section deleted');
  });
  acts.appendChild(del);
  hdr.appendChild(acts);
  cardEl.appendChild(hdr);

  /* ── Card Body ── */
  const bd = document.createElement('div');
  bd.className = 'se-card-body';

  /* Label + Type side by side */
  const row1 = document.createElement('div');
  row1.className = 'se-inline';
  const lg = document.createElement('div');
  lg.appendChild(cpLabel('Label'));
  const li = cpInput('Section heading', sec.label || '', v => {
    sec.label = v; saveAndRefresh();
  });
  lg.appendChild(li);
  row1.appendChild(lg);
  const tg = document.createElement('div');
  tg.appendChild(cpLabel('Type'));
  const sel = cpSelect(
    [
      {value:'links',label:'Links'},
      {value:'link-list',label:'Link List'},
      {value:'search',label:'Search'},
      {value:'clock',label:'Clock'},
      {value:'weather',label:'Weather'},
      {value:'timer',label:'Timer'},
      {value:'iframe',label:'iFrame'},
      {value:'notes',label:'Notes'},
      {value:'api-poller',label:'API Poller'},
      {value:'quotes',label:'Quotes'},
      {value:'resource-monitor',label:'Resource Monitor'},
      {value:'image',label:'Image'},
      {value:'lan-scan',label:'LAN Scan'},
      {value:'digital-pet',label:'Digital Pet'},
      {value:'ascii-anim',label:'ASCII Animation'},
      {value:'media',label:'Media Card'},
      {value:'proxmox',label:'Proxmox'},
      {value:'git',label:'Git Repo'},
    ],
    sec.type,
    v => {
      // Auto-title the section label from the type name
      if (!sec.label || sec.label === sec.type || sec.label === 'Links') {
        sec.label = v.charAt(0).toUpperCase() + v.slice(1).replace('-', ' ');
      }
      sec.type = v;
      // Merge defaults for the new type
      const mod = CARD_MODULES[v];
      if (mod && mod.defaults) Object.assign(sec, cloneObj(mod.defaults));
      saveAndRefreshStructural();
    }
  );
  tg.appendChild(sel);
  row1.appendChild(tg);
  bd.appendChild(row1);

  /* Module editor fields */
  const mc = document.createElement('div');
  mc.className = 'me-card';
  const mod = CARD_MODULES[sec.type];  if (mod && mod.editor) mod.editor(sec, card, mc);
  if (mc.children.length > 0) bd.appendChild(mc);
  cardEl.appendChild(bd);

  /* ── Drag setup ── */
  dh.addEventListener('pointerdown', e => {
    startSectionDrag(e, card.id, si, cardEl);
  });

  return cardEl;
}

/* ── Section drag-and-drop (vertical reorder in edit panel) ── */
let secDragState = null;

function startSectionDrag(e, cardId, secIdx, srcEl) {
  if (e.button !== 0) return;
  e.preventDefault();
  secDragState = {
    cardId,
    secIdx,
    srcEl,
    ghost: null,
    active: false,
    _startY: e.clientY,
  };
  document.addEventListener('pointermove', onSecDragMove);
  document.addEventListener('pointerup', onSecDragEnd);
}

function onSecDragMove(e) {
  if (!secDragState) return;
  if (!secDragState.active) {
    if (Math.abs(e.clientY - secDragState._startY) < 8) return;
    secDragState.active = true;
    // Create ghost indicator
    const ghost = document.createElement('div');
    ghost.className = 'se-ghost';
    ghost.style.display = 'none';
    secDragState.srcEl.parentNode.insertBefore(ghost, secDragState.srcEl);
    secDragState.ghost = ghost;
    secDragState.srcEl.classList.add('dragging');
  }

  const { srcEl, ghost } = secDragState;
  if (!ghost) return;

  const body = srcEl.parentNode;
  if (!body) return;

  // Gather all section cards (excluding the dragged one)
  const cards = [...body.querySelectorAll('.se-card')].filter(el => el !== srcEl);
  let insertBefore = null;

  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      insertBefore = card;
      break;
    }
  }

  // Move ghost to the correct position
  if (insertBefore) {
    body.insertBefore(ghost, insertBefore);
  } else {
    // Append after last card
    const lastCard = cards[cards.length - 1];
    if (lastCard && lastCard.nextSibling) {
      body.insertBefore(ghost, lastCard.nextSibling);
    } else {
      body.appendChild(ghost);
    }
  }

  ghost.style.display = '';
}

function onSecDragEnd(e) {
  document.removeEventListener('pointermove', onSecDragMove);
  document.removeEventListener('pointerup', onSecDragEnd);
  if (!secDragState) return;
  const { cardId, srcEl, ghost, active } = secDragState;
  if (srcEl) srcEl.classList.remove('dragging');

  if (active && ghost && ghost.parentNode) {
    const body = document.getElementById('edit-panel-body');
    if (body) {
      // The ghost was moved to the target position — read where it landed
      const nextCard = ghost.nextElementSibling &&
        ghost.nextElementSibling.classList.contains('se-card')
        ? ghost.nextElementSibling : null;
      ghost.remove();

      const allCards = [...body.querySelectorAll('.se-card')];
      // If ghost was before a card, insert at that card's index; if at end, use length
      const newIdx = nextCard ? allCards.indexOf(nextCard) : allCards.length;
      if (newIdx >= 0) {
        const c = config.cards.find(x => x.id === cardId);
        if (c) {
          const oldIdx = secDragState.secIdx;
          if (oldIdx !== newIdx) {
            const secs = c.sections;
            const [m] = secs.splice(oldIdx, 1);
            const targetIdx = newIdx > oldIdx ? newIdx - 1 : newIdx;
            secs.splice(targetIdx, 0, m);
            saveAndRefreshStructural();
            toast('Section moved');
            secDragState = null;
            return;
          }
        }
      }
    }
    renderAll();
    if (cardId) openCardEditPanel(cardId);
  } else if (ghost && ghost.parentNode) {
    ghost.remove();
  }

  secDragState = null;
}

/* ═══════════════════════════════════════════
   SECTION 3: DEFAULT CONFIG
   Starting config used when no config.json exists yet.
   Edit this to change the default dashboard layout for new installations.

   Icon paths (/icons/name.svg) reference locally cached selfhst/icons files.
   ═══════════════════════════════════════════ */

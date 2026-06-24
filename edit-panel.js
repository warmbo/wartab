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
  // Re-render the edited card before closing so all saveConfig()-only field
  // changes (weather API key, api-poller URL, git repo, etc.) are reflected
  // in the DOM without requiring a full page refresh.
  // Only trigger for card editing — page editing handles its own renders.
  if (_editingCardId) saveAndRefresh();
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


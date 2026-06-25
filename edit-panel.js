/* ═══════════════════════════════════════════
   WarTab — Card & Page Edit Panel
   Panel open/close, saveAndRefresh, buildCardEditPanel, buildSectionEditor.
   Depends on: $, $$, config, saveConfig (app.js), toast (core.js), renderCard (render.js)
   ═══════════════════════════════════════════ */
let _editingCardId = null, _editPanelOpen = false, _slideTimer = null;
let _savedScrollPos = 0;  // for scroll preservation on rebuild

/* ── Scroll position helpers ── */
function _saveScroll() {
  var body = $('#edit-panel-body');
  if (body) _savedScrollPos = body.scrollTop;
}
function _restoreScroll() {
  var body = $('#edit-panel-body');
  if (body && _savedScrollPos > 0) {
    requestAnimationFrame(function() { body.scrollTop = _savedScrollPos; });
  }
}

/* ── Collapsible section helper ── */
function _collapsibleSection(label, defaultOpen) {
  var wrap = document.createElement('div');
  wrap.className = 'ep-section';

  var hdr = document.createElement('button');
  hdr.className = 'ep-section-hdr';
  hdr.type = 'button';
  hdr.innerHTML = '<span class="ep-section-arrow">▶</span><span class="ep-section-label">' + label + '</span>';
  wrap.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'ep-section-body';
  if (!defaultOpen) {
    body.classList.add('ep-collapsed');
    hdr.classList.add('ep-collapsed');
  }
  wrap.appendChild(body);

  hdr.addEventListener('click', function() {
    var isOpen = !body.classList.contains('ep-collapsed');
    body.classList.toggle('ep-collapsed', isOpen);
    hdr.classList.toggle('ep-collapsed', isOpen);
  });

  return { wrap: wrap, body: body, hdr: hdr };
}

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
    if (cr.left + cr.width / 2 > vw / 2) {
      panel.classList.add('slide-left');
    } else {
      panel.classList.remove('slide-left');
    }
  } else {
    panel.classList.remove('slide-left');
  }
  if (prefersReducedMotion()) {
    panel.classList.add('open');
    $('#edit-panel-overlay').classList.add('open');
    document.body.classList.add('panel-open');
  } else {
    panel.style.transition='none';
    panel.style.transform=panel.classList.contains('slide-left')?'translateX(-100%)':'translateX(100%)';
    panel.offsetHeight;
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        panel.style.transition='';
        panel.classList.add('open');
        panel.style.transform='';
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
  if (_editingCardId) saveAndRefresh();
  if (_editingCardId) {
    const el = document.querySelector(`[data-card-id="${_editingCardId}"]`);
    if (el) el.classList.remove('card-highlight');
  }
  _editingCardId = null;
  _editingPageId = null;
  _editPanelOpen = false;
  _savedScrollPos = 0;
  $('#edit-panel-overlay').classList.remove('open');
  $('#edit-panel').classList.remove('open');
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
  _saveScroll();
  if (structural && _editingCardId) {
    const card = config.cards.find(c => c.id === _editingCardId);
    if (card) {
      const oldEl = document.querySelector(`[data-card-id="${_editingCardId}"]`);
      if (oldEl) {
        const idx = config.cards.indexOf(card);
        const newEl = renderCard(card, idx);
        oldEl.replaceWith(newEl);
      }
      const body = $('#edit-panel-body');
      body.innerHTML = '';
      buildCardEditPanel(card);
      const cardEl = document.querySelector(`[data-card-id="${_editingCardId}"]`);
      if (cardEl) cardEl.classList.add('card-highlight');
      const title = $('#edit-panel-title');
      if (title) title.textContent = '✎ ' + (card._isGap ? 'Edit Gap' : escHtml(card.title || 'Untitled'));
    }
    renderIcons();
    _restoreScroll();
  } else if (_editingCardId) {
    const card = config.cards.find(c => c.id === _editingCardId);
    if (card) {
      const oldEl = document.querySelector(`[data-card-id="${_editingCardId}"]`);
      if (oldEl) {
        const idx = config.cards.indexOf(card);
        const newEl = renderCard(card, idx);
        oldEl.replaceWith(newEl);
        // Re-highlight the new card element (lost on replaceWith)
        const cardEl = document.querySelector(`[data-card-id="${_editingCardId}"]`);
        if (cardEl) cardEl.classList.add('card-highlight');
      }
      const title = $('#edit-panel-title');
      if (title) title.textContent = '✎ ' + (card._isGap ? 'Edit Gap' : escHtml(card.title || 'Untitled'));
    }
    renderIcons();
    _restoreScroll();
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

/* ═══════════════════════════════════════════
   BUILD CARD EDIT PANEL
   ═══════════════════════════════════════════ */

function buildCardEditPanel(card) {
  const body = $('#edit-panel-body');
  body.innerHTML = '';

  if (card._isGap) {
    body.appendChild(cpRange('Width', card.width, 1, config.layout.cols, function(v) {
      card.width = parseInt(v); saveAndRefresh();
    }));
    body.appendChild(cpRange('Min Height (px)', card.minHeight || 0, 0, 400, function(v) {
      card.minHeight = parseInt(v) || 0; saveAndRefresh();
    }));
    body.appendChild(cpCheck('Empty gap (no content)', true, function(v) {
      if (!v) { card.sections = card._savedSections || [{ id: 'sec-' + uid(), type: 'links', label: 'Links', links: [{ label: 'Example', url: 'https://example.com', icon: 'link' }] }]; }
      card._isGap = v;
      saveAndRefreshStructural();
    }));
    // Use sticky action bar
    body.appendChild(_buildActionBar(card));
    return;
  }

  /* ── CARD SETTINGS section ── */
  var cs = _collapsibleSection('Card Settings', true);
  body.appendChild(cs.wrap);

  var settingsGrid = document.createElement('div');
  settingsGrid.className = 'ep-settings-grid';
  cs.body.appendChild(settingsGrid);

  // Title (full width)
  var titleG = document.createElement('div');
  titleG.className = 'ep-full';
  titleG.appendChild(cpLabel('Title'));
  titleG.appendChild(cpInput('Card title', card.title, function(v) { card.title = v; saveAndRefresh(); }));
  titleG.appendChild(cpHint('Double-click any card title on the dashboard to rename it inline'));
  settingsGrid.appendChild(titleG);

  // Icon + Color row
  var iconColorRow = document.createElement('div');
  iconColorRow.className = 'ep-icon-color';

  // Icon
  var iconG = document.createElement('div');
  iconG.className = 'ep-pair';
  iconG.appendChild(cpLabel('Icon'));
  var iconRow = document.createElement('div');
  iconRow.className = 'cs-icon-row';
  var ip = document.createElement('span');
  ip.className = 'cs-icon-preview';
  if (card.icon && (card.icon.startsWith('http') || card.icon.startsWith('data:') || card.icon.startsWith('/'))) {
    var img = document.createElement('img'); img.src = card.icon; img.style.cssText = 'width:20px;height:20px;object-fit:contain;';
    ip.appendChild(img);
  } else if (isLucideName(card.icon)) {
    ip.appendChild(renderLucideEl(card.icon, ''));
  } else if (card.icon) {
    ip.textContent = card.icon;
  }
  iconRow.appendChild(ip);
  var chIcon = cpBtn('Change');
  chIcon.addEventListener('click', function() { openIconPicker(function(url) { card.icon = url; saveAndRefresh(); }); });
  iconRow.appendChild(chIcon);
  var clIcon = cpBtn('✕');
  clIcon.addEventListener('click', function() { card.icon = ''; saveAndRefresh(); });
  iconRow.appendChild(clIcon);
  iconG.appendChild(iconRow);
  iconColorRow.appendChild(iconG);

  // Color
  var colorG = document.createElement('div');
  colorG.className = 'ep-pair';
  colorG.appendChild(cpLabel('Color'));
  var colorRow = document.createElement('div');
  colorRow.className = 'cs-color-row';
  var cp = document.createElement('input');
  cp.type = 'color'; cp.value = card.color || config.theme.glow;
  cp.style.cssText = 'width:40px;height:34px;padding:2px;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);cursor:pointer;flex-shrink:0;';
  var ct = document.createElement('input');
  ct.className = 'cp-input';
  ct.type = 'text'; ct.value = card.color || config.theme.glow;
  var syncColor = function(v) { cp.value = v; ct.value = v; card.color = v; saveAndRefresh(); };
  cp.addEventListener('change', function() { syncColor(cp.value); });
  ct.addEventListener('change', function() { syncColor(ct.value); });
  colorRow.appendChild(cp);
  colorRow.appendChild(ct);
  colorG.appendChild(colorRow);
  iconColorRow.appendChild(colorG);

  settingsGrid.appendChild(iconColorRow);

  // Width + Height row
  var sizeRow = document.createElement('div');
  sizeRow.className = 'ep-size-row';
  sizeRow.appendChild(cpRange('Width', card.width, 1, config.layout.cols, function(v) { card.width = parseInt(v); saveAndRefresh(); }));
  sizeRow.appendChild(cpRange('Height', card.height || 1, 1, 4, function(v) { card.height = parseInt(v); saveAndRefresh(); }));
  settingsGrid.appendChild(sizeRow);

  /* ── LAYOUT section (card-level defaults for all sections) ── */
  var layoutSec = _collapsibleSection('Layout', false);
  body.appendChild(layoutSec.wrap);

  // Compute card-level style defaults from all sections
  function getCardStyles() {
    var align = 'left', density = 'standard', scale = 'medium';
    if (card.sections && card.sections.length) {
      var s = card.sections[0].styles || {};
      align = s.align || 'left';
      density = s.density || 'standard';
      scale = s.scale || 'medium';
    }
    return { align: align, density: density, scale: scale };
  }

  function applyCardStyles(align, density, scale) {
    (card.sections || []).forEach(function(sec) {
      if (!sec.styles) sec.styles = {};
      sec.styles.align = align;
      sec.styles.density = density;
      sec.styles.scale = scale;
    });
    saveAndRefresh();
    // Rebuild panel to show updated section editor values
    var title = $('#edit-panel-title');
    if (title) title.textContent = '✎ ' + (card._isGap ? 'Edit Gap' : escHtml(card.title || 'Untitled'));
  }

  var cardSt = getCardStyles();

  // Alignment buttons
  var alGroup = document.createElement('div');
  alGroup.style.cssText = 'margin-bottom:var(--space-2);';
  alGroup.appendChild(cpLabel('Alignment'));
  var alRow = document.createElement('div');
  alRow.style.cssText = 'display:flex;gap:4px;';
  ['left', 'center', 'right'].forEach(function(a) {
    var ab = document.createElement('button');
    ab.textContent = a.charAt(0).toUpperCase() + a.slice(1);
    ab.style.cssText = 'flex:1;padding:4px 6px;border:1px solid var(--surface-border);background:' +
      (cardSt.align === a ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.2)') +
      ';color:var(--text-primary);cursor:pointer;border-radius:3px;font-size:var(--text-xs);';
    ab.addEventListener('click', function() {
      applyCardStyles(a, cardSt.density, cardSt.scale);
    });
    alRow.appendChild(ab);
  });
  alGroup.appendChild(alRow);
  layoutSec.body.appendChild(alGroup);

  // Density
  layoutSec.body.appendChild(cpLabel('Density'));
  layoutSec.body.appendChild(cpSelect(
    [{value:'compact',label:'Compact'},{value:'standard',label:'Standard'},{value:'comfortable',label:'Comfortable'}],
    cardSt.density,
    function(v) { applyCardStyles(cardSt.align, v, cardSt.scale); }
  ));

  // Scale
  layoutSec.body.appendChild(cpLabel('Scale'));
  layoutSec.body.appendChild(cpSelect(
    [{value:'small',label:'Small'},{value:'medium',label:'Medium'},{value:'large',label:'Large'}],
    cardSt.scale,
    function(v) { applyCardStyles(cardSt.align, cardSt.density, v); }
  ));

  layoutSec.body.appendChild(cpHint('Applies to all sections in this card. Override per section in each section editor.'));

  /* ── SECTIONS section ── */
  var secSec = _collapsibleSection('Sections', true);
  body.appendChild(secSec.wrap);

  (card.sections || []).forEach(function(sec, si) {
    try {
      secSec.body.appendChild(buildSectionEditor(sec, card, si));
    } catch(e) {
      console.error('Section editor error', e);
    }
  });

  var addSecBtn = cpBtn('+ Add Section');
  addSecBtn.style.marginTop = '4px';
  addSecBtn.addEventListener('click', function() {
    card.sections = card.sections || [];
    card.sections.push({ id: 'sec-' + uid(), type: 'links', label: 'Links', styles:{ align:'left', density:'standard', scale:'medium' }, links: [{ label: 'Example', url: 'https://example.com', icon: 'link' }] });
    saveAndRefreshStructural();
    toast('Section added');
  });
  secSec.body.appendChild(addSecBtn);

  /* ── ADVANCED section ── */
  var adv = _collapsibleSection('Advanced', false);
  body.appendChild(adv.wrap);

  adv.body.appendChild(cpCheck('Empty gap (no content)', false, function(v) {
    card._isGap = v;
    if (v) { card._savedSections = card.sections; card.sections = []; }
    else { card.sections = card._savedSections || []; }
    saveAndRefreshStructural();
  }));
  adv.body.appendChild(cpCheck('Transparent (no background)', card.transparent, function(v) { card.transparent = v; saveAndRefresh(); }));

  /* ── STICKY ACTION BAR ── */
  body.appendChild(_buildActionBar(card));
}

/* ── Build the sticky action bar ── */
function _buildActionBar(card) {
  var bar = document.createElement('div');
  bar.className = 'ep-action-bar';

  var doneBtn = document.createElement('button');
  doneBtn.className = 'btn btn-glass ep-action-primary';
  doneBtn.textContent = 'Done';
  doneBtn.addEventListener('click', closeCardEditPanel);
  bar.appendChild(doneBtn);

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-glass ep-action-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', closeCardEditPanel);
  bar.appendChild(cancelBtn);

  if (!card._isGap) {
    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-glass ep-action-add';
    addBtn.innerHTML = '+ Add Section';
    addBtn.addEventListener('click', function() {
      card.sections = card.sections || [];
      card.sections.push({ id: 'sec-' + uid(), type: 'links', label: 'Links', styles:{ align:'left', density:'standard', scale:'medium' }, links: [{ label: 'Example', url: 'https://example.com', icon: 'link' }] });
      saveAndRefreshStructural();
      toast('Section added');
    });
    bar.appendChild(addBtn);

    var spacer = document.createElement('div');
    spacer.className = 'ep-action-spacer';
    bar.appendChild(spacer);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-glass btn-danger ep-action-del';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', function() {
      var snap = cloneObj(config.cards);
      var idx = config.cards.findIndex(function(c) { return c.id === card.id; });
      if (idx < 0) return;
      showConfirmModal('Delete "' + (card.title || 'card') + '"?', function() {
        config.cards.splice(idx, 1);
        closeCardEditPanel();
        saveConfig();
        renderAll();
        toastWithUndo('Card deleted', function() { config.cards = snap; saveConfig(); renderAll(); });
      });
    });
    bar.appendChild(delBtn);
  }

  return bar;
}

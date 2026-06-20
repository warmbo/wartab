/* ═══════════════════════════════════════════
   WarTab — Application Logic
   ═══════════════════════════════════════════
   Sections:
     1. Card Type Modules  — registerModule() calls for each section type
     2. Config Panel       — edit panel, form helpers, section editor, section drag
     3. Default Config     — DEFAULT_CONFIG with field documentation
     4. Icon Data          — ICON_REPO, EMOJIS, LUCIDE_ICONS, migration maps
     5. Utilities          — isLucideName, renderLucideEl, uid, $/$$
     6. Config Load/Save   — loadConfig, saveConfig, applyChanges, renderAll
     7. Render             — renderCard, renderSection, renderLinkIcon, doSearch
     8. Widgets            — clocks, weather, API poller, quotes, status bars
     9. Drag & Drop        — card reorder with insertion indicator + FLIP animation
    10. Icon Picker        — library/upload/emoji/Lucide tabbed picker
    11. Background Upload  — image upload + compression
    12. Config Panel UI    — theme, branding, layout, status bar settings
    13. Init               — page load sequence
   ═══════════════════════════════════════════ */

let WARTAB_VERSION = '';

/* ══════ Card Type Modules ══════
   Each module defines { render, editor, defaults } for a section type.
   Add new types here without touching core rendering. */
const CARD_MODULES = {};

function registerModule(type, module){
  CARD_MODULES[type]=module;
}

// Built-in modules — each owns { defaults, render(sec,card,cw), editor(sec,card,bd) }

/* ── Public API presets for API Poller ── */
const API_PRESETS = [
  { label:'GitHub Repo', url:'https://api.github.com/repos/warmbo/wartab', fields:[{label:'Stars',path:'stargazers_count'},{label:'Forks',path:'forks_count'},{label:'Issues',path:'open_issues_count'}], icon:'github' },
  { label:'Bitcoin Price', url:'https://api.coinbase.com/v2/prices/BTC-USD/spot', fields:[{label:'BTC/USD',path:'data.amount'}], icon:'bitcoin' },
  { label:'Dog API', url:'https://dog.ceo/api/breeds/image/random', fields:[{label:'Breed Image',path:'message'}], icon:'dog' },
  { label:'IP Info', url:'http://ip-api.com/json/', fields:[{label:'IP',path:'query'},{label:'ISP',path:'isp'},{label:'City',path:'city'},{label:'Country',path:'country'}], icon:'map-pin' },
  { label:'Random User', url:'https://randomuser.me/api/', fields:[{label:'Name',path:'results.0.name.first'},{label:'Country',path:'results.0.location.country'}], icon:'users' },
  { label:'Open-Meteo (NYC)', url:'https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current_weather=true', fields:[{label:'Temp °C',path:'current_weather.temperature'},{label:'Wind km/h',path:'current_weather.windspeed'}], icon:'cloud-sun' },
  { label:'Joke', url:'https://v2.jokeapi.dev/joke/Any?type=single', fields:[{label:'Joke',path:'joke'}], icon:'message-circle' },
  { label:'ISS Location', url:'http://api.open-notify.org/iss-now.json', fields:[{label:'Lat',path:'iss_position.latitude'},{label:'Lon',path:'iss_position.longitude'}], icon:'globe' },
];

/* ── LAN Scan — terminal-style ARP table viewer ── */

function fetchLanScan(el){
  var body=el.querySelector('.lan-scan-body');
  if(!body)return;
  var dot=el.querySelector('.lan-scan-dot');
  if(dot)dot.style.background='var(--accent)';
  fetch('/api/arp').then(function(r){return r.json();}).then(function(d){
    if(dot){dot.style.background='';}
    var now=Date.now(),ts=new Date();
    var timeStr=String(ts.getHours()).padStart(2,'0')+':'+String(ts.getMinutes()).padStart(2,'0')+':'+String(ts.getSeconds()).padStart(2,'0');
    var countEl=el.querySelector('.lan-scan-count');
    if(countEl)countEl.textContent=d.count+' hosts';
    // Load last 3 scans from localStorage to compare for new devices
    var histKey='wartab_lan_history';
    var history=[];
    try{history=JSON.parse(localStorage.getItem(histKey)||'[]');}catch(e){}
    if(!Array.isArray(history))history=[];
    // Collect all MACs seen in the last 3 scans
    var seenInLast3={};
    history.forEach(function(h){(h.macs||[]).forEach(function(m){seenInLast3[m]=true;});});
    var html='';
    var currentMacs=[];
    html+='<div class="lan-scan-line lan-scan-ts">['+timeStr+'] scan '+((history.length||0)+1)+' \u2014 '+d.count+' device'+(d.count!==1?'s':'')+' on network</div>';
    (d.devices||[]).forEach(function(dev){
      currentMacs.push(dev.mac);
      var isNew=!seenInLast3[dev.mac];
      var cls=isNew?'lan-scan-new':'lan-scan-line';
      var tag=isNew?' \u25c2 NEW':'';
      var hn = dev.hostname ? ' <span class="lan-scan-hostname">' + escHtml(dev.hostname) + '</span>' : '';
      html+='<div class="'+cls+'">['+timeStr+'] <span class="lan-scan-ip">'+dev.ip+'</span> \u2192 '+dev.mac+'  <span class="lan-scan-vendor">'+escHtml(dev.vendor)+'</span>'+hn+tag+'</div>';
    });
    // Push this scan into history, keep last 3
    history.push({macs:currentMacs,ts:now});
    if(history.length>3)history=history.slice(-3);
    try{localStorage.setItem(histKey,JSON.stringify(history));}catch(e){}
    body.innerHTML=html;
    var iv=parseInt(el.dataset.refresh)*1000;
    if(iv>0)setTimeout(function(){fetchLanScan(el);},iv);
  }).catch(function(e){
    if(dot){dot.style.background='';}
    body.innerHTML='<div class="lan-scan-line lan-scan-err">[ --:--:-- ] error: '+escHtml(e.message)+'</div>';
    var iv=parseInt(el.dataset.refresh)*1000;
    if(iv>0)setTimeout(function(){fetchLanScan(el);},iv);
  });
}


function bumpVersion(){
  const p=WARTAB_VERSION.split('.');
  p[p.length-1]=String(parseInt(p[p.length-1])+1);
  WARTAB_VERSION = p.join('.');
  const ft=$('#footer-text');
  if(ft)ft.textContent='WarTab v'+WARTAB_VERSION;
  return WARTAB_VERSION;
}

/* ── Edit Panel ── */
let _editingCardId = null, _editPanelOpen = false;

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
  // Slide panel from the side LEAST likely to cover the card
  const panel = $('#edit-panel');
  if (cardEl) {
    const cr = cardEl.getBoundingClientRect();
    const vw = window.innerWidth;
    // If card center is right-of-center → slide from left; otherwise from right
    if (cr.left + cr.width / 2 > vw / 2) {
      panel.classList.add('slide-left');
    } else {
      panel.classList.remove('slide-left');
    }
  } else {
    panel.classList.remove('slide-left');
  }
  $('#edit-panel-overlay').classList.add('open');
  panel.classList.add('open');
  document.body.classList.add('panel-open');
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
  $('#edit-panel').classList.remove('slide-left');
  updateBlurState();
}

function saveAndRefresh() {
  saveConfig();
  if (_editingCardId) {
    renderAll();
    if (config.cards.find(c => c.id === _editingCardId)) {
      openCardEditPanel(_editingCardId);
    }
  } else if (_editingPageId) {
    renderAll();
    renderPageNav();
  } else {
    renderAll();
  }
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
}

/* ── Edit Panel Form Helpers ── */
function cpLabel(text) {
  const l = document.createElement('label');
  l.className = 'cp-label';
  l.textContent = text;
  return l;
}

function cpInput(placeholder, value, onChange) {
  const i = document.createElement('input');
  i.className = 'cp-input';
  i.type = 'text';
  i.placeholder = placeholder || '';
  i.value = value || '';
  if (onChange) i.addEventListener('change', () => onChange(i.value));
  return i;
}

function cpSelect(options, value, onChange) {
  const s = document.createElement('select');
  s.className = 'cp-select';
  (options || []).forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === value) opt.selected = true;
    s.appendChild(opt);
  });
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

function cpCheck(label, checked, onChange) {
  const w = document.createElement('label');
  w.className = 'cp-check';
  const c = document.createElement('input');
  c.type = 'checkbox';
  c.checked = !!checked;
  c.addEventListener('change', () => onChange(c.checked));
  w.appendChild(c);
  w.appendChild(document.createTextNode(label));
  return w;
}

function cpRange(label, value, min, max, onChange, step) {
  const g = document.createElement('div');
  g.className = 'cp-range';
  g.appendChild(cpLabel(label));
  const row = document.createElement('div');
  row.className = 'cp-range-row';
  const r = document.createElement('input');
  r.type = 'range'; r.min = min; r.max = max; r.value = value; if(step!==undefined) r.step = step;
  const s = document.createElement('span');
  s.className = 'cp-range-val';
  s.textContent = value;
  r.addEventListener('input', () => { s.textContent = r.value; });
  const doChange = () => { onChange(r.value); s.textContent = r.value; };
  r.addEventListener('pointerup', doChange);
  r.addEventListener('keyup', e => { if (e.key === 'Enter') doChange(); });
  row.appendChild(r); row.appendChild(s);
  g.appendChild(row);
  return g;
}

function cpHint(text) {
  const d = document.createElement('div');
  d.className = 'cp-hint';
  d.textContent = text;
  return d;
}

function cpDivider(text) {
  const d = document.createElement('div');
  d.className = 'cp-divider';
  d.textContent = text;
  return d;
}

function cpBtn(text, danger) {
  const b = document.createElement('button');
  b.className = 'btn btn-glass btn-sm' + (danger ? ' btn-danger' : '');
  b.textContent = text;
  if (danger) b.title = text;
  return b;
}

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
      saveAndRefresh();
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
  cp.addEventListener('input', () => syncColor(cp.value));
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
    saveAndRefresh();
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
    saveAndRefresh();
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
    saveAndRefresh();
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
      saveAndRefresh();
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

function moveSection(cid, si, dir) {
  const c = config.cards.find(x => x.id === cid);
  if (!c) return;
  const t = si + dir, secs = c.sections;
  if (t < 0 || t >= secs.length) return;
  [secs[si], secs[t]] = [secs[t], secs[si]];
  saveAndRefresh();
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
    _insertAfter: null,
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
            saveConfig();
            renderAll();
            openCardEditPanel(cardId);
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
const DEFAULT_CONFIG = {
  version: WARTAB_VERSION,

  /* ── Page branding (title + favicon-style icon) ── */
  branding: { title: 'WarTab', icon: 'sword' },

  /* ── Theme settings ── */
  theme: {
    bgType: 'gradient',           // 'color' | 'gradient' | 'image'
    bgValue: '#0a0a0a, #1a1a1a, #0d0d0d',  // CSS value: color, gradient(), or image path
    bgBlur: 0,                    // blur on background image (0-20px, only when bgType=image)
    bgDim: 0,                     // darkness overlay 0-100 (only when bgType=image)
    blur: 20,                     // backdrop-filter blur amount (px)
    glow: '#888888',              // accent color (grayscale)
    fontSizeText: 14,              // body text size in px (slider: 10-28)
    fontSizeHeading: 16,           // heading/card title size in px (slider: 10-28)
    fontFamily: 'Inter',          // Google Font name (or system font)
    cardBg: 'dark',               // card background variant
    fontColor: '#cccccc',         // text color override
    cardOpacity: 1,               // 0-1 opacity for card backgrounds
    bgRotate: false,              // rotate background on interval
    animations: true,             // enable CSS transitions/animations
    showAccentBar: true,          // show 3px accent bar at top of cards
  },

  /* ── Top-bar status display (CPU, RAM, disk, uptime) ── */
  statusBar: {
    enabled: true,
    source: 'local',              // 'local' | 'glances' | 'custom'
    glancesUrl: 'http://localhost:61209',
    customUrl: '',
    refreshInterval: 15,          // seconds
    items: ['cpu', 'memory', 'disk', 'uptime'],  // order/selection of stats
    hostname: true,
  },

  /* ── Grid layout ── */
  layout: {
    cols: 4,                      // number of grid columns
    gap: 16,                      // gap between cards (px)
    pageWidth: 100,               // page width as percentage (slider: 50-100)
    pagePadding: 2,               // top/bottom padding as % of container width (slider: 0-15)
    pageWidthPadding: 2,          // left/right padding as % of container width (slider: 0-15)
  },

  /* ── Search widget settings ── */
  search: {
    engine: 'https://www.google.com/search?q=',
    engines: {
      Google: 'https://www.google.com/search?q=',
      DuckDuckGo: 'https://duckduckgo.com/?q=',
      Brave: 'https://search.brave.com/search?q=',
      Bing: 'https://www.bing.com/search?q=',
      YouTube: 'https://www.youtube.com/results?search_query=',
      Reddit: 'https://www.reddit.com/search/?q=',
      Wikipedia: 'https://en.wikipedia.org/w/index.php?search=',
    },
    selected: 'Google',
    openInNewTab: true,
  },

  /* ── Cards (each card is a dashboard panel with sections) ── */
  cards: [
    {
      id: 'search-card', title: 'Quick Search', icon: 'search',
      color: '#999999', width: 2,
      sections: [
        { id: 'search-main', type: 'search', engine: 'Google',
          placeholder: 'Search anything...', label: 'Web Search' },
      ],
    },
    {
      id: 'clock-card', title: 'Time & Date', icon: 'clock',
      color: '#aaaaaa', width: 1,
      sections: [
        { id: 'clock-main', type: 'clock', format24h: false, showDate: true },
      ],
    },
    {
      id: 'daily-drivers', title: 'Daily Drivers', icon: 'globe',
      color: '#cccccc', width: 2,
      sections: [
        {
          id: 'dev-links', type: 'links', label: 'Development',
          links: [
            { label: 'GitHub', url: 'https://github.com', icon: '/icons/github.svg' },
            { label: 'GitLab', url: 'https://gitlab.com', icon: '/icons/gitlab.svg' },
            { label: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'help-circle' },
            { label: 'npm', url: 'https://www.npmjs.com', icon: 'package' },
            { label: 'PyPI', url: 'https://pypi.org', icon: 'code-2' },
          ],
        },
        {
          id: 'media-links', type: 'links', label: 'Media & Social',
          links: [
            { label: 'Reddit', url: 'https://reddit.com', icon: '/icons/reddit.svg' },
            { label: 'YouTube', url: 'https://youtube.com', icon: '/icons/youtube.svg' },
            { label: 'Twitch', url: 'https://twitch.tv', icon: '/icons/twitch.svg' },
            { label: 'X', url: 'https://x.com', icon: 'x' },
          ],
        },
      ],
    },
    {
      id: 'selfhosted', title: 'Self-Hosted', icon: 'monitor',
      color: '#777777', width: 2,
      sections: [
        {
          id: 'sh-services', type: 'links', label: 'Services',
          links: [
            { label: 'Home Assistant', url: 'http://homeassistant.local:8123', icon: '/icons/home-assistant.svg' },
            { label: 'Jellyfin', url: 'http://jellyfin.local:8096', icon: '/icons/jellyfin.svg' },
            { label: 'Pi-hole', url: 'http://pi.hole/admin', icon: '/icons/pi-hole.svg' },
            { label: 'Grafana', url: 'http://grafana.local:3000', icon: '/icons/grafana.svg' },
            { label: 'Portainer', url: 'http://portainer.local:9000', icon: '/icons/portainer.svg' },
            { label: 'Vaultwarden', url: 'http://vault.local:8080', icon: '/icons/vaultwarden.svg' },
          ],
        },
      ],
    },
    {
      id: 'dev-docs', title: 'Dev Docs', icon: 'book-open',
      color: '#8a8a8a', width: 1,
      sections: [
        {
          id: 'docs-links', type: 'link-list', label: 'References',
          links: [
            { label: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: 'globe' },
            { label: 'Python Docs', url: 'https://docs.python.org/3/', icon: 'book' },
            { label: 'Docker Docs', url: 'https://docs.docker.com', icon: '/icons/docker.svg' },
            { label: 'Arch Wiki', url: 'https://wiki.archlinux.org', icon: 'book' },
          ],
        },
      ],
    },
    {
      id: 'notes-card', title: 'Quick Notes', icon: 'edit-3',
      color: '#bbbbbb', width: 1,
      sections: [
        {
          id: 'notes-main', type: 'notes', label: 'Notes',
          content: '• WarTab is running!\n• Click ✎ on any card to edit it inline.\n• Drag ⠿ to reorder cards.',
        },
      ],
    },
    {
      id: 'demo-api', title: 'GitHub Stars', icon: 'github',
      color: '#9a9a9a', width: 1,
      sections: [
        {
          id: 'api-demo', type: 'api-poller', label: 'WarTab Stars',
          url: 'https://api.github.com/repos/nousresearch/wartab',
          fields: [{label:'Stars',path:'stargazers_count'},{label:'Forks',path:'forks_count'},{label:'Issues',path:'open_issues_count'}],
          refreshInterval: 120,
        },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════
   SECTION 4: ICON DATA
   Icon repository (service icons from selfhst/icons),
   emoji list, Lucide icon name list, and emoji→Lucide migration map.
   ═══════════════════════════════════════════ */
const ICON_CDN = '/icons';
const ICON_REPO = [];
// Load service icons from selfhst index (complete, accurate filenames)
function loadIconRepo() {
  if (ICON_REPO.length > 0) return;
  storage.getIconIndex().then(function(data){
    data.forEach(function(item){
      if (item.SVG === 'Yes') {
        ICON_REPO.push({name: item.Name, file: item.Reference, tags: [item.Category || '']});
      }
    });
    // Also re-render if picker is open
    var picker = document.getElementById('icon-picker-content');
    if (picker && picker.parentElement.classList.contains('open')) {
      var activeTab = document.querySelector('.ip-tab.active');
      if (activeTab && activeTab.dataset.tab === 'library') buildLibraryTab(picker);
    }
  }).catch(function(e){
    console.error('loadIconRepo failed:', e);
    // Flag for re-render of library tab if open
    var picker = document.getElementById('icon-picker-content');
    if (picker && picker.parentElement.classList.contains('open')) {
      picker.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">Failed to load service icons. Check server connection.</div>';
    }
  });
}
const EMOJIS = ['🔍','🕐','🌐','🖥️','📖','📝','🏠','🎬','🛡️','📊','🐳','🔐','🐙','🦊','📚','📦','🐍','💬','▶️','🎮','🐦','🌍','⚛️','📘','⚔️','⚙️','🔄','✕','🔗','🌟','🔥','💡','🚀','⚡','🎯','🧩','🎨','📡','🔧','🗄️','💾','🖨️','📷','🎥','🎵','🎙️','📻','📺','💻','⌨️','🖱️','📱','💽','💿','📀','🔌','🔋','💎','🧊','⛅','☀️','🌙','⭐','✨','💫','🎆','🌈','☁️','🌊','🔥','🍃','🌱','🌿','☘️','🍀','🏆','🥇','🥈','🥉','🏅','🎖️','🏁','🚩','🎌','📌','📍','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎸','🎺','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🎰','🎲','🧩','♠️','♥️','♦️','♣️'];
const LUCIDE_ICONS = ['search', 'clock', 'globe', 'monitor', 'book-open', 'edit-3', 'sword', 'home', 'film', 'shield', 'bar-chart-3', 'container', 'lock', 'github', 'gitlab', 'package', 'code-2', 'message-circle', 'play', 'gamepad-2', 'twitter', 'book', 'settings', 'plus', 'x', 'link', 'star', 'zap', 'flag', 'compass', 'map-pin', 'server', 'database', 'external-link', 'mail', 'music', 'image', 'cpu', 'hard-drive', 'activity', 'wifi', 'radio', 'smartphone', 'tablet', 'laptop', 'watch', 'camera', 'video', 'headphones', 'volume-2', 'monitor-speaker', 'tv', 'layers', 'grid', 'list', 'columns', 'layout', 'panel-top', 'panel-bottom', 'panel-left', 'panel-right', 'square', 'circle', 'triangle', 'hexagon', 'diamond', 'box', 'archive', 'folder', 'file', 'file-text', 'clipboard', 'check-square', 'check', 'x-square', 'trash-2', 'refresh-cw', 'rotate-cw', 'rotate-ccw', 'download', 'upload', 'cloud', 'cloud-drizzle', 'cloud-snow', 'cloud-lightning', 'sun', 'moon', 'thermometer', 'wind', 'droplets', 'umbrella', 'user', 'users', 'user-plus', 'user-check', 'user-x', 'bell', 'bell-ring', 'bell-off', 'eye', 'eye-off', 'lock', 'unlock', 'key', 'fingerprint', 'shield-off', 'alert-triangle', 'alert-circle', 'alert-octagon', 'info', 'help-circle', 'thumbs-up', 'thumbs-down', 'smile', 'frown', 'meh', 'heart', 'calendar', 'calendar-check', 'calendar-x', 'alarm-clock', 'timer', 'hourglass', 'stopwatch', 'map', 'navigation', 'navigation-2', 'crosshair', 'target', 'locate', 'send', 'inbox', 'mail', 'mail-open', 'at-sign', 'phone', 'message-square', 'message-text', 'chat', 'printer', 'scanner', 'bluetooth', 'battery', 'battery-charging', 'power', 'plug', 'bookmark', 'tag', 'award', 'trending-up', 'trending-down', 'pie-chart', 'sliders', 'filter', 'tool', 'wrench', 'hammer', 'paintbrush', 'palette', 'pen-tool', 'eraser', 'scissors', 'copy', 'paste', 'undo', 'redo', 'bold', 'italic', 'underline', 'type', 'hash', 'percent', 'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right', 'chevrons-up', 'chevrons-down', 'chevrons-left', 'chevrons-right', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up-right', 'arrow-down-left', 'external-link', 'maximize', 'minimize', 'expand', 'shrink', 'fullscreen', 'dock', 'sidebar', 'menu', 'more-horizontal', 'more-vertical', 'chrome', 'codepen', 'figma', 'slack', 'trello', 'youtube'];

// Detect if a string is a Lucide icon name (not URL, not emoji)
// Emoji → Lucide name migration map for existing configs
const EMOJI_TO_LUCIDE={
'🔍':'search','🕐':'clock','🌐':'globe','🖥️':'monitor','📖':'book-open',
'📝':'edit-3','📦':'package','🏠':'home','🎬':'film','🛡️':'shield',
'📊':'bar-chart-3','🐳':'container','🔐':'lock','🐙':'github','🦊':'gitlab',
'📚':'book','🐍':'code-2','💬':'message-circle','▶️':'play','🎮':'gamepad-2',
'🐦':'x','🌍':'globe','⚛️':'atom','📘':'book','⚔️':'sword','🔗':'link',
'⚙️':'settings','🌟':'star','🔥':'flame','💡':'lightbulb','🚀':'rocket',
'⚡':'zap','🎯':'target','🧩':'puzzle','🎨':'palette','📡':'satellite',
'🔧':'wrench','🗄️':'server','💾':'save','🖨️':'printer','📷':'camera',
'🎥':'video','🎵':'music','🎙️':'mic','📻':'radio','📺':'tv','💻':'laptop',
'⌨️':'keyboard','🖱️':'mouse','📱':'smartphone','💽':'disc','💿':'disc',
'📀':'disc','🔌':'plug','🔋':'battery','💎':'diamond','🧊':'snowflake',
'⛅':'cloud-sun','☀️':'sun','🌙':'moon','⭐':'star','✨':'sparkles',
'💫':'star','🎆':'sparkles','🌈':'rainbow','☁️':'cloud','🌊':'waves',
'🔥':'flame','🍃':'wind','🌱':'sprout','🌿':'sprout','☘️':'sprout',
'🍀':'sprout','🏆':'trophy','🥇':'award','🥈':'award','🥉':'award',
'🏅':'award','🎖️':'award','🏁':'flag','🚩':'flag','🎌':'flag',
'📌':'pin','📍':'map-pin','🎪':'tent','🎭':'theater','🎬':'film',
'🎤':'mic','🎧':'headphones','🎼':'music','🎹':'piano','🥁':'drum',
'🎷':'saxophone','🎸':'guitar','🎺':'trumpet','🎻':'violin','🎲':'dice',
'♟️':'chess','🎳':'bowling','🎮':'gamepad-2','🕹️':'joystick','🎰':'slot',
'🧩':'puzzle','♠️':'spade','♥️':'heart','♦️':'diamond','♣️':'club',
'✕':'x','🔄':'refresh-cw','🐍':'code-2'};
function migrateConfigEmojis(cfg){
  if(cfg.branding&&cfg.branding.icon&&EMOJI_TO_LUCIDE[cfg.branding.icon])cfg.branding.icon=EMOJI_TO_LUCIDE[cfg.branding.icon];if(cfg.branding&&cfg.branding.icon==='twitter')cfg.branding.icon='x';
  if(cfg.cards)cfg.cards.forEach(function(card){
    if(card.icon&&EMOJI_TO_LUCIDE[card.icon])card.icon=EMOJI_TO_LUCIDE[card.icon];if(card.icon==='twitter')card.icon='x';
    if(card.sections)card.sections.forEach(function(sec){
      if(sec.links)sec.links.forEach(function(link){
        if(link.icon&&EMOJI_TO_LUCIDE[link.icon])link.icon=EMOJI_TO_LUCIDE[link.icon];if(link.icon==='twitter')link.icon='x';
      });
    });
  });
  return cfg;
}

/* ═══════════════════════════════════════════
   SECTION 5: UTILITIES
   Helper functions for the entire app.
   ═══════════════════════════════════════════ */
function isLucideName(s){if(!s||typeof s!=='string')return false;if(s.startsWith('http')||s.startsWith('data:')||s.startsWith('/'))return false;if(typeof lucide!=='undefined'&&lucide.icons){var p=s.split('-').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join('');return p in lucide.icons;}return LUCIDE_ICONS.includes(s);}
// Render a Lucide icon element (data-lucide attribute for auto-replacement by lucide.createIcons())
function renderLucideEl(name,cls){var i=document.createElement('i');i.className=cls;i.setAttribute('data-lucide',name);return i;}

// Safe icon render — calls lucide.createIcons with console.warn suppression
function renderIcons(){
  if(typeof lucide==='undefined')return;
  var _lw=console.warn;console.warn=function(m){
    if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);
  };try{lucide.createIcons();}catch(e){}
  console.warn=_lw;
}

let config = {}, clockInterval = null, weatherIntervals = [], apiPollTimers = [], statsTimer = null;
let dragState = null, iconPickerCallback = null;
let uploadedFiles = [];
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function uid(){return Math.random().toString(36).substring(2,9)+Date.now().toString(36);}
function cloneObj(o){return JSON.parse(JSON.stringify(o));}
function toast(msg,type='info'){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;$('#toast-container').appendChild(el);setTimeout(()=>el.remove(),3000);}

/* ═══════════════════════════════════════════
   SECTION 6: CONFIG LOAD / SAVE
   NOTE: Config is currently stored in localStorage (browser-side).
   The server also has /api/config endpoints for potential server-side syncing.
   ═══════════════════════════════════════════ */
// Load config from localStorage, merging over DEFAULT_CONFIG
function toastWithUndo(msg,undoFn){const el=document.createElement('div');el.className='toast';el.style.cssText='display:flex;align-items:center;gap:10px;';const t=document.createElement('span');t.textContent=msg;const b=document.createElement('button');b.className='btn btn-glass btn-sm';b.textContent='Undo';b.style.fontWeight='700';b.addEventListener('click',()=>{undoFn();el.remove();toast('Restored');});el.appendChild(t);el.appendChild(b);$('#toast-container').appendChild(el);setTimeout(()=>{if(el.parentNode)el.remove();},6000);}

// Load config from server — called once on page init
async function loadConfig() {
  try {
    var parsed = await storage.getConfig();
    if (parsed && Object.keys(parsed).length > 0) {
      if (!parsed.version || parsed.version < '0.2.0') { migrateConfigEmojis(parsed); parsed.version = WARTAB_VERSION; }
      // Migrate old 'small'/'medium'/'large' string fontSize to numeric px
      if (typeof parsed.theme?.fontSizeText === 'string') parsed.theme.fontSizeText = ({small:13,medium:14,large:16})[parsed.theme.fontSizeText] || 14;
      if (typeof parsed.theme?.fontSizeHeading === 'string') parsed.theme.fontSizeHeading = ({small:14,medium:16,large:18})[parsed.theme.fontSizeHeading] || 16;
      // Migrate old string pageWidth/paddingHeight to numeric
      if (typeof parsed.layout?.pageWidth === 'string') parsed.layout.pageWidth = ({full:100,'three-quarters':75,half:50})[parsed.layout.pageWidth] || 100;
      if (typeof parsed.layout?.paddingHeight === 'string') parsed.layout.pagePadding = ({full:20,compact:120})[parsed.layout.paddingHeight] || 20;
      config = deepMerge(cloneObj(DEFAULT_CONFIG), parsed);
    } else {
      config = cloneObj(DEFAULT_CONFIG);
    }
  } catch (e) {
    console.error('loadConfig failed:', e);
    config = cloneObj(DEFAULT_CONFIG);
  }
}
// Save config to server — fire-and-forget POST
function saveConfig() {
  var cfg = cloneObj(config);
  try {
    storage.saveConfig(cfg).then(function(){}, function(err){
      console.error('saveConfig failed:', err);
      toast('Config save failed — check server', 'error');
    });
  } catch(e) {
    fetch('/api/config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(cfg), keepalive: true }).catch(function(err){
      console.error('saveConfig fallback failed:', err);
      toast('Config save failed — server unreachable', 'error');
    });
  }
}
// Deep-merge stored config over defaults (arrays replaced, objects recursed)
function deepMerge(t,s){const r=cloneObj(t);for(const k in s){if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k]))r[k]=deepMerge(r[k]||{},s[k]);else r[k]=s[k];}return r;}

/* ── Theme & Branding ── */
function applyTheme(){
  const t=config.theme,bg=$('#bg-canvas');
  switch(t.bgType){
    case'gradient':bg.style.background=`linear-gradient(135deg,${t.bgValue})`;break;
    case'solid':bg.style.background=t.bgValue.split(',')[0].trim();break;
    case'image':bg.style.background=`url(${t.bgValue.trim()}) center/cover no-repeat fixed`;break;
    default:bg.style.background=`linear-gradient(135deg,${DEFAULT_CONFIG.theme.bgValue})`;
  }
  const root=document.documentElement;
  root.style.setProperty('--bg-blur',t.blur+'px');
  // Background image blur + dim (only effective when bgType=image)
  root.style.setProperty('--bg-img-blur', (t.bgType==='image' ? (parseInt(t.bgBlur)||0) : 0) + 'px');
  root.style.setProperty('--bg-dim-opacity', (t.bgType==='image' ? Math.min(1, Math.max(0, (parseInt(t.bgDim)||0)/100)) : 0));
  root.style.setProperty('--accent',t.glow);
  root.style.setProperty('--accent-glow',hexToRgba(t.glow,0.3));
  root.style.setProperty('--accent-glass',hexToRgba(t.glow,0.12));

  // Font size — compute full scale as CSS variables from numeric px values
  const tSize = parseInt(t.fontSizeText) || 14;
  const hSize = parseInt(t.fontSizeHeading) || 16;
  root.style.fontSize = tSize + 'px';
  root.style.setProperty('--text-size', tSize + 'px');
  root.style.setProperty('--text-3xs', Math.max(8, tSize - 5) + 'px');
  root.style.setProperty('--text-2xs', Math.max(9, tSize - 4) + 'px');
  root.style.setProperty('--text-xs',  Math.max(10, tSize - 3) + 'px');
  root.style.setProperty('--text-sm',  Math.max(11, tSize - 2) + 'px');
  root.style.setProperty('--text-base', tSize + 'px');
  root.style.setProperty('--text-lg',  (tSize + 2) + 'px');
  root.style.setProperty('--text-xl',  (tSize + 8) + 'px');
  root.style.setProperty('--text-2xl', (tSize + 18) + 'px');
  root.style.setProperty('--text-3xl', (tSize + 26) + 'px');
  root.style.setProperty('--heading-size', hSize + 'px');
  const fn=t.fontFamily||'Inter';
  root.style.setProperty('--font',`'${fn}','Segoe UI',system-ui,-apple-system,sans-serif`);
  loadGoogleFont(fn,true);

  // Card background — black for dark, white for light, with accent tint
  const h=t.glow.replace('#','');
  const r=parseInt(h[0]+h[1],16),gr=parseInt(h[2]+h[3],16),b=parseInt(h[4]+h[5],16);
  const mode=t.cardBg||'dark';
  const op = t.cardOpacity !== undefined ? t.cardOpacity : 1;
  const base = mode === 'light' ? [255,255,255] : [0,0,0];
  const tint = mode === 'light' ? 0.18 : 0.06;
  // Dark: black + accent blend. Light: white + visible accent blend.
  root.style.setProperty('--card-bg',`rgba(${Math.round(base[0]*(1-tint)+r*tint)},${Math.round(base[1]*(1-tint)+gr*tint)},${Math.round(base[2]*(1-tint)+b*tint)},${op})`);
  root.style.setProperty('--card-bg-alt',`rgba(${r},${gr},${b},${mode==='light' ? 0.15 : 0.08})`);
  root.style.setProperty('--card-input-bg', mode === 'light'
    ? `rgba(0,0,0,${0.06 * op})`
    : `rgba(255,255,255,${0.15 * op})`);
  document.documentElement.dataset.cardBg=mode;

  // Font color from config
  const fc=t.fontColor||'#cccccc';
  root.style.setProperty('--text-primary',hexToRgba(fc,0.92));
  root.style.setProperty('--text-secondary',hexToRgba(fc,0.60));
  root.style.setProperty('--text-tertiary',hexToRgba(fc,0.35));

  // Branding
  const brand=$('#brand-text');
  if(brand){const b2=config.branding||DEFAULT_CONFIG.branding;var bi=b2.icon||'sword';brand.innerHTML=(isLucideName(bi)?'<span class="brand-icon"><i data-lucide="'+bi+'"></i></span>':'<span class="brand-icon emoji-icon">'+bi+'</span>')+'<span>'+escHtml(b2.title||'WarTab')+'</span>';}
  document.title=(config.branding||DEFAULT_CONFIG.branding).title||'WarTab';
  // Toggles
  document.documentElement.dataset.animations=config.theme.animations!==false?'on':'off';
  document.documentElement.dataset.accentBar=config.theme.showAccentBar!==false?'on':'off';
}
function hexToRgba(h,a){const c=h.replace('#','');return`rgba(${parseInt(c[0]+c[1],16)},${parseInt(c[2]+c[3],16)},${parseInt(c[4]+c[5],16)},${a})`;}
function loadGoogleFont(fn,allowReplace){
  if(fn==='Inter')return; // Inter loaded from local inter.css
  var id='wartab-font-'+fn.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
  if(document.getElementById(id))return;
  if(!allowReplace){
    var l=document.createElement('link');l.id=id;l.dataset.font=fn;l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family='+fn.replace(/ /g,'+')+':wght@200..700&display=swap';
    document.head.appendChild(l);
  }else{
    var oe=document.getElementById('wartab-font');
    if(oe&&oe.dataset.font===fn)return;
    if(oe)oe.remove();
    var l=document.createElement('link');l.id='wartab-font';l.dataset.font=fn;l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family='+fn.replace(/ /g,'+')+':wght@200..700&display=swap';
    document.head.appendChild(l);
  }
}
function escHtml(s){if(typeof s!=='string')return'';const d=document.createElement('div');d.textContent=s;var h=d.innerHTML;return h.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

/* ── Status Bar ── */
function initStatusBar(){renderStatusBar();clearInterval(statsTimer);const sb=config.statusBar;if(!sb||!sb.enabled)return;const ms=(sb.refreshInterval||15)*1000;statsTimer=setInterval(fetchStats,ms);fetchStats();}
function renderStatusBar(){const bar=$('#top-stats'),sb=config.statusBar;if(!sb||!sb.enabled){bar.classList.add('hidden');bar.innerHTML='';return;}bar.classList.remove('hidden');bar.innerHTML='<span class="stat-item"><span class="stat-icon">⚡</span><span class="stat-value" id="stat-loading">Connecting...</span></span>';}
function fetchStats(){const sb=config.statusBar;if(!sb||!sb.enabled)return;storage.getStats(sb.source,sb.glancesUrl).then(function(d){renderStats(d,sb);}).catch(function(){const el=$('#stat-loading');if(el)el.textContent='Stats offline';});}
// Build stat DOM elements from data and items array — shared by both top-bar and widget renderers
function buildStatItems(data, items){
  var parts=[];
  if(items.includes('hostname')&&data.hostname)parts.push(stItem('🖥️','',data.hostname,null));
  if(items.includes('cpu')){var p=typeof data.cpu==='number'?data.cpu:(data.cpu&&data.cpu.total)?data.cpu.total:0;parts.push(stItem('⚡','CPU',p+'%',p));}
  if(items.includes('memory')){var m=data.memory||{};parts.push(stItem('🧠','RAM',(m.percent||0)+'%',m.percent||0));}
  if(items.includes('disk')){var disks=data.disks||[],r=disks.find(function(d2){return d2.mount==='/'})||disks[0];if(r)parts.push(stItem('💾',r.mount,r.percent+'%',r.percent));}
  if(items.includes('uptime')){var u=data.uptime||{};parts.push(stItem('⏱️','Up',u.string||'--'));}
  return parts;
}
function renderStats(data,sb){const bar=$('#top-stats');bar.innerHTML='';var parts=buildStatItems(data,sb.items||[]);parts.forEach(function(el,i){if(i>0){var s=document.createElement('span');s.className='stat-sep';s.textContent='·';bar.appendChild(s);}bar.appendChild(el);});if(!parts.length)bar.innerHTML='<span class="stat-item"><span class="stat-value">No stats</span></span>';}
// Build a status bar stat element (icon + label + optional progress bar + value)
function stItem(icon,label,value,pct){const div=document.createElement('span');div.className='stat-item';div.innerHTML=`<span class="stat-icon">${icon}</span>`;if(label){const l=document.createElement('span');l.className='stat-label';l.textContent=label;div.appendChild(l);}if(pct!==null&&pct!==undefined){const b=document.createElement('span');b.className='stat-bar';const f=document.createElement('span');f.className='stat-bar-fill'+(pct>80?' high':pct>60?' mid':'');f.style.width=pct+'%';b.appendChild(f);div.appendChild(b);}const v=document.createElement('span');v.className='stat-value';v.textContent=value;div.appendChild(v);return div;}

/* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
// Full page re-render: destroys and rebuilds grid from config
function renderAll(){apiPollTimers.forEach(clearTimeout);apiPollTimers=[];weatherIntervals.forEach(clearInterval);weatherIntervals=[];const grid=$('#card-grid');// Cleanup old card modules before destroying DOM
var oldCards=grid.querySelectorAll('.card');oldCards.forEach(function(c){if(c._cleanup)c._cleanup();});grid.innerHTML='';grid.style.setProperty('--grid-cols',config.layout.cols);grid.style.gap=config.layout.gap+'px';var appEl=$('#app');if(appEl){
  // Page width: slider percentage (50-100), side padding only at full width
  appEl.style.maxWidth=(parseInt(config.layout.pageWidth)||100)+'%';
  const xPad=parseInt(config.layout.pageWidthPadding)||2;
  appEl.style.paddingLeft=xPad+'%';appEl.style.paddingRight=xPad+'%';
  // Top/bottom padding: slider (%)
  const yPad=parseInt(config.layout.pagePadding)||2;
  appEl.style.paddingTop=yPad+'%';appEl.style.paddingBottom=yPad+'%';
}const _scrollY=window.scrollY;
if(!config.cards.length){
  grid.innerHTML=`<div class="card" style="grid-column:1/-1;padding:0;"><div class="card-body" style="display:flex;flex-direction:column;align-items:center;padding:40px 24px;text-align:center;">
    <div style="font-size:var(--text-3xl);margin-bottom:12px;opacity:0.5;"><i data-lucide="layout" style="width:36px;height:36px;"></i></div>
    <div style="font-size:var(--heading-size);font-weight:600;margin-bottom:4px;color:var(--text-primary);">This page is empty</div>
    <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:20px;">Add your first card to get started</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
      <button class="btn btn-glass" id="empty-add-card"><i data-lucide="plus" style="width:14px;height:14px;"></i> Add Card</button>
      <button class="btn btn-glass" id="empty-add-clock"><i data-lucide="clock" style="width:14px;height:14px;"></i> Add Clock</button>
      <button class="btn btn-glass" id="empty-add-links"><i data-lucide="link" style="width:14px;height:14px;"></i> Add Links</button>
      <button class="btn btn-glass" id="empty-config"><i data-lucide="settings" style="width:14px;height:14px;"></i> Settings</button>
    </div>
  </div></div>`;
  setTimeout(()=>{
    const a=document.getElementById('empty-add-card');if(a)a.addEventListener('click',addNewCard);
    const b=document.getElementById('empty-add-clock');if(b)b.addEventListener('click',()=>{addNewCard();const c=config.cards[config.cards.length-1];if(c){c.title='Clock';c.icon='🕐';c.color='#aaaaaa';c.width=1;c.sections=[{id:'sec-'+uid(),type:'clock',format24h:false,showDate:true}];saveConfig();renderAll();}});
    const c=document.getElementById('empty-add-links');if(c)c.addEventListener('click',()=>{addNewCard();const c2=config.cards[config.cards.length-1];if(c2){c2.title='Links';c2.icon='🔗';c2.color='#999999';c2.width=2;c2.sections=[{id:'sec-'+uid(),type:'links',label:'Links',links:[{label:'Example',url:'https://example.com',icon:'link'}]}];saveConfig();renderAll();}});
    const d=document.getElementById('empty-config');if(d)d.addEventListener('click',toggleConfigPanel);
  },0);
  if(_scrollY)window.scrollTo(0,_scrollY);

  return;
}
// Ungrouped cards render as normal
config.cards.forEach((c,i)=>{grid.appendChild(renderCard(c,i));});
setupWeatherWidgets();setupClocks();const fs=grid.querySelector('.inline-search-wrap input');if(fs)fs.focus();if(_scrollY)requestAnimationFrame(()=>window.scrollTo(0,_scrollY));
  // Render Lucide icons for any newly created data-lucide elements
  renderIcons();
}
// Card heights handled by CSS grid-auto-rows + data-height presets


function renderCard(card,idx){
  if(card._isGap){
    const div=document.createElement('div');div.className='card grid-gap-card';div.dataset.cardId=card.id;
    div.dataset.width=Math.min(card.width||1,config.layout.cols);div.dataset.index=idx;
    div.style.gridColumn='span '+div.dataset.width;
    if(card.height>1)div.style.gridRow='span '+card.height;
    // Subtle boundary so the gap space is visible
    div.style.cssText+=';background:none!important;box-shadow:none!important;outline:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;min-width:0;display:block;position:relative;border:1px dashed rgba(255,255,255,0.12)!important;';
    if(card.minHeight){var sp=document.createElement('div');sp.style.cssText='min-height:'+card.minHeight+'px;pointer-events:none;';div.appendChild(sp);}
    div.style.setProperty('--card-accent','transparent');
    div.style.setProperty('--card-bg','transparent');
    // Header at same position as regular cards (top-right)
    const h=document.createElement('div');
    h.style.cssText='position:absolute;top:8px;right:8px;display:flex;align-items:center;gap:4px;opacity:0;transition:opacity 0.15s;z-index:2;';
    div.addEventListener('mouseenter',()=>h.style.opacity='1');
    div.addEventListener('mouseleave',()=>h.style.opacity='0');
    // Shadow behind controls on hover
    const shadow=document.createElement('div');
    shadow.style.cssText='position:absolute;top:4px;right:4px;width:50px;height:30px;border-radius:4px;background:rgba(0,0,0,0.4);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity 0.15s;z-index:1;pointer-events:none;';
    div.addEventListener('mouseenter',()=>shadow.style.opacity='1');
    div.addEventListener('mouseleave',()=>shadow.style.opacity='0');
    div.appendChild(shadow);
    const eb2=document.createElement('button');eb2.className='card-edit-btn';eb2.textContent='✎';eb2.title='Edit gap';
    eb2.addEventListener('click',e=>{e.stopPropagation();openCardEditPanel(card.id);});
    h.appendChild(eb2);
    const dh=document.createElement('span');dh.className='drag-handle';dh.textContent='⠿';dh.title='Drag';dh.style.touchAction='none';
    h.appendChild(dh);
    div.appendChild(h);
    dh.addEventListener('pointerdown',e=>startDrag(e,card.id,idx));
    div.addEventListener('dblclick',()=>{config.cards.splice(idx,1);saveConfig();renderAll();toast('Gap removed');});
    return div;
  }
  /* ── Regular card ── */
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.cardId = card.id;
  div.dataset.width = Math.min(card.width || 1, config.layout.cols);
  div.dataset.index = idx;
  div.style.setProperty('--card-accent', card.color || config.theme.glow);
  var ch=Math.min(card.height||1,4);
  if(ch>1){
    div.dataset.height=ch;
    div.style.gridRow='span '+ch;
  }
  if (card.transparent) div.classList.add('card-transparent');

  /* Header: title (icon + text) on the left, actions (edit + drag handle) on the right */
  const hdr = document.createElement('div');
  hdr.className = 'card-header';

  const title = document.createElement('div');
  title.className = 'card-title';
  var iconEl=renderIconElement(card.icon, 'card-icon');if(iconEl)title.appendChild(iconEl);
  title.appendChild(document.createTextNode(' ' + (card.title || '')));
  hdr.appendChild(title);

  const actionGroup = document.createElement('div');
  actionGroup.style.cssText = 'display:flex;align-items:center;gap:4px;';

  const editBtn = document.createElement('button');
  editBtn.className = 'card-edit-btn';
  editBtn.textContent = '✎';
  editBtn.title = 'Edit';
  editBtn.addEventListener('click', e => { e.stopPropagation(); openCardEditPanel(card.id); });
  actionGroup.appendChild(editBtn);

  const dragHandle = document.createElement('span');
  dragHandle.className = 'drag-handle';
  dragHandle.textContent = '⠿';
  dragHandle.title = 'Drag';
  dragHandle.style.touchAction = 'none';
  actionGroup.appendChild(dragHandle);

  hdr.appendChild(actionGroup);
  div.appendChild(hdr);

  /* Body: render each section */
  const body = document.createElement('div');
  body.className = 'card-body';
  (card.sections || []).forEach(section => {
    const el = renderSection(section, card);
    if (el) body.appendChild(el);
  });
  div.appendChild(body);

  dragHandle.addEventListener('pointerdown', function(e) { startDrag(e, card.id, idx); });
  return div;
}

/**
 * Render a card/section icon element. Supports three formats:
 *   1. Lucide icon name  → <i data-lucide="..."> (replaced with SVG at runtime)
 *   2. URL/image path    → <img> (with Lucide fallback on load error)
 *   3. Emoji string      → <span class="emoji-icon">
 * @param {string} icon   Icon identifier
 * @param {string} cls    CSS class for the element
 * @returns {HTMLElement}
 */
function renderIconElement(icon, cls) {
  if (!icon) return null;
  if (icon.startsWith('http') || icon.startsWith('data:') || icon.startsWith('/')) {
    // Reject file: protocol URLs
    if (icon.startsWith('file:')) return renderLucideEl('package', cls);
    const img = document.createElement('img');
    img.className = cls; img.src = icon; img.alt = '';
    img.onerror = function() {
      var fallback = renderLucideEl('package', cls);
      this.parentNode.replaceChild(fallback, this);
      renderIcons();
    };
    return img;
  }
  if (isLucideName(icon)) return renderLucideEl(icon, cls);
  const span = document.createElement('span');
  span.className = cls + ' emoji-icon';
  span.textContent = icon;
  return span;
}


function doSearch(query, section) {
  const s = (query || '').trim();
  if (!s) return;
  const engine = section.engine || config.search.selected || 'Google';
  const url = (config.search.engines[engine] || config.search.engines['Google']) + encodeURIComponent(s);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Render a card section (a content block within a card body).
 * Creates a section-title toggle (if labelled, non-clock) + content area with module render output.
 * @param {Object} section   The section config object
 * @param {Object} card      The parent card config
 * @returns {DocumentFragment}
 */
function renderSection(section, card) {
  const fragment = document.createDocumentFragment();

  /* ── Section title row (label + collapse toggle) ── */
  if (section.label && section.type !== 'clock') {
    const titleRow = document.createElement('button');
    titleRow.className = 'dropdown-toggle' + (section.collapsed ? '' : ' open');
    titleRow.dataset.secId = section.id;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = section.label;
    titleRow.appendChild(labelSpan);

    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '▶';
    titleRow.appendChild(arrow);

    titleRow.addEventListener('click', (e) => {
      e.stopPropagation();
      section.collapsed = !section.collapsed;
      titleRow.classList.toggle('open');
      var c = titleRow.nextElementSibling;
      while (c && !c.classList.contains('section-content') && !c.classList.contains('dropdown-content')) c = c.nextElementSibling;
      if (c) {
        if (section.collapsed) {
          // Collapse: remove open class (gets overflow:hidden, removes flex:1),
          // pin to current height, then animate max-height to 0 via CSS transition
          c.style.maxHeight = c.scrollHeight + 'px';
          c.offsetHeight;
          c.classList.remove('open');
          c.style.maxHeight = '';   // CSS max-height:0 now applies, transition fires
          clearTimeout(c._collapseTimer);
          c._collapseTimer = setTimeout(function() {
            c.style.maxHeight = '';
          }, 450);
          // Stop any running timers in this section
          var timers = c.querySelectorAll('[data-timer-id]');
          timers.forEach(function(t){if(t._timer){clearInterval(t._timer);}});
        } else {
          // Expand: add open class (overflow:visible), measure natural height, animate from 0 up
          c.classList.add('open');
          if(c._collapseTimer){clearTimeout(c._collapseTimer);c._collapseTimer=null;}
          c.style.maxHeight = '';
          var h2 = c.scrollHeight;
          c.style.maxHeight = '0px';
          c.offsetHeight;
          c.style.maxHeight = h2 + 'px';
        }
      }
      saveConfig();
    });

    fragment.appendChild(titleRow);
  }

  /* ── Content area ── */
  const contentWrap = document.createElement('div');
  contentWrap.className = 'dropdown-content' + (section.collapsed ? '' : ' open');

  const module = CARD_MODULES[section.type];
  if (module && module.render) {
    module.render(section, card, contentWrap);
  } else {
    contentWrap.textContent = 'Unknown type: ' + section.type;
  }
  fragment.appendChild(contentWrap);

  /* ── Divider (between sections) ── */
  const sectionList = card.sections || [];
  const isLast = sectionList.indexOf(section) === sectionList.length - 1;
  if (!isLast && section.type !== 'clock') {
    const divider = document.createElement('hr');
    divider.className = 'section-divider';
    fragment.appendChild(divider);
  }

  return fragment;
}

/**
 * Render a link icon for bookmark grid/list items. Supports same three formats
 * as renderIconElement: Lucide name, image URL, or emoji.
 * @param {string} icon   Icon identifier
 * @returns {HTMLElement}
 */
function renderLinkIcon(icon) {
  /* Image URL needs link-custom-icon class for object-fit sizing */
  if (icon && (icon.startsWith('http') || icon.startsWith('data:') || icon.startsWith('/'))) {
    if (icon.startsWith('file:')) return renderLinkIcon('');
    const img = document.createElement('img');
    img.className = 'link-custom-icon'; img.src = icon; img.alt = '';
    img.onerror = function() {
      var fallback = document.createElement('i');
      fallback.className = 'link-icon'; fallback.setAttribute('data-lucide', 'link');
      this.parentNode.replaceChild(fallback, this);
      renderIcons();  // render the fallback Lucide icon
    };
    return img;
  }
  return renderIconElement(icon, 'link-icon');
}
/**
 * Find a section by its ID across all cards.
 * @param {string} sectionId   The section.id to find
 * @returns {Array|number} [cardIndex, sectionIndex] or -1 if not found
 */
function findSection(sectionId) {
  for (let ci = 0; ci < config.cards.length; ci++) {
    const sections = config.cards[ci].sections || [];
    for (let si = 0; si < sections.length; si++) {
      if (sections[si].id === sectionId) return [ci, si];
    }
  }
  return -1;
}

function setupClocks(){if(clockInterval)clearInterval(clockInterval);if($$('.clock-widget').length===0){clockInterval=null;return;}updateClocks();clockInterval=setInterval(updateClocks,1000);}
function updateClocks(){$$('.clock-widget').forEach(el=>{const n=new Date(),f24=el.dataset.format24==='1',sd=el.dataset.showDate==='1';let h=n.getHours();const m=String(n.getMinutes()).padStart(2,'0');el.querySelector('.clock-time').textContent=f24?String(h).padStart(2,'0')+':'+m:(h%12||12)+':'+m+' '+(h>=12?'PM':'AM');if(sd)el.querySelector('.clock-date').textContent=n.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});if(el.dataset.showCalendar==='1'){const cal=el.querySelector('.calendar-widget');if(cal)renderCalendar(cal,n);}});}
function renderCalendar(el,date){const y=date.getFullYear(),m=date.getMonth();const fd=new Date(y,m,1).getDay();const ld=new Date(y,m+1,0).getDate();const mn=['January','February','March','April','May','June','July','August','September','October','November','December'];let h=`<div class="calendar-month">${mn[m]} ${y}</div><div class="calendar-grid">`;['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{h+=`<div class="calendar-day-header">${d}</div>`;});for(let i=0;i<fd;i++)h+='<div class="calendar-day other-month"></div>';const today=new Date();for(let d=1;d<=ld;d++){const is=y===today.getFullYear()&&m===today.getMonth()&&d===today.getDate();h+=`<div class="calendar-day${is?' today':''}">${d}</div>`;}h+='</div>';el.innerHTML=h;}
function setupWeatherWidgets(){weatherIntervals.forEach(clearInterval);weatherIntervals=[];$$('.weather-widget').forEach(fetchWeather);}
function fetchWeather(el){const k=el.dataset.apiKey,z=el.dataset.zip,c=el.dataset.country||'US';if(!k||!z){el.querySelector('.weather-detail').textContent='Set API key & zip code in config';return;}const ts=Date.now();fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(z)},${encodeURIComponent(c)}&units=${el.dataset.units}&appid=${k}`).then(r=>r.json()).then(d=>{if(d.cod!==200)throw Error(d.message);var iconEl=el.querySelector('.weather-icon');if(iconEl){var lname=wIcon(d.weather[0].id);iconEl.setAttribute('data-lucide',lname);}el.querySelector('.weather-temp').textContent=Math.round(d.main.temp)+'°';el.querySelector('.weather-detail').textContent=d.weather[0].description+' · '+d.main.humidity+'% humidity';var windEl=el.querySelector('.weather-wind-val');if(windEl){var ws=d.wind?d.wind.speed:0;windEl.textContent=ws+' '+(el.dataset.units==='imperial'?'mph':'m/s');}var tsEl=el.querySelector('.weather-ts');if(tsEl){tsEl.textContent='updated just now';tsEl.dataset.ts=String(ts);}el.dataset.lastOk=String(ts);
}).catch(e=>{el.querySelector('.weather-detail').textContent='⚠ '+e.message;var tsEl=el.querySelector('.weather-ts');if(tsEl){var lo=el.dataset.lastOk;tsEl.textContent=lo?'last ok: '+timeAgo(parseInt(lo)):'';tsEl.dataset.ts=lo||String(ts);}});var wi=parseInt(el.dataset.refresh)*1000;if(wi>0)weatherIntervals.push(setInterval(()=>fetchWeather(el),Math.max(5000,wi)));}
function wIcon(id){if(id<300)return'cloud-lightning';if(id<400)return'cloud-drizzle';if(id<600)return'cloud-rain';if(id<700)return'cloud-snow';if(id<800)return'cloud-fog';if(id===800)return'sun';return'cloud';}
function renderApiWidget(el){renderApiFetch(el);}
function renderApiFetch(el){
  const u=el.dataset.url,label=escHtml(el.dataset.label||'');
  if(!u){el.innerHTML='<div class="api-row"><span class="api-label">No API URL set</span></div>';return;}
  el.innerHTML='<div class="api-row"><span class="api-label">'+label+'</span><span class="api-value">Loading...</span></div><div class="api-ts">fetching...</div>';
  const ts=Date.now();
  fetch(u).then(function(r){if(!r.ok)throw Error(r.status+' '+r.statusText);return r.json();}).then(function(d){
    var fields=[];
    try{fields=JSON.parse(el.dataset.fields||'[]');}catch(e){}
    var html='';
    if(fields&&fields.length){
      fields.forEach(function(f){
        var v=f.path?getNested(d,f.path):'';
        var vs=v!==undefined&&v!==null?String(v):'\u2014';
        html+='<div class="api-row"><span class="api-label">'+escHtml(f.label)+'</span><span class="api-value">'+escHtml(vs)+'</span></div>';
      });
    } else {
      var jp=el.dataset.jsonPath;
      var v=jp?getNested(d,jp):JSON.stringify(d,null,2);
      html+='<div class="api-row"><span class="api-label">'+label+'</span><span class="api-value">'+escHtml(String(v))+'</span></div>';
    }
    html+='<div class="api-ts" data-ts="'+ts+'">updated just now</div>';
    el.innerHTML=html;
    el.dataset.lastOk=String(ts);
    var iv=parseInt(el.dataset.refresh)*1000;
    if(iv>0){apiPollTimers.push(setTimeout(function(){renderApiFetch(el);},iv));}
  }).catch(function(e){
    var lo=el.dataset.lastOk;
    el.innerHTML='<div class="api-row"><span class="api-label">'+label+'</span><span class="api-value api-error">'+escHtml(e.message)+'</span></div><div class="api-ts" data-ts="'+(lo||ts)+'">'+(lo?'last ok: '+timeAgo(parseInt(lo)):'')+'</div>';
    var iv=parseInt(el.dataset.refresh)*1000;
    if(iv>0){apiPollTimers.push(setTimeout(function(){renderApiFetch(el);},iv));}
  });
}
function timeAgo(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
function getNested(o,p){return p.split('.').reduce((a,pt)=>a&&a[pt],o);}

// Shrink link labels that overflow their container — keeps buttons single-line
function shrinkLabels(container) {
  setTimeout(function() {
    if (!container || !container.parentNode) return;
    container.querySelectorAll('.link-label').forEach(function(el) {
      if (el.scrollWidth > el.clientWidth) {
        var fs = parseInt(window.getComputedStyle(el).fontSize);
        while (el.scrollWidth > el.clientWidth && fs > 8) {
          el.style.fontSize = (--fs) + 'px';
        }
      }
    });
  }, 0);
}



const LOCAL_QUOTES=[
  {q:'The best way to predict the future is to invent it.',a:'Alan Kay'},
  {q:'Any sufficiently advanced technology is indistinguishable from magic.',a:'Arthur C. Clarke'},
  {q:'Simplicity is prerequisite for reliability.',a:'Edsger W. Dijkstra'},
  {q:'Talk is cheap. Show me the code.',a:'Linus Torvalds'},
  {q:'First, solve the problem. Then, write the code.',a:'John Johnson'},
  {q:'Debugging is twice as hard as writing the code in the first place.',a:'Brian Kernighan'},
  {q:'In theory, there is no difference between theory and practice.',a:'Jan L. A. van de Snepscheut'},
  {q:'The only way to go fast is to go well.',a:'Robert C. Martin'},
  {q:'Programs must be written for people to read, and only incidentally for machines to execute.',a:'Harold Abelson'},
  {q:'The function of good software is to make the complex appear to be simple.',a:'Grady Booch'},
  {q:'It works on my machine.',a:'Anonymous'},
  {q:'We build our computer systems the way we build our cities: over time, without a plan, on top of ruins.',a:'Ellen Ullman'},
  {q:'A good programmer is someone who always looks both ways before crossing a one-way street.',a:'Doug Linder'},
  {q:'Fix the cause, not the symptom.',a:'Steve Maguire'},
  {q:"The most damaging phrase in the language is 'We've always done it this way.'",a:'Grace Hopper'},
  {q:'Measuring programming progress by lines of code is like measuring aircraft building progress by weight.',a:'Bill Gates'},
  {q:'Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live.',a:'John Woods'},
  {q:'The trouble with computers is that they do what you tell them, not what you want.',a:'Danny Hillis'},
  {q:'Before software can be reusable it first has to be usable.',a:'Ralph Johnson'},
  {q:'Make it work, make it right, make it fast.',a:'Kent Beck'},
  {q:'Computers are fast; programmers keep it slow.',a:'Anonymous'},
];
function fetchQuote(el, sec) {
  var txt = el.querySelector('.quotes-content'),
      auth = el.querySelector('.quotes-author-name');
  if (!txt || !auth) return;
  var pool = sec.quotes || [];
  if (!pool.length) {
    txt.textContent = 'Add quotes in settings';
    auth.textContent = '';
    return;
  }
  if (typeof sec._qi !== 'number') sec._qi = -1;
  sec._qi = (sec._qi + 1) % pool.length;
  var pick = pool[sec._qi];
  txt.textContent = pick.q;
  auth.textContent = '— ' + pick.a;
}


// Fetch and render system stats for the status-bar card module
function fetchStatusWidget(el){
  var content=el.querySelector('.sw-content'),ts=el.querySelector('.sw-ts');
  if(!content)return;
  var src=el.dataset.source,items;
  try{items=JSON.parse(el.dataset.items||'[]');}catch(e){items=['cpu','memory','disk','uptime'];}
  function render(d){
    content.innerHTML='';var parts=buildStatItems(d,items);
    parts.forEach(function(el2,i){if(i>0){var sep=document.createElement('span');sep.className='stat-sep';sep.textContent='·';content.appendChild(sep);}content.appendChild(el2);});
    if(!parts.length)content.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-tertiary);">No stats</div>';
    if(ts){ts.textContent='updated';ts.dataset.ts=String(Date.now());}
  }
  var url;
  if(src==='local')url='/api/stats';
  else if(src==='glances')url=el.dataset.glancesUrl+'/api/4';
  else if(src==='custom'&&el.dataset.customUrl)url=el.dataset.customUrl;
  else{content.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-tertiary);">Configure source</div>';return;}
  content.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-tertiary);">Loading...</div>';
  fetch(url).then(function(r){if(!r.ok)throw Error(r.status);return r.json();}).then(function(d){render(d);}).catch(function(){content.innerHTML='<div style="font-size:var(--text-sm);color:#cc6666;">Stats offline</div>';});
}

/* ═══════════════════════════════════════════ DRAG & DROP ═══════════════════════════════════════════
   Pointer-based drag with floating ghost, grid-simulated live preview, and FLIP
   animation on ALL shifted cards at drop. Touch+mouse via Pointer Events API. */

// Simulate CSS Grid auto-placement (left-to-right, top-to-bottom, multi-row aware)
// Returns [{row,col}] for each card in same order as input array
function simGrid(cards, cols) {
  const occ = []; // occ[row][col] = true
  const out = [];
  for (const card of cards) {
    const w = Math.min(card.width || 1, cols);
    const h = card.height || 1;
    let placed = false;
    for (let row = 0; !placed && row < 100; row++) {
      if (!occ[row]) occ[row] = [];
      for (let col = 0; col <= cols - w && !placed; col++) {
        let free = true;
        for (let dr = 0; dr < h && free; dr++)
          for (let dc = 0; dc < w && free; dc++)
            if (occ[row + dr] && occ[row + dr][col + dc]) free = false;
        if (free) {
          for (let dr = 0; dr < h; dr++) {
            if (!occ[row + dr]) occ[row + dr] = [];
            for (let dc = 0; dc < w; dc++) occ[row + dr][col + dc] = true;
          }
          out.push({ row, col }); placed = true;
        }
      }
    }
    if (!placed) out.push({ row: 0, col: 0 });
  }
  return out;
}

/* ══════════ Link drag-reorder (within editor) ══════════ */
let _linkDrag = null;

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

  // Move ghost to cursor
  _linkDrag.ghost.style.cssText = `
    position:fixed; pointer-events:none; z-index:9999;
    left:${e.clientX + 10}px; top:${e.clientY - 16}px;
    display:flex; align-items:center; gap:6px;
    padding:8px 14px;
    background:var(--accent-glass);
    border:2px dashed var(--accent);
    backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
    font-size:var(--text-sm); font-weight:600;
    color:var(--accent); white-space:nowrap;
  `;

  // Remove previous indicators
  linkDropClear();

  // Find which row the cursor is over
  const rows = _linkDrag.srcRow.parentElement.querySelectorAll('.me-link-tr');
  let targetRow = null;
  let insertBefore = false;  // true = above, false = below

  for (const r of rows) {
    if (r === _linkDrag.srcRow) continue;
    const rect = r.getBoundingClientRect();
    if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
      targetRow = r;
      // Insert above if cursor is in upper half
      const midY = rect.top + rect.height / 2;
      insertBefore = e.clientY < midY;
      break;
    }
  }

  // If cursor is below the last row, target the last row as "below"
  if (!targetRow && rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    const rect = lastRow.getBoundingClientRect();
    if (e.clientY > rect.bottom) {
      targetRow = lastRow;
      insertBefore = false;
    } else if (e.clientY < rows[0].getBoundingClientRect().top) {
      targetRow = rows[0];
      insertBefore = true;
    }
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

  // Clean up
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
      // Adjust target index after removal
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

function startDrag(e, id, idx){
  if(e.button!==0)return;
  e.preventDefault();
  const card=config.cards.find(x=>x.id===id);
  if(!card)return;
  const grid=$('#card-grid');
  const srcEl=grid.querySelector(`[data-card-id="${id}"]`);
  if(!srcEl)return;
  srcEl.classList.add('dragging');

  const ghost=document.createElement('div');ghost.className='drag-ghost';
  ghost.style.display='none';
  const cw=Math.min(card.width||1,config.layout.cols);
  const ch=card.height||1;
  if(card._isGap){
    ghost.innerHTML='<div class="dgh-label">␣ empty gap</div>';
  }else{
    var iconHtml=card.icon?'<span class="ghost-icon">'+(isLucideName(card.icon)?'<i data-lucide="'+card.icon+'" style="width:16px;height:16px;"></i>':card.icon)+'</span>':'';
    ghost.innerHTML='<div class="dgh-label">'+iconHtml+'<span class="ghost-title">'+escHtml(card.title||'Card')+'</span></div>';
  }
  document.body.appendChild(ghost);

  // Insertion indicator bar
  const insertBar=document.createElement('div');
  insertBar.className='drag-insert-bar';
  insertBar.style.display='none';
  document.body.appendChild(insertBar);

  // Record cursor offset from card's left edge at grab time
  const srcRect=srcEl.getBoundingClientRect();
  dragState={cardId:id,srcEl,ghost,insertBar,active:false,_startX:e.clientX,_startY:e.clientY,_beforeCardId:null,
    _cardWidth:cw,_cardHeight:ch,_grabOffs:e.clientX-srcRect.left};
  document.addEventListener('pointermove',onDragMove);
  document.addEventListener('pointerup',onDragEnd);
  document.addEventListener('pointercancel',onDragEnd);
  document.body.style.overflow = 'hidden';
}

function pushClear(){
  $$('.card.push-preview').forEach(el=>{el.classList.remove('push-preview');el.style.transform='';});
}

// Group cards by DOM y-position to find rows. Pass excludeEl=null to include all.
function buildRowMap(grid, excludeEl) {
  const items=[...grid.children].filter(el=>el.classList.contains('card')&&el!==excludeEl);
  const rows=[];
  for(const el of items){
    const r=el.getBoundingClientRect();let found=false;
    for(const row of rows){if(Math.abs(row.top-r.top)<10){row.cards.push(el);row.right=Math.max(row.right,r.right);row.bottom=Math.max(row.bottom,r.bottom);found=true;break;}}
    if(!found)rows.push({top:r.top,bottom:r.bottom,cards:[el],right:r.right});
  }
  return rows;
}

function onDragMove(e){
  if(!dragState)return;
  if(!dragState.active){
    const dx=e.clientX-dragState._startX,dy=e.clientY-dragState._startY;
    if(dx*dx+dy*dy<64)return;
    dragState.active=true;
    if(dragState.ghost)dragState.ghost.style.display='';
    // On activation, also refine grab offset from the actual card position
    if(dragState.srcEl){
      const sr=dragState.srcEl.getBoundingClientRect();
      dragState._grabOffs=e.clientX-sr.left;
    }
  }
  if(!dragState.active)return;

  const grid=$('#card-grid'),ghost=dragState.ghost,dSrc=dragState.srcEl;
  if(!ghost||!grid)return;
  const gr=grid.getBoundingClientRect(),cols=config.layout.cols,gap=(config.layout.gap||16);
  const colW=(gr.width-(cols-1)*gap)/cols,step=colW+gap;
  const cw=dragState._cardWidth,ch=dragState._cardHeight;
  const grabOffs=dragState._grabOffs||colW*0.33;

  // Snap to column: preserve grab offset so cursor points to the same relative spot on the card
  // Use step (colW+gap) because column left-edges are step apart in the actual grid
  const relX=e.clientX-gr.left;
  let targetCol=Math.round((relX-grabOffs)/step);
  targetCol=Math.max(0,Math.min(cols-cw,targetCol));

  // Build row map (exclude dragged card for cursor/insertion detection)
  const rows=buildRowMap(grid,dSrc);
  let targetRow=null,rowIdx=0;
  for(let i=0;i<rows.length;i++){const row=rows[i];if(e.clientY>=row.top&&e.clientY<=row.bottom){targetRow=row;rowIdx=i;break;}}
  if(!targetRow&&rows.length){
    let best=0,bestD=Infinity;
    for(let i=0;i<rows.length;i++){const d=Math.abs(e.clientY-rows[i].top);if(d<bestD){bestD=d;best=i;}}
    targetRow=rows[best];rowIdx=best;
  }

  const ghostLeft=gr.left+targetCol*(colW+gap);
  const ghostW=cw*colW+(cw-1)*gap;
  const ghostTop=targetRow?targetRow.top:(e.clientY-30);
  const ghostH=targetRow?(targetRow.bottom-targetRow.top):60;

  // Find insertion point: first card whose LEFT EDGE is at or past the ghost's left edge
  let beforeCard=null;
  if(targetRow){
    for(const el of targetRow.cards){
      const r=el.getBoundingClientRect();
      if(r.left>=ghostLeft-5){beforeCard=el;break;}
    }
    // Past all cards in row — use next DOM sibling (next row's first card, or null → append)
    if(!beforeCard&&targetRow.cards.length){
      const ns=targetRow.cards[targetRow.cards.length-1].nextElementSibling;
      beforeCard=(ns&&ns.classList.contains('card'))?ns:null;
    }
  }
  dragState._beforeCardId=beforeCard?beforeCard.dataset.cardId:null;

  const ghostAccent=config.cards.find(c=>c.id===dragState.cardId);

  // Position ghost
  ghost.style.cssText=`
    position:fixed;pointer-events:none;z-index:999;
    left:${ghostLeft}px;top:${ghostTop}px;
    width:${ghostW-4}px;min-height:${ghostH-4}px;
    display:flex;align-items:center;justify-content:center;
    background:color-mix(in srgb, ${ghostAccent&&ghostAccent.color?ghostAccent.color:'var(--accent)'} 15%, transparent);
    border:2px dashed ${ghostAccent&&ghostAccent.color?ghostAccent.color:'var(--accent)'};
    backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
  `;

  // ── Insertion indicator + grid simulation preview ──
  // Vertical bar at the insertion point, height matching card's grid footprint
  insertBar.style.display='';
  let barLeft;
  if(beforeCard){
    const br=beforeCard.getBoundingClientRect();
    barLeft=br.left;
  }else if(targetRow&&targetRow.cards.length){
    const lastRect=targetRow.cards[targetRow.cards.length-1].getBoundingClientRect();
    barLeft=lastRect.right;
  }else{
    barLeft=gr.left;
  }
  insertBar.style.cssText='';
  insertBar.style.left=(barLeft-2)+'px';
  insertBar.style.top=targetRow?targetRow.top+'px':(e.clientY-30)+'px';
  insertBar.style.width='4px';
  const barH=Math.max((ch||1)*140, (targetRow?targetRow.bottom-targetRow.top:60));
  insertBar.style.height=barH+'px';
  insertBar.style.background='var(--accent)';
  insertBar.style.borderRadius='2px';
  // Compute which cards truly change position via grid simulation
  computeDropShift(dragState._beforeCardId);
}

function dropZoneClear(){$$('.card.drop-shift').forEach(el=>el.classList.remove('drop-shift'));}

// Simulate CSS Grid auto-placement for computing final layout positions.
function simulateGrid(cards, cols) {
  const occ = [];
  const out = [];
  for (const card of cards) {
    const w = Math.min(card.width || 1, cols);
    const h = card.height || 1;
    let placed = false;
    for (let row = 0; !placed && row < 100; row++) {
      if (!occ[row]) occ[row] = [];
      for (let col = 0; col <= cols - w && !placed; col++) {
        let free = true;
        for (let dr = 0; dr < h && free; dr++)
          for (let dc = 0; dc < w && free; dc++)
            if (occ[row + dr] && occ[row + dr][col + dc]) free = false;
        if (free) {
          for (let dr = 0; dr < h; dr++) {
            if (!occ[row + dr]) occ[row + dr] = [];
            for (let dc = 0; dc < w; dc++) occ[row + dr][col + dc] = true;
          }
          out.push({ row, col }); placed = true;
        }
      }
    }
    if (!placed) out.push({ row: 0, col: 0 });
  }
  return out;
}

// Compute which cards change position after the move using grid simulation.
function computeDropShift(targetBeforeCardId) {
  dropZoneClear();
  const allCards = config.cards;
  const dragId = dragState.cardId;
  const cols = config.layout.cols;
  const srcIdx = allCards.findIndex(c => c.id === dragId);
  if (srcIdx < 0) return;

  const newOrder = [...allCards];
  const [moved] = newOrder.splice(srcIdx, 1);
  const beforeIdx = targetBeforeCardId
    ? newOrder.findIndex(c => c.id === targetBeforeCardId)
    : newOrder.length;
  newOrder.splice(beforeIdx < 0 ? newOrder.length : beforeIdx, 0, moved);

  const oldPos = simulateGrid(allCards, cols);
  const newPos = simulateGrid(newOrder, cols);

  const grid = document.getElementById('card-grid');
  for (let i = 0; i < allCards.length; i++) {
    const c = allCards[i];
    if (c.id === dragId) continue;
    const oldP = oldPos[i];
    const newIdx = newOrder.findIndex(nc => nc.id === c.id);
    if (newIdx < 0) continue;
    const newP = newPos[newIdx];
    if (oldP.row !== newP.row || oldP.col !== newP.col) {
      const el = grid.querySelector(`[data-card-id="${c.id}"]`);
      if (el) el.classList.add('drop-shift');
    }
  }
}

function onDragEnd(e){
  document.removeEventListener('pointermove',onDragMove);
  document.removeEventListener('pointerup',onDragEnd);
  document.removeEventListener('pointercancel',onDragEnd);
  dropZoneClear();
  if(dragState.insertBar&&dragState.insertBar.parentNode)dragState.insertBar.remove();
  if(!dragState)return;
  const{cardId,srcEl,ghost,active,_beforeCardId}=dragState;
  if(ghost&&ghost.parentNode)ghost.remove();
  if(srcEl)srcEl.classList.remove('dragging');
  document.body.style.overflow = '';

  if(active){
    const grid=$('#card-grid');
    const cards=config.cards;
    const srcIdx=cards.findIndex(c=>c.id===cardId);
    if(srcIdx<0){renderAll();dragState=null;return;}
    let tgtIdx=-1;

    if(_beforeCardId){
      tgtIdx=cards.findIndex(c=>c.id===_beforeCardId);
    }else{
      // Append to end
      tgtIdx=cards.length;
    }

    if(tgtIdx>=0&&srcIdx!==tgtIdx){
      // FLIP ALL shifted cards — snapshot before DOM move
      const allCards=[...grid.children].filter(el=>el.classList.contains('card'));
      const snaps=allCards.map(el=>({el,first:el.getBoundingClientRect()}));

      if(_beforeCardId){
        const bdom=grid.querySelector(`[data-card-id="${_beforeCardId}"]`);
        if(bdom)grid.insertBefore(srcEl,bdom);
        else grid.appendChild(srcEl);
      }else{
        grid.appendChild(srcEl);
      }

      // Capture last positions (forces reflow)
      const flips=snaps.map(({el,first})=>{
        const last=el.getBoundingClientRect();
        return{el,dx:first.left-last.left,dy:first.top-last.top};
      });
      const moved=flips.filter(f=>f.dx||f.dy);

      if(moved.length){
        for(const{el,dx,dy}of moved){
          el.style.transition='none';
          el.style.transform=`translate(${dx}px,${dy}px)`;
        }
        requestAnimationFrame(()=>{
          for(const{el,dx,dy}of moved){
            if(dx||dy){
              el.style.transition='transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
              el.style.transform='translate(0,0)';
            }
          }
          setTimeout(()=>{
            for(const{el}of moved){
              el.style.transition='';el.style.transform='';
            }
          },450);
        });
      }

      const[m]=cards.splice(srcIdx,1);
      const insertAt=tgtIdx>(srcIdx)?tgtIdx-1:tgtIdx;
      cards.splice(insertAt,0,m);
      saveConfig();
      [...grid.children].filter(el=>el.classList.contains('card')).forEach((el,i)=>{el.dataset.index=i;});
      toast('Card moved');
      dragState=null;
      return;
    }
  }

  if(srcEl)srcEl.classList.remove('dragging');
  if(active)renderAll();
  dragState=null;
}

function addGap(){
  config.cards.push({id:'gap-'+uid(),title:'',icon:'',color:'transparent',width:1,height:1,_isGap:true});
  saveConfig();renderAll();toast('Gap added');
}
function removeGap(idx){
  config.cards.splice(idx,1);
  saveConfig();renderAll();
}

/* ═══════════════════════════════════════════ ICON PICKER ═══════════════════════════════════════════ */
let iconPickerOpen=false;
function openIconPicker(cb){iconPickerCallback=cb;iconPickerOpen=true;$('#icon-picker-overlay').classList.add('open');$('#icon-picker').classList.add('open');buildIconPicker('icons');}
function closeIconPicker(){iconPickerOpen=false;iconPickerCallback=null;$('#icon-picker-overlay').classList.remove('open');$('#icon-picker').classList.remove('open');}
function buildIconPicker(t){const c=$('#icon-picker-content');c.innerHTML='';$$('.ip-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t));if(t==='library')buildLibraryTab(c);else if(t==='upload')buildUploadTab(c);else if(t==='icons')buildIconsTab(c);else if(t==='url')buildUrlTab(c);}
function buildLibraryTab(c){const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search services...';c.appendChild(s);const g=document.createElement('div');g.className='icon-grid';c.appendChild(g);function ri(f){g.innerHTML='';const fl=(f||'').toLowerCase();if(!ICON_REPO.length){g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">Loading service icons...</div>';return;}const items=fl?ICON_REPO.filter(i=>i.name.toLowerCase().includes(fl)||i.file.toLowerCase().includes(fl)||i.tags.some(t=>t.includes(fl))):ICON_REPO;items.slice(0,120).forEach(item=>{const d=document.createElement('div');d.className='icon-grid-item';const img=document.createElement('img');img.src=`${ICON_CDN}/${item.file}.svg`;img.alt=item.name;img.loading='lazy';img.onerror=function(){this.parentElement.style.display='none';};const l=document.createElement('span');l.textContent=item.name;d.appendChild(img);d.appendChild(l);d.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${item.file}.svg`));g.appendChild(d);});if(!items.length)g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No icons found</div>';}s.addEventListener('input',()=>ri(s.value));ri('');}
function buildUploadTab(c){
  c.innerHTML='';
  // Upload zone
  const z=document.createElement('div');z.className='upload-zone';
  z.innerHTML='<div style="font-size:var(--text-3xl);">📁</div><p>Click to upload an icon (48×48 resized)</p>';c.appendChild(z);
  const fi=document.createElement('input');fi.type='file';
  fi.accept='image/png,image/svg+xml,image/webp,image/jpeg,image/gif';fi.style.display='none';
  fi.addEventListener('change',function(e){
    const file=e.target.files[0];if(!file)return;
    z.innerHTML='<div style="padding:20px;color:var(--text-secondary);">Uploading...</div>';
    storage.uploadIcon(file,file.name).then(function(result){
      if(result&&!result.error){
        selectIcon(result.url);
      }else{
        toast('Upload failed: '+(result&&result.error?result.error:'Unknown'),'error');
        buildUploadTab(c);
      }
    }).catch(function(err){
      toast('Upload error: '+err.message,'error');
      buildUploadTab(c);
    });
  });c.appendChild(fi);
  z.addEventListener('click',function(){fi.click();});
  // Gallery
  const gal=document.createElement('div');gal.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;';
  const loadGal=function(){
    gal.innerHTML='<div style="grid-column:1/-1;font-size:var(--text-xs);color:var(--text-tertiary);text-align:center;padding:12px;">Loading...</div>';
    storage.listIcons().then(function(icons){
      gal.innerHTML='';
      if(!icons||!icons.length){
        gal.innerHTML='<div style="grid-column:1/-1;font-size:var(--text-xs);color:var(--text-tertiary);text-align:center;padding:12px;">No uploaded icons yet.</div>';
        return;
      }
      icons.forEach(function(ic){
        const card=document.createElement('div');card.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border:1px solid var(--surface-border);cursor:pointer;background:rgba(0,0,0,0.1);position:relative;';
        const img=document.createElement('img');img.src=ic.url;img.style.cssText='width:48px;height:48px;object-fit:contain;display:block;';
        card.title=ic.name;
        card.addEventListener('click',function(){selectIcon(ic.url);});
        const del=document.createElement('button');del.textContent='✕';
        del.style.cssText='position:absolute;top:2px;right:2px;padding:0 3px;font-size:10px;background:rgba(0,0,0,0.6);border:1px solid var(--surface-border);color:var(--color-error);cursor:pointer;line-height:1.4;';
        del.addEventListener('click',function(e){e.stopPropagation();
          storage.deleteIcon(ic.url).then(function(){loadGal();toast('Icon deleted');}).catch(function(){toast('Delete failed','error');});
        });
        card.appendChild(img);card.appendChild(del);gal.appendChild(card);
      });
    }).catch(function(){gal.innerHTML='<div style="grid-column:1/-1;color:var(--text-tertiary);text-align:center;padding:12px;">Could not load icons.</div>';});
  };
  loadGal();
  c.appendChild(gal);
}
function buildIconsTab(c){
  const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search icons or emoji...';c.appendChild(s);
  const etab=document.createElement('div');etab.style.cssText='display:flex;gap:4px;margin-bottom:8px;';
  const btnSvg=document.createElement('button');btnSvg.className='btn btn-glass btn-sm';btnSvg.textContent='SVG Icons';btnSvg.style.cssText='flex:1;';
  const btnEmoji=document.createElement('button');btnEmoji.className='btn btn-glass btn-sm';btnEmoji.textContent='Emoji';btnEmoji.style.cssText='flex:1;';
  etab.appendChild(btnSvg);etab.appendChild(btnEmoji);c.appendChild(etab);
  const g=document.createElement('div');g.className='icon-grid';g.style.gridTemplateColumns='repeat(auto-fill,minmax(52px,1fr))';c.appendChild(g);
  var _mode='svg';
  // Get all available Lucide icon names from the loaded library (dynamic, always complete)
  function getAllLucideIcons(){
    if(typeof lucide!=='undefined'&&lucide.icons)return Object.keys(lucide.icons).sort();
    return LUCIDE_ICONS; // fallback
  }
  function ri(f){
    g.innerHTML='';const fl=(f||'').toLowerCase();
    if(_mode==='svg'){
      var allIcons=getAllLucideIcons();
      var items=fl?allIcons.filter(function(n){return n.toLowerCase().includes(fl);}):allIcons;
      if(!items.length){g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No icons found</div>';return;}
      // Batch-render icons in chunks for performance (keeps UI responsive with 600+ icons)
      var batchSize=80;
      var idx=0;
      function renderBatch(){
        var end=Math.min(idx+batchSize,items.length);
        for(;idx<end;idx++){
          var name=items[idx];
          var d=document.createElement('div');d.className='icon-grid-item';d.style.cssText='flex-direction:column;gap:2px;padding:6px 2px;';
          var i=document.createElement('i');i.setAttribute('data-lucide',name);i.style.cssText='width:20px;height:20px;';
          var l=document.createElement('span');l.style.cssText='font-size:var(--text-3xs);text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:52px;white-space:nowrap;';l.textContent=name;
          d.appendChild(i);d.appendChild(l);
          d.addEventListener('click',function(n){return function(){selectIcon(n);};}(name));g.appendChild(d);
        }
        if(idx<items.length)requestAnimationFrame(renderBatch);
        else setTimeout(renderIcons,50); // render icons after all batches done
      }
      requestAnimationFrame(renderBatch);
    }else{
      var items=fl?EMOJIS.filter(function(e){return e.includes(fl);}):EMOJIS;
      if(!items.length){g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No emoji found</div>';return;}
      items.forEach(function(emo){var d=document.createElement('div');d.className='icon-grid-item';d.innerHTML='<span class="ip-emoji">'+emo+'</span>';d.addEventListener('click',function(){selectIcon(emo);});g.appendChild(d);});
    }
  }
  function setMode(m){_mode=m;btnSvg.style.borderColor=m==='svg'?'var(--accent)':'var(--surface-border)';btnEmoji.style.borderColor=m==='emoji'?'var(--accent)':'var(--surface-border)';ri(s.value);}
  btnSvg.addEventListener('click',function(){setMode('svg');});btnEmoji.addEventListener('click',function(){setMode('emoji');});
  s.addEventListener('input',function(){ri(s.value);});setMode('svg');
}
function buildUrlTab(c){c.innerHTML=`<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:6px;">Enter a direct URL:</div><input class="icon-search-bar" id="icon-url-input" placeholder="https://example.com/icon.png"><button class="btn btn-glass btn-sm" id="icon-url-btn">Use</button><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:12px;" id="icon-url-examples"></div>`;const inp=$('#icon-url-input');['jellyfin','plex','homeassistant','portainer','pihole','grafana','sonarr','radarr'].forEach(n=>{const tag=document.createElement('button');tag.className='btn btn-glass btn-sm';tag.style.fontSize='10px';tag.textContent=n;tag.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${n}.png`));$('#icon-url-examples').appendChild(tag);});inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&inp.value.trim())selectIcon(inp.value.trim());});$('#icon-url-btn').addEventListener('click',()=>{if(inp.value.trim())selectIcon(inp.value.trim());});}
function selectIcon(u){if(iconPickerCallback)iconPickerCallback(u);closeIconPicker();}

/* ═══════════════════════════════════════════ BACKGROUND UPLOAD ═══════════════════════════════════════════ */
function openBgUpload() {
  toast('Processing image...');
  const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.style.display = 'none';
  fi.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      // Compress & resize via canvas
      const blob = await compressImage(file, 1920, 1080, 0.85);
      if (blob.size > 5 * 1024 * 1024) { toast('Image too large after compression', 'error'); return; }

      // Upload to server
      var blobFile = new File([blob], file.name, { type: file.type });
      const result = await storage.uploadFile(blobFile, file.name);
      if (result.error) { toast('Upload failed: ' + result.error, 'error'); return; }

      config.theme.bgType = 'image';
      config.theme.bgValue = result.url;
      applyChanges(); saveConfig();
      uploadedFiles.unshift(result);
      buildConfigPanel();
      toast('Background set (' + (result.width||'') + 'x' + (result.height||'') + ' @ ' + fmtSize(result.size) + ')');
    } catch(err) {
      toast('Upload error: ' + err.message, 'error');
    }
  });
  fi.click();
}

function compressImage(file, maxW, maxH, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      // Resize if needed
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => resolve(b), 'image/jpeg', quality);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

async function deleteUpload(url) {
  const name = url.split('/').pop();
  if (!name) return;
  try {
    const result = await storage.deleteFile(url);
    if (result && result.status === 'deleted') {
      uploadedFiles = uploadedFiles.filter(f => f.url !== url);
      toast('Deleted');
      // If this was the current background, reset
      if (config.theme.bgType === 'image' && config.theme.bgValue === url) {
        config.theme.bgType = 'gradient';
        config.theme.bgValue = DEFAULT_CONFIG.theme.bgValue;
        applyChanges(); saveConfig();
      }
      buildConfigPanel();
    } else {
      toast('Delete failed', 'error');
    }
  } catch(err) {
    toast('Delete error: ' + err.message, 'error');
  }
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(1) + 'MB';
}

async function fetchUploads() {
  try {
    uploadedFiles = await storage.listUploads();
  } catch(e) { /* server might not be available */ }
}

function openBgPicker() {
  const overlay = $('#bg-picker-overlay');
  const picker = $('#bg-picker');
  overlay.classList.add('open'); picker.classList.add('open');
  const content = $('#bg-picker-content'); content.innerHTML = '';

  if (!uploadedFiles.length) {
    content.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No uploaded backgrounds yet. Upload one from the config panel.</div>';
    $('#bg-picker-close').onclick = () => { overlay.classList.remove('open'); picker.classList.remove('open'); };
    overlay.onclick = () => { overlay.classList.remove('open'); picker.classList.remove('open'); };
    return;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr;gap:8px;';

  uploadedFiles.forEach(f => {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--surface-border);cursor:pointer;transition:all 0.1s;';
    card.innerHTML = `
      <img src="${f.url}" style="width:80px;height:45px;object-fit:cover;flex-shrink:0;" alt="">
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--text-sm);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(f.name)}</div>
        <div style="font-size:var(--text-2xs);color:var(--text-tertiary);">${fmtSize(f.size)}</div>
      </div>
      <button class="btn btn-glass btn-sm btn-danger" style="flex-shrink:0;" data-action="delete">Delete</button>
    `;
    // Click to set as background
    card.addEventListener('click', e => {
      if (e.target.dataset.action === 'delete') return;
      config.theme.bgType = 'image';
      config.theme.bgValue = f.url;
      applyChanges(); saveConfig();
      overlay.classList.remove('open'); picker.classList.remove('open');
      buildConfigPanel();
      toast('Background set');
    });
    // Delete button
    const delBtn = card.querySelector('[data-action="delete"]');
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteUpload(f.url).then(function(){openBgPicker();}).catch(function(){openBgPicker();});
    });
    grid.appendChild(card);
  });

  content.appendChild(grid);
  $('#bg-picker-close').onclick = () => { overlay.classList.remove('open'); picker.classList.remove('open'); };
  overlay.onclick = () => { overlay.classList.remove('open'); picker.classList.remove('open'); };
}

/* ═══════════════════════════════════════════ CONFIG PANEL ═══════════════════════════════════════════ */
let configPanelOpen=false;
function toggleConfigPanel(){configPanelOpen=!configPanelOpen;$('#config-overlay').classList.toggle('open',configPanelOpen);$('#config-panel').classList.toggle('open',configPanelOpen);updateBlurState();if(configPanelOpen){buildConfigPanel();renderIcons();}}
function buildConfigPanel(){const body=$('#config-body');body.innerHTML='';
  const brand=config.branding||{};
  // Update header title
  const ht=$('#config-header-title');
  if(ht)ht.innerHTML='<i data-lucide="Settings" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;"></i><span style="vertical-align:middle;">'+(brand.title||'WarTab')+' Config</span>';

  /* ── Page ── */
  body.appendChild(ps('Page'));
  const br=el('div','display:flex;gap:8px;align-items:flex-start;');
  const tg=el('div','flex:1;');tg.appendChild(el('label','display:block;font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:4px;','Page Title'));
  const ti=el('input','width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;');
  ti.type='text';ti.value=brand.title||'WarTab';
  ti.addEventListener('change',()=>{if(!config.branding)config.branding={};config.branding.title=ti.value;applyTheme();saveConfig();buildConfigPanel();});
  tg.appendChild(ti);br.appendChild(tg);

  const ig=el('div','flex-shrink:0;');ig.appendChild(el('label','display:block;font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:4px;','Icon'));
  const ir2=el('div','display:flex;gap:4px;align-items:center;');
  const ip=el('span','font-size:var(--text-xl);width:30px;height:34px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);');
  const bi=brand.icon||'sword';
  if(bi.startsWith('http')||bi.startsWith('data:')||bi.startsWith('/')){const img=document.createElement('img');img.src=bi;img.style.cssText='width:22px;height:22px;object-fit:contain;';ip.appendChild(img);}else if(isLucideName(bi)){var li=document.createElement('i');li.setAttribute('data-lucide',bi);li.style.cssText='width:22px;height:22px;';ip.appendChild(li);}else{ip.textContent=bi;ip.className+=' emoji-icon';}
  ir2.appendChild(ip);
  const ib=el('button','','Change');ib.className='btn btn-glass btn-sm';
  ib.addEventListener('click',()=>openIconPicker(url=>{if(!config.branding)config.branding={};config.branding.icon=url;applyTheme();saveConfig();buildConfigPanel();}));
  ir2.appendChild(ib);ig.appendChild(ir2);br.appendChild(ig);body.appendChild(br);

  /* ── Background ── */
  body.appendChild(ps('Background'));
  const bgType=config.theme.bgType;
  body.appendChild(pf('select','','Type',[{value:'gradient',label:'Gradient'},{value:'solid',label:'Solid'},{value:'image',label:'Image'}],bgType,v=>{config.theme.bgType=v;applyChanges();renderAll();buildConfigPanel();}));

  // Value field — color picker for solid, dual pickers for gradient, text for image
  if(bgType==='gradient'){
    const parts=config.theme.bgValue.split(',').map(s=>s.trim());
    const c1=parts[0]||'#0a0a0a';
    const c2=parts[1]||'#1a1a1a';
    const gr=el('div','margin-bottom:10px;');gr.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Gradient Colors'));
    const row=el('div','display:flex;gap:8px;align-items:center;');
    const p1=document.createElement('input');p1.type='color';p1.value=c1;p1.style.cssText='width:48px;height:34px;padding:2px;cursor:pointer;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);flex-shrink:0;';
    p1.addEventListener('input',()=>{config.theme.bgValue=p1.value+', '+p2.value;applyChanges();});
    row.appendChild(p1);
    const p2=document.createElement('input');p2.type='color';p2.value=c2;p2.style.cssText='width:48px;height:34px;padding:2px;cursor:pointer;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);flex-shrink:0;';
    p2.addEventListener('input',()=>{config.theme.bgValue=p1.value+', '+p2.value;applyChanges();});
    row.appendChild(p2);
    gr.appendChild(row);body.appendChild(gr);
  } else if(bgType==='solid'){
    const gr=el('div','margin-bottom:10px;');gr.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Color'));
    const p=document.createElement('input');p.type='color';p.value=config.theme.bgValue||'#0a0a0a';p.style.cssText='width:48px;height:34px;padding:2px;cursor:pointer;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);';
    p.addEventListener('input',()=>{config.theme.bgValue=p.value;applyChanges();});
    gr.appendChild(p);body.appendChild(gr);
  } else if(bgType==='image'){
    bgValueRow(body);
    // Background image controls — blur + dim
    body.appendChild(pf('range','','Image Blur (px)',null,parseInt(config.theme.bgBlur)||0,v=>{config.theme.bgBlur=parseInt(v);applyChanges();},{min:0,max:20}));
    body.appendChild(pf('range','','Image Dim (%)',null,parseInt(config.theme.bgDim)||0,v=>{config.theme.bgDim=parseInt(v);applyChanges();},{min:0,max:100}));
  }

  // Upload + Previous Images buttons
  const bgr=el('div','display:flex;gap:6px;flex-wrap:wrap;');
  const ub=el('button','','Upload Image');ub.className='btn btn-glass btn-sm';ub.addEventListener('click',()=>openBgUpload());bgr.appendChild(ub);
  if(uploadedFiles.length){const sb=el('button','','Previous Images ('+uploadedFiles.length+')');sb.className='btn btn-glass btn-sm';sb.addEventListener('click',()=>openBgPicker());bgr.appendChild(sb);}
  // Set URL button (always visible for image type)
  if(bgType==='image'){
    const setUrlBtn=el('button','','Set URL');setUrlBtn.className='btn btn-glass btn-sm';
    setUrlBtn.addEventListener('click',()=>{buildConfigPanel();});bgr.appendChild(setUrlBtn);
  } else {
    const setUrlBtn=el('button','','Set Image URL');setUrlBtn.className='btn btn-glass btn-sm';
    setUrlBtn.addEventListener('click',()=>{config.theme.bgType='image';applyChanges();saveConfig();buildConfigPanel();});
    bgr.appendChild(setUrlBtn);
  }
  body.appendChild(el('div','margin-bottom:10px;',null,bgr));

  body.appendChild(chk('Random background on load',config.theme.bgRotate,v=>{config.theme.bgRotate=v;saveConfig();}));

  /* ── Appearance ── */
  body.appendChild(ps('Appearance'));
  body.appendChild(pf('select','','Card Style',[{value:'dark',label:'Dark'},{value:'light',label:'Light'}],config.theme.cardBg||'dark',v=>{config.theme.cardBg=v;applyChanges();}));
  body.appendChild(pf('range','','Card Transparency',null,Math.round((1-(config.theme.cardOpacity||1))*100),v=>{config.theme.cardOpacity=1-(parseInt(v)/100);applyChanges();},{min:0,max:100}));
  body.appendChild(pf('color','','Accent Color',null,config.theme.glow,v=>{config.theme.glow=v;applyChanges();}));
  body.appendChild(pf('range','','Glass Blur (px)',null,config.theme.blur,v=>{config.theme.blur=parseInt(v);applyChanges();},{min:4,max:40}));
  body.appendChild(chk('Animated transitions',config.theme.animations!==false,v=>{config.theme.animations=v;applyChanges();renderAll();}));
  body.appendChild(chk('Card accent bar',config.theme.showAccentBar!==false,v=>{config.theme.showAccentBar=v;applyChanges();renderAll();}));

  /* ── Typography ── */
  body.appendChild(ps('Typography'));
  body.appendChild(pf('color','','Font Color',null,config.theme.fontColor||'#cccccc',v=>{config.theme.fontColor=v;applyChanges();document.body.style.setProperty('--text-primary',hexToRgba(v,0.92));}));
  body.appendChild(pf('range','','Body Text Size (px)',null,config.theme.fontSizeText,v=>{config.theme.fontSizeText=parseInt(v);applyChanges();},{min:10,max:28}));
  body.appendChild(pf('range','','Heading Size (px)',null,config.theme.fontSizeHeading,v=>{config.theme.fontSizeHeading=parseInt(v);applyChanges();},{min:10,max:28}));
  const curFont=config.theme.fontFamily||'Inter';
  const TOP_FONTS = [
    {name:'Inter',sample:'The quick brown fox jumps'},
    {name:'Space Grotesk',sample:'The quick brown fox jumps'},
    {name:'JetBrains Mono',sample:'console.log(42)'},
    {name:'Fraunces',sample:'The quick brown fox jumps'},
    {name:'Plus Jakarta Sans',sample:'The quick brown fox jumps'},
    {name:'DM Sans',sample:'The quick brown fox jumps'},
    {name:'Outfit',sample:'The quick brown fox jumps'},
    {name:'Sora',sample:'The quick brown fox jumps'},
    {name:'Manrope',sample:'The quick brown fox jumps'},
    {name:'Rubik',sample:'The quick brown fox jumps'},
    {name:'Nunito',sample:'The quick brown fox jumps'},
    {name:'Poppins',sample:'The quick brown fox jumps'},
    {name:'Raleway',sample:'The quick brown fox jumps'},
    {name:'Work Sans',sample:'The quick brown fox jumps'},
    {name:'Montserrat',sample:'The quick brown fox jumps'},
    {name:'Fira Sans',sample:'The quick brown fox jumps'},
    {name:'Barlow',sample:'The quick brown fox jumps'},
    {name:'Figtree',sample:'The quick brown fox jumps'},
    {name:'Archivo',sample:'The quick brown fox jumps'},
    {name:'Chivo',sample:'The quick brown fox jumps'},
    {name:'Epilogue',sample:'The quick brown fox jumps'},
    {name:'Josefin Sans',sample:'The quick brown fox jumps'},
    {name:'Karla',sample:'The quick brown fox jumps'},
    {name:'Lexend',sample:'The quick brown fox jumps'},
    {name:'Quicksand',sample:'The quick brown fox jumps'},
    {name:'Urbanist',sample:'The quick brown fox jumps'},
    {name:'Onest',sample:'The quick brown fox jumps'},
    {name:'Be Vietnam Pro',sample:'The quick brown fox jumps'},
    {name:'IBM Plex Sans',sample:'The quick brown fox jumps'},
    {name:'DM Mono',sample:'const x = 1;'},
  ];
  // Ensure current font is in the list
  if(!TOP_FONTS.find(f=>f.name===curFont)) TOP_FONTS.push({name:curFont,sample:'The quick brown fox jumps'});
  const fg=document.createElement('div');fg.style.cssText='margin-bottom:10px;';
  fg.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Font'));
  const fsel=document.createElement('select');
  fsel.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;cursor:pointer;';
  fsel.style.fontFamily=`'${curFont}',sans-serif`;
  // Preload all font options so dropdown renders them correctly
  TOP_FONTS.forEach(f=>loadGoogleFont(f.name));
  TOP_FONTS.forEach(f=>{
    const o=document.createElement('option');o.value=f.name;
    o.textContent=f.name;
    o.style.fontFamily=`'${f.name}',sans-serif`;
    o.style.fontSize='15px';
    if(f.name===curFont)o.selected=true;fsel.appendChild(o);
  });
  fsel.addEventListener('change',()=>{
    config.theme.fontFamily=fsel.value;
    fsel.style.fontFamily=`'${fsel.value}',sans-serif`;
    saveConfig();applyTheme();renderAll();
  });
  fg.appendChild(fsel);body.appendChild(fg);

  /* ── Status Bar ── */
  body.appendChild(ps('Status Bar'));
  body.appendChild(chk('Show',config.statusBar.enabled,v=>{config.statusBar.enabled=v;saveConfig();applyTheme();initStatusBar();renderAll();buildConfigPanel();}));
  body.appendChild(pf('select','','Source',[{value:'local',label:'Local (/api/stats)'},{value:'glances',label:'Glances API'},{value:'custom',label:'Custom URL'}],config.statusBar.source,v=>{config.statusBar.source=v;saveConfig();initStatusBar();buildConfigPanel();}));

  // Conditional: Glances URL
  const gl=el('div','','',pf('text','','Glances URL',null,config.statusBar.glancesUrl,v=>{config.statusBar.glancesUrl=v;saveConfig();initStatusBar();}));
  gl.className='cfg-conditional'+(config.statusBar.source==='glances'?'':' hidden');
  body.appendChild(gl);

  // Conditional: Custom URL
  const cu=el('div','','',pf('text','','Custom URL',null,config.statusBar.customUrl||'',v=>{config.statusBar.customUrl=v;saveConfig();initStatusBar();}));
  cu.className='cfg-conditional'+(config.statusBar.source==='custom'?'':' hidden');
  body.appendChild(cu);

  body.appendChild(pf('range','','Refresh (s)',null,config.statusBar.refreshInterval,v=>{config.statusBar.refreshInterval=parseInt(v);saveConfig();initStatusBar();},{min:5,max:120}));
  const itemsRow=document.createElement('div');itemsRow.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:4px 0;';
  ['hostname','cpu','memory','disk','uptime'].forEach(item=>{
    const cl=document.createElement('label');cl.style.cssText='display:flex;align-items:center;gap:4px;font-size:var(--text-sm);cursor:pointer;';
    const cc=document.createElement('input');cc.type='checkbox';cc.checked=(config.statusBar.items||[]).includes(item);
    cc.addEventListener('change',()=>{config.statusBar.items=config.statusBar.items||[];if(cc.checked&&!config.statusBar.items.includes(item))config.statusBar.items.push(item);else if(!cc.checked)config.statusBar.items=config.statusBar.items.filter(i=>i!==item);saveConfig();initStatusBar();});
    cl.appendChild(cc);cl.appendChild(document.createTextNode(item.charAt(0).toUpperCase()+item.slice(1)));itemsRow.appendChild(cl);
  });
  const itemsG=el('div','margin-bottom:10px;');itemsG.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:4px;','Show items:'));
  itemsG.appendChild(itemsRow);body.appendChild(itemsG);

  /* ── Layout ── */
  body.appendChild(ps('Layout'));
  body.appendChild(pf('range','','Columns',null,config.layout.cols,v=>{config.layout.cols=parseInt(v);applyChanges();renderAll();},{min:1,max:6}));
  body.appendChild(pf('range','','Card Gap (px)',null,config.layout.gap,v=>{config.layout.gap=parseInt(v);applyChanges();renderAll();},{min:4,max:40}));
  body.appendChild(pf('range','','Page Width Padding (%)',null,parseInt(config.layout.pageWidthPadding)||2,v=>{config.layout.pageWidthPadding=parseInt(v);applyChanges();renderAll();},{min:0,max:15}));
  body.appendChild(pf('range','','Page Height Padding (%)',null,config.layout.pagePadding||2,v=>{config.layout.pagePadding=parseInt(v);applyChanges();renderAll();},{min:0,max:15}));

  /* ── Data ── */
  body.appendChild(ps('Data'));
  const acts=el('div','display:flex;gap:8px;flex-wrap:wrap;');
  ['Export','Import','Reset'].forEach(label=>{
    const b=el('button','',label);b.className='btn btn-glass btn-sm'+(label==='Reset'?' btn-danger':'');
    b.addEventListener('click',()=>{
      if(label==='Export'){const d=new Date();const bb=new Blob([JSON.stringify(config,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(bb);a.download='wartab-config-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'.json';a.click();URL.revokeObjectURL(a.href);toast('Exported');}
      else if(label==='Import'){$('#import-file-input2').click();}
      else if(label==='Reset'){showConfirmModal('Reset all settings to defaults? This cannot be undone.',()=>{const snap=cloneObj(config);config=cloneObj(DEFAULT_CONFIG);saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toastWithUndo('Reset',()=>{config=snap;saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();});},'Reset');}
    });
    acts.appendChild(b);
  });
  body.appendChild(acts);
  const fi2=document.createElement('input');fi2.type='file';fi2.accept='.json';fi2.style.display='none';fi2.id='import-file-input2';
  fi2.addEventListener('change',e=>{if(e.target.files[0]){const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);showConfirmModal('Import config from '+e.target.files[0].name+'? This will replace your current configuration.',()=>{config=deepMerge(cloneObj(DEFAULT_CONFIG),d);saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toast('Imported');});}catch(e){toast('Failed: '+e.message,'error');}};r.readAsText(e.target.files[0]);}});

  /* ── Snapshots ── */
  body.appendChild(ps('Snapshots'));
  const snapHint=el('div','font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:6px;','Auto-saved on every config change. Last 20 kept.');
  body.appendChild(snapHint);
  const snapRow=el('div','display:flex;gap:8px;margin-bottom:8px;');
  const saveSnapBtn=el('button','','Save Snapshot Now');saveSnapBtn.className='btn btn-glass btn-sm';
  saveSnapBtn.addEventListener('click',async()=>{await storage.snapshots.create();renderSnapshots();});
  snapRow.appendChild(saveSnapBtn);
  const snapList=el('div','display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto;');
  snapRow.appendChild(snapList);
  body.appendChild(snapRow);
  function renderSnapshots(){
    snapList.innerHTML='<div style="font-size:var(--text-2xs);color:var(--text-tertiary);padding:4px 0;">Loading...</div>';
    storage.snapshots.list().then(snaps=>{
      snapList.innerHTML='';
      if(!snaps||!snaps.length){snapList.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);padding:4px 0;">No snapshots yet</div>';return;}
      snaps.forEach(s=>{
        const r=el('div','display:flex;gap:6px;align-items:center;padding:3px 0;');
        const ts=s.name.replace(/_/g,' ').substring(0,15);
        const lbl=el('span','flex:1;font-size:var(--text-xs);color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',ts);
        const sz=el('span','font-size:var(--text-2xs);color:var(--text-tertiary);flex-shrink:0;',fmtSize(s.size));
        const rst=el('button','','Restore');rst.className='btn btn-glass btn-sm';rst.style.cssText='padding:2px 8px;font-size:var(--text-2xs);';
        rst.addEventListener('click',()=>{showConfirmModal('Restore snapshot from '+ts+'? Current config will be replaced.',async()=>{await storage.snapshots.restore(s.name);await loadConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toast('Restored: '+ts);},'Restore')});
        r.appendChild(lbl);r.appendChild(sz);r.appendChild(rst);
        snapList.appendChild(r);
      });
    }).catch(()=>{snapList.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);padding:4px 0;">Server snapshots unavailable</div>';});
  }
  renderSnapshots();
  body.appendChild(snapList);
  
  /* ── API Keys ── */
  body.appendChild(ps('API Keys'));
  const apibox=el('div','font-size:var(--text-sm);line-height:1.7;padding:0 0 8px;');
  apibox.innerHTML='<div style="margin-bottom:10px;color:var(--text-secondary);">Some modules need a free API key. Get yours here:</div>'+
    '<div style="display:flex;flex-direction:column;gap:8px;">'+
    '<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:rgba(0,0,0,0.2);"><span style="font-size:16px;">🌤</span><div><div style="font-weight:600;font-size:var(--text-sm);">Weather (OpenWeatherMap)</div><div style="font-size:var(--text-2xs);color:var(--text-tertiary);">Free tier, 60 calls/min. Sign up at <a href="https://openweathermap.org/api" target="_blank" style="color:var(--accent);">openweathermap.org/api</a></div></div></div>'+
    '</div>';
  body.appendChild(apibox);
/* ── Credits ── */
body.appendChild(ps('Credits'));
const cbox=el('div','font-size:var(--text-xs);line-height:1.7;padding:0 0 8px;color:var(--text-secondary);');
cbox.innerHTML='<div style="display:flex;flex-direction:column;gap:6px;">'+
  '<div style="display:flex;gap:8px;align-items:center;"><span style="font-size:14px;">📦</span><span>Service icons by <a href="https://selfh.st/icons/" target="_blank" style="color:var(--accent);">selfh.st/icons</a></span></div>'+
  '<div style="display:flex;gap:8px;align-items:center;"><span style="font-size:14px;">🎯</span><span>UI icons by <a href="https://lucide.dev/" target="_blank" style="color:var(--accent);">Lucide</a> (ISC License)</span></div>'+
  '</div>';
body.appendChild(cbox);
body.appendChild(fi2);
// Wrap each config section in a card
wrapConfigCards(body);
}

/* Wrap config panel sections in card containers */
function wrapConfigCards(body) {
  var sections = [], cur = null;
  Array.from(body.children).forEach(function(el) {
    var h3 = el.querySelector('h3');
    if (h3 && !el.querySelector('input,select,button')) {
      if (cur) sections.push(cur);
      cur = { header: el, fields: [] };
    } else if (cur) {
      cur.fields.push(el);
    }
  });
  if (cur) sections.push(cur);
  sections.forEach(function(s) {
    var wrap = document.createElement('div');
    wrap.className = 'cs-panel cp-config-card';
    s.header.parentNode.insertBefore(wrap, s.header);
    wrap.appendChild(s.header);
    s.fields.forEach(function(f) { wrap.appendChild(f); });
  });
}

function bgValueRow(body){
  // Show text field for image URL
  const g=el('div','margin-bottom:10px;');g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Image URL'));
  const i=document.createElement('input');i.type='text';i.value=config.theme.bgValue;i.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
  i.placeholder='Paste image URL or upload above...';
  i.addEventListener('change',()=>{config.theme.bgValue=i.value;applyChanges();saveConfig();});
  g.appendChild(i);body.appendChild(g);
}

function el(tag,style,text,children){
  const e=document.createElement(tag);
  if(style)e.style.cssText=style;
  if(text!==undefined&&text!==null)e.textContent=text;
  if(children)e.appendChild(children);
  return e;
}

function chk(label,value,onChange){
  const w=el('div','display:flex;align-items:center;gap:6px;margin-bottom:8px;');
  const c=document.createElement('input');c.type='checkbox';c.checked=!!value;
  c.addEventListener('change',()=>onChange(c.checked));
  w.appendChild(c);w.appendChild(el('span','font-size:var(--text-base);',label));
  return w;
}


function ps(t){return el('div','','',el('h3','font-size:var(--text-sm);font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-secondary);margin-bottom:10px;margin-top:12px;padding-bottom:4px;border-bottom:1px solid var(--glass-border);font-family:var(--font);',t));}
function addNewCard(){
  // Card type picker modal — Lucide icons, glass style
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  overlay.setAttribute('tabindex','-1');
  const box = document.createElement('div');
  box.style.cssText = 'background:#151515;border:1px solid var(--glass-border);padding:24px;min-width:320px;';
  const label = document.createElement('div');
  label.textContent = 'New Card';
  label.style.cssText = 'font-size:var(--heading-size);font-weight:600;color:var(--text-primary);margin-bottom:16px;';
  box.appendChild(label);
  const types = [
    {type:'links', label:'Links', icon:'link'},
    {type:'search', label:'Search', icon:'search'},
    {type:'clock', label:'Clock', icon:'clock'},
    {type:'notes', label:'Notes', icon:'edit-3'},
    {type:'weather', label:'Weather', icon:'cloud-sun'},
    {type:'iframe', label:'Iframe', icon:'monitor'},
    {type:'image', label:'Image', icon:'image'},
    {type:'api-poller', label:'API Poller', icon:'activity'},
    {type:'quotes', label:'Quotes', icon:'message-circle'},
    {type:'timer', label:'Timer', icon:'timer'},
    {type:'resource-monitor', label:'Resources', icon:'bar-chart-3'},
    {type:'link-list', label:'Link List', icon:'list'},
    {type:'lan-scan', label:'LAN Scan', icon:'radio'},
    {type:'digital-pet', label:'Digital Pet', icon:'heart'},
    {type:'ascii-anim', label:'ASCII Animation', icon:'monitor'},
  ];
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;';
  types.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'cp-type-btn';
    btn.innerHTML = '<i data-lucide="'+t.icon+'" style="width:22px;height:22px;"></i><span style="font-size:var(--text-xs);color:var(--text-secondary);">'+t.label+'</span>';
    btn.addEventListener('click', () => {
      overlay.remove();
      const colMax=config.layout.cols;
      var sec = {id:'sec-'+uid(),type:t.type,label:t.label};
      if(t.type==='links'||t.type==='link-list') sec.links=[{label:'Example',url:'https://example.com',icon:'link'}];
      if(t.type==='api-poller') {sec.url='https://api.github.com/repos/nousresearch/wartab';sec.fields=[{label:'Stars',path:'stargazers_count'},{label:'Forks',path:'forks_count'},{label:'Issues',path:'open_issues_count'}];sec.refreshInterval=120;}
      config.cards.push({
        id:'card-'+uid(), title:'', icon:'package', color:'#888888',
        width:Math.min(1,colMax), height:1,
        sections:[sec],
      });
      saveConfig(); renderAll(); toast('Card added: '+t.label);
    });
    grid.appendChild(btn);
  });
  box.appendChild(grid);
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-glass btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'width:100%;justify-content:center;';
  cancelBtn.addEventListener('click', () => overlay.remove());
  box.appendChild(cancelBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.focus();
  // Render Lucide icons in the modal
  renderIcons();
}
function pf(type,key,label,options,value,onChange,attrs){const g=el('div','margin-bottom:10px;');
  if(type==='select'){g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const s=document.createElement('select');s.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;cursor:pointer;';(options||[]).forEach(o=>{const opt=document.createElement('option');opt.value=o.value;opt.textContent=o.label;if(o.value===value)opt.selected=true;s.appendChild(opt);});s.addEventListener('change',()=>onChange(s.value));g.appendChild(s);}
  else if(type==='range'){g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const r=el('div','display:flex;align-items:center;gap:8px;');const i=document.createElement('input');i.type='range';i.min=attrs.min||0;i.max=attrs.max||100;i.value=value;i.style.cssText='flex:1;accent-color:var(--accent);';const s=el('span','font-size:var(--text-sm);color:var(--text-secondary);min-width:30px;',String(value));i.addEventListener('input',()=>s.textContent=i.value);i.addEventListener('pointerup',()=>onChange(i.value));r.appendChild(i);r.appendChild(s);g.appendChild(r);}
  else if(type==='color'){g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const r=el('div','display:flex;gap:8px;align-items:center;');const i=document.createElement('input');i.type='color';i.value=value;i.style.cssText='width:40px;height:34px;padding:2px;cursor:pointer;flex-shrink:0;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);';const t=document.createElement('input');t.type='text';t.value=value;t.style.cssText='flex:1;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';const sync=v=>{i.value=v;t.value=v;onChange(v);};i.addEventListener('input',()=>sync(i.value));t.addEventListener('change',()=>sync(t.value));r.appendChild(i);r.appendChild(t);g.appendChild(r);}
  else{g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const i=document.createElement('input');i.type='text';i.value=value;i.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';i.addEventListener('change',()=>onChange(i.value));g.appendChild(i);}
  return g;
}
function applyChanges(){saveConfig();applyTheme();}

/* ═══════════════════════════════════════════ PAGES ═══════════════════════════════════════════ */

// Migrate a config without pages into the pages format
function pageInit() {
  if (!config.pages) {
    const id = 'page-' + uid();
    config.pages = {};
    config.pages[id] = { name: 'Page 1', icon: 'layout', cards: config.cards || [] };
    config.pageOrder = [id];
    config.currentPage = id;
    config.cards = config.pages[id].cards;
  } else {
    // Ensure currentPage is valid — fall back to first page if missing/empty
    if (!config.pages[config.currentPage] || !config.pageOrder.includes(config.currentPage)) {
      config.currentPage = config.pageOrder[0];
    }
    config.cards = config.pages[config.currentPage].cards;
  }
}

function renderPageNav() {
  const tabs = $('#page-tabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  (config.pageOrder || []).forEach(id => {
    const p = config.pages[id];
    if (!p) return;
    const tab = document.createElement('span');
    tab.className = 'page-tab' + (id === config.currentPage ? ' active' : '');

    // Page icon — part of the tab, no separate click handler
    const iconEl = document.createElement('span');
    iconEl.className = 'page-tab-icon';
    if (p.icon && isLucideName(p.icon)) {
      iconEl.appendChild(renderLucideEl(p.icon, ''));
    } else if (p.icon) {
      iconEl.textContent = p.icon;
    } else {
      iconEl.appendChild(renderLucideEl('layout', ''));
    }
    tab.appendChild(iconEl);

    // Page name — click to switch, double-click opens edit panel
    const nameSpan = document.createElement('span');
    nameSpan.textContent = p.name;
    let clickTimer = null;
    tab.addEventListener('click', () => {
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
      clickTimer = setTimeout(() => { clickTimer = null; switchPage(id); }, 250);
    });
    tab.addEventListener('dblclick', e => {
      e.stopPropagation();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      openPageEditPanel(id);
    });
    tab.appendChild(nameSpan);
    tabs.appendChild(tab);
  });
  // Render Lucide SVGs for page tab icons
  renderIcons();
}

/** Simple confirmation overlay */
function showConfirmModal(msg, onConfirm, okText) {
  okText = okText || 'Delete';
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#151515;border:1px solid var(--glass-border);padding:24px;min-width:280px;text-align:center;';
  const label = document.createElement('div');
  label.textContent = msg;
  label.style.cssText = 'font-size:var(--text-base);color:var(--text-primary);margin-bottom:16px;';
  box.appendChild(label);
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;';
  const okBtn = document.createElement('button');
  okBtn.className = 'btn btn-glass btn-sm';
  okBtn.textContent = okText;
  okBtn.style.cssText = okText === 'Delete' ? 'border-color:#cc4444;color:#cc4444;' : '';
  okBtn.addEventListener('click', () => { overlay.remove(); onConfirm(); });
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-glass btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(okBtn);
  btnRow.appendChild(cancelBtn);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

/* ══════════ Keyboard Shortcuts Overlay ══════════ */
function showShortcutsOverlay() {
  var existing = document.querySelector('#shortcuts-overlay');
  if (existing) { existing.remove(); return; }
  var overlay = document.createElement('div');
  overlay.id = 'shortcuts-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#151515;border:1px solid var(--glass-border);padding:24px 32px;min-width:300px;max-width:420px;';
  box.innerHTML = '<div style="font-size:var(--heading-size);font-weight:700;color:var(--text-primary);margin-bottom:16px;">Keyboard Shortcuts</div>' +
    '<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:12px;">Press a key while this window is open:</div>' +
    '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:var(--text-sm);line-height:1.8;">' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">N</kbd><span>Add new card</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">S</kbd><span>Focus search bar</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">P</kbd><span>New page</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">C</kbd><span>Toggle config panel</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">?</kbd><span>Close this window</span>' +
    '</div>' +
    '<div style="text-align:center;margin-top:16px;font-size:var(--text-2xs);color:var(--text-tertiary);">Esc to close · Ctrl+K to search anytime</div>';
  overlay.appendChild(box);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  // Focus the overlay so keydown events fire
  overlay.setAttribute('tabindex', '-1');
  overlay.focus();
  // Listen for single-key commands on the overlay itself
  function onShortcutKey(e) {
    var key = e.key.toLowerCase();
    if (key === 'n') { e.preventDefault(); overlay.remove(); addNewCard(); }
    else if (key === 's') { e.preventDefault(); overlay.remove(); var fs=$('#card-grid .inline-search-wrap input'); if(fs)fs.focus(); }
    else if (key === 'p') { e.preventDefault(); overlay.remove(); addPage(); }
    else if (key === 'c') { e.preventDefault(); overlay.remove(); toggleConfigPanel(); }
    else if (e.key === '?') { e.preventDefault(); overlay.remove(); }
    else if (e.key === 'Escape') { overlay.remove(); }
  }
  overlay.addEventListener('keydown', onShortcutKey);
  // Also capture keys globally while overlay is visible (in case focus shifts)
  document.addEventListener('keydown', onShortcutKey);
  // Clean up global listener when overlay closes
  var origRemove = overlay.remove.bind(overlay);
  overlay.remove = function() {
    document.removeEventListener('keydown', onShortcutKey);
    origRemove();
  };
}

function switchPage(pageId) {
  if (!config.pages[pageId]) return;
  config.currentPage = pageId;
  config.cards = config.pages[pageId].cards;
  saveConfig();
  const grid = $('#card-grid');
  if (grid) grid.classList.add('page-switching');
  setTimeout(function() {
    renderAll();
    renderPageNav();
    if (grid) grid.classList.remove('page-switching');
  }, 200);
}

function addPage() {
  const id = 'page-' + uid();
  config.pages[id] = { name: 'Page ' + (Object.keys(config.pages).length + 1), icon: 'layout', cards: [] };
  config.pageOrder.push(id);
  switchPage(id);
}

function deletePage(pageId) {
  if (config.pageOrder.length <= 1) return;
  const idx = config.pageOrder.indexOf(pageId);
  if (idx < 0) return;
  config.pageOrder.splice(idx, 1);
  delete config.pages[pageId];
  // Switch to nearest remaining page
  const next = config.pageOrder[Math.min(idx, config.pageOrder.length - 1)];
  config.currentPage = next;
  config.cards = config.pages[next].cards;
  saveConfig();
  renderAll();
  renderPageNav();
}

/* ═══════════════════════════════════════════ INIT ═══════════════════════════════════════════ */
async function init() {
  try {
  await loadConfig(); applyTheme();
  pageInit();  // migrate/init pages
  if(!config.cards||!config.cards.length){console.warn('Config had no cards — restored defaults');config=cloneObj(DEFAULT_CONFIG);pageInit();saveConfig();}
  await fetchUploads();
  // Random background on load if rotation enabled
  if(config.theme.bgRotate&&uploadedFiles.length>0){
    const pick=uploadedFiles[Math.floor(Math.random()*uploadedFiles.length)];
    if(pick){config.theme.bgType='image';config.theme.bgValue=pick.url;saveConfig();applyTheme();}
  }
  renderAll(); renderPageNav(); initStatusBar();
  // Footer — git version from config, or "dev" if not available
  WARTAB_VERSION = config._version || 'dev';
  $('#footer-text').textContent='WarTab '+WARTAB_VERSION+'  [?] shortcuts';
  loadIconRepo();
  $('#btn-config').addEventListener('click',toggleConfigPanel);
  $('#btn-add-card').addEventListener('click',()=>{addNewCard();});
  $('#brand-text').addEventListener('click',()=>{location.reload();});
  $('#btn-add-page').addEventListener('click',()=>{addPage();});
  $('#config-close').addEventListener('click',toggleConfigPanel);
  $('#config-overlay').addEventListener('click',toggleConfigPanel);
  $$('.ip-tab').forEach(t=>t.addEventListener('click',()=>buildIconPicker(t.dataset.tab)));
  $('#icon-picker-close').addEventListener('click',closeIconPicker);
  $('#icon-picker-overlay').addEventListener('click',closeIconPicker);
  $('#edit-panel-close').addEventListener('click',closeCardEditPanel);
  $('#edit-panel-overlay').addEventListener('click',closeCardEditPanel);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&configPanelOpen)toggleConfigPanel();
    if(e.key==='Escape'&&iconPickerOpen)closeIconPicker();
    if(e.key==='Escape'&&_editPanelOpen)closeCardEditPanel();
    if(e.key==='Escape'&&document.querySelector('#shortcuts-overlay'))document.querySelector('#shortcuts-overlay').remove();
    if(e.key==='C'&&e.ctrlKey&&e.shiftKey){e.preventDefault();toggleConfigPanel();}
    if((e.key==='l'||e.key==='k')&&(e.ctrlKey||e.metaKey)){e.preventDefault();const fs=$('#card-grid .inline-search-wrap input');if(fs)fs.focus();}
    // ? opens shortcuts overlay
    if(e.key==='?'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();showShortcutsOverlay();}
    // Also catch Shift+/ which browsers may report as '/' with shiftKey
    if(e.key==='/'&&e.shiftKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();showShortcutsOverlay();}
    if(e.key==='Tab'&&(e.ctrlKey||e.metaKey)){e.preventDefault();const order=config.pageOrder||[];if(!order.length)return;const idx=order.indexOf(config.currentPage);const next=order[(idx+1)%order.length];switchPage(next);}
  });
  let rt=null;window.addEventListener('resize',()=>{if(rt)clearTimeout(rt);rt=setTimeout(()=>{},150);});
  // Periodic timestamp updater
  setInterval(()=>{
    $$('.api-ts').forEach(el=>{const t=parseInt(el.dataset.ts);if(t)el.textContent='updated '+timeAgo(t);});
    $$('.weather-ts').forEach(el=>{const t=parseInt(el.dataset.ts);if(t)el.textContent='updated '+timeAgo(t);});
  },15000);
  console.log('WarTab initialized');
  // Render any Lucide icons that were added dynamically
  renderIcons();
  } catch(e) {
    console.error('init error:', e);
  } finally {
    $('#page-loader').classList.add('hidden');
  }
}
// Safety net: hide spinner after 10s even if init function fails silently
setTimeout(function(){var pl=document.getElementById('page-loader');if(pl)pl.classList.add('hidden');},10000);
document.addEventListener('DOMContentLoaded', init);

